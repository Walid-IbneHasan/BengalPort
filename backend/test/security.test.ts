// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

process.env.LOG_LEVEL = "silent";
// Blank rather than delete: Prisma re-reads .env when it loads and would
// restore any variable that is missing.
for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "AUTH_DEV_CODES"])
  process.env[key] = "";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { createUser, deleteUsers, sessionToken } = await import("./helpers.js");

const stamp = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ownerEmail = `${stamp}-owner@example.test`;
const registerEmail = `${stamp}-new@example.test`;
const receiptNumber = `TEST-${stamp}`;
let ownerId = "";
let paymentId = "";
let admin: Awaited<ReturnType<typeof createUser>>;
let stranger: Awaited<ReturnType<typeof createUser>>;

before(async () => {
  const owner = await prisma.user.create({
    data: {
      name: "Receipt Owner",
      email: ownerEmail,
      passwordHash: await bcrypt.hash("Secret123", 4),
      emailVerifiedAt: new Date(),
    },
  });
  ownerId = owner.id;
  admin = await createUser("ADMIN");
  stranger = await createUser("USER");
  const payment = await prisma.payment.create({
    data: {
      userId: owner.id,
      service: "Test service",
      amount: 100,
      totalDue: 100,
      method: "Cash",
      transactionId: `TEST-${stamp}`,
      status: "PAID",
      receipt: {
        create: { receiptNumber, previousDue: 100, remainingDue: 0 },
      },
    },
  });
  paymentId = payment.id;
});

after(async () => {
  await prisma.receipt.deleteMany({ where: { paymentId } });
  await prisma.payment.deleteMany({ where: { id: paymentId } });
  await prisma.user.deleteMany({
    where: { email: { in: [ownerEmail, registerEmail] } },
  });
  await deleteUsers(admin.id, stranger.id);
  await prisma.$disconnect();
});

describe("payment receipts", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const bearer = (sub: string, role: "USER" | "ADMIN") => ({
    authorization: `Bearer ${app.jwt.sign({ sub, role })}`,
  });
  const open = (headers?: Record<string, string>) =>
    app.inject({
      method: "GET",
      url: `/api/payments/receipt/${receiptNumber}`,
      headers,
    });
  before(async () => {
    app = await buildApp();
  });
  after(() => app.close());

  test("a receipt cannot be opened without signing in", async () => {
    assert.equal((await open()).statusCode, 401);
  });

  test("a receipt is hidden from a user who does not own it", async () => {
    const res = await open(bearer(stranger.id, "USER"));
    assert.equal(res.statusCode, 404);
  });

  test("the customer can open their own receipt", async () => {
    const res = await open(bearer(ownerId, "USER"));
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.receiptNumber, receiptNumber);
  });

  test("an admin can open any receipt", async () => {
    const res = await open(bearer(admin.id, "ADMIN"));
    assert.equal(res.statusCode, 200);
  });

  test("a receipt exposes only the customer's name", async () => {
    const res = await open(bearer(admin.id, "ADMIN"));
    assert.deepEqual(res.json().data.payment.user, { name: "Receipt Owner" });
  });
});

describe("recording payments", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  before(async () => {
    app = await buildApp();
  });
  after(() => app.close());

  test("a payment cannot be recorded without signing in", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/payments",
      payload: {},
    });
    assert.equal(res.statusCode, 401);
  });

  test("a payment cannot be recorded by a non-admin user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/payments",
      headers: {
        authorization: `Bearer ${app.jwt.sign({ sub: ownerId, role: "USER" })}`,
      },
      payload: {},
    });
    assert.equal(res.statusCode, 403);
  });
});

describe("startup configuration", () => {
  test("the API refuses to start without a JWT secret", async () => {
    const secret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      await assert.rejects(buildApp(), /JWT_SECRET/);
    } finally {
      process.env.JWT_SECRET = secret;
    }
  });
});

describe("public form abuse limits", () => {
  for (const form of ["enquiries", "applications"]) {
    test(`${form} are rate limited per client`, async () => {
      const app = await buildApp();
      try {
        const post = () =>
          app.inject({ method: "POST", url: `/api/${form}`, payload: {} });
        for (let i = 0; i < 10; i++)
          assert.equal((await post()).statusCode, 400);
        assert.equal((await post()).statusCode, 429);
      } finally {
        await app.close();
      }
    });
  }

  test("an oversized request body is rejected", async () => {
    const app = await buildApp();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/enquiries",
        payload: { message: "x".repeat(2 * 1024 * 1024) },
      });
      assert.equal(res.statusCode, 413);
    } finally {
      await app.close();
    }
  });

  test("admin uploads are not capped by the JSON body limit", async () => {
    const app = await buildApp();
    try {
      const boundary = "----test-boundary";
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/media",
        headers: {
          authorization: `Bearer ${sessionToken(app, admin)}`,
          "content-type": `multipart/form-data; boundary=${boundary}`,
        },
        payload: `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="notes.txt"\r\nContent-Type: text/plain\r\n\r\n${"x".repeat(2 * 1024 * 1024)}\r\n--${boundary}--\r\n`,
      });
      // Reaches the handler, which rejects the file for not being an image.
      assert.equal(res.statusCode, 400);
    } finally {
      await app.close();
    }
  });
});

describe("cross-origin requests from the website", () => {
  test("the browser is allowed to cache the preflight check", async () => {
    const app = await buildApp();
    try {
      const res = await app.inject({
        method: "OPTIONS",
        url: "/api/enquiries",
        headers: {
          origin: (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0],
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type",
        },
      });
      assert.equal(res.headers["access-control-max-age"], "86400");
    } finally {
      await app.close();
    }
  });
});

describe("response size", () => {
  test("page content is compressed for browsers that accept it", async () => {
    const app = await buildApp();
    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/content/home",
        headers: { "accept-encoding": "gzip, br" },
      });
      assert.equal(res.statusCode, 200);
      assert.match(String(res.headers["content-encoding"]), /^(br|gzip)$/);
    } finally {
      await app.close();
    }
  });
});

describe("stored images", () => {
  test("an uploaded image is served intact, without recompression", async () => {
    const bytes = Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 31) % 251));
    const asset = await prisma.mediaAsset.create({
      data: { originalName: "test.webp", data: bytes, width: 64, height: 64, byteSize: bytes.length, orientation: "square" },
    });
    const app = await buildApp();
    try {
      const res = await app.inject({
        method: "GET",
        url: `/api/media/${asset.id}.webp`,
        headers: { "accept-encoding": "gzip, br" },
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers["content-type"], "image/webp");
      assert.equal(res.headers["content-encoding"], undefined);
      assert.deepEqual(res.rawPayload, bytes);
    } finally {
      await app.close();
      await prisma.mediaAsset.delete({ where: { id: asset.id } });
    }
  });
});

describe("verification codes when email delivery is not configured", () => {
  const withEnv = async (
    env: Record<string, string>,
    run: (app: Awaited<ReturnType<typeof buildApp>>) => Promise<void>,
  ) => {
    const previous = Object.fromEntries(
      Object.keys(env).map((key) => [key, process.env[key]]),
    );
    Object.assign(process.env, env);
    const app = await buildApp();
    try {
      await run(app);
    } finally {
      await app.close();
      for (const [key, value] of Object.entries(previous))
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
  };
  const forgot = (app: Awaited<ReturnType<typeof buildApp>>) =>
    app.inject({
      method: "POST",
      url: "/api/auth/forgot-password",
      payload: { email: ownerEmail },
    });

  test("a password reset is refused instead of returning the code", async () => {
    await withEnv({}, async (app) => {
      const res = await forgot(app);
      assert.equal(res.statusCode, 503);
      assert.doesNotMatch(res.body, /developmentCode/);
    });
  });

  test("registration is refused instead of creating an unverifiable account", async () => {
    await withEnv({}, async (app) => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          name: "New Member",
          email: registerEmail,
          password: "Secret123",
        },
      });
      assert.equal(res.statusCode, 503);
      assert.equal(
        await prisma.user.count({ where: { email: registerEmail } }),
        0,
      );
    });
  });

  test("the code is returned when dev codes are switched on locally", async () => {
    await withEnv({ AUTH_DEV_CODES: "true" }, async (app) => {
      const res = await forgot(app);
      assert.equal(res.statusCode, 200);
      assert.match(res.json().data.developmentCode, /^\d{6}$/);
    });
  });

  test("dev codes stay off in production even when switched on", async () => {
    await withEnv(
      { AUTH_DEV_CODES: "true", NODE_ENV: "production" },
      async (app) => {
        const res = await forgot(app);
        assert.equal(res.statusCode, 503);
        assert.doesNotMatch(res.body, /developmentCode/);
      },
    );
  });
});
