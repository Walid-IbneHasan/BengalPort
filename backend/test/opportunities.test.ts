// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");

const stamp = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const liveSlug = `${stamp}-live`;
const draftSlug = `${stamp}-draft`;
let app: Awaited<ReturnType<typeof buildApp>>;

before(async () => {
  app = await buildApp();
  const base = {
    category: "EVENT" as const,
    description: "An opportunity used by the automated tests.",
    country: "Bangladesh",
    location: "Dhaka",
    image: "/images/global-business.webp",
  };
  await prisma.opportunity.createMany({
    data: [
      { ...base, slug: liveSlug, title: "Live test opportunity", published: true },
      { ...base, slug: draftSlug, title: "Draft test opportunity", published: false },
    ],
  });
});

after(async () => {
  await prisma.opportunity.deleteMany({
    where: { slug: { in: [liveSlug, draftSlug] } },
  });
  await app.close();
  await prisma.$disconnect();
});

const open = (slug: string) =>
  app.inject({ method: "GET", url: `/api/opportunities/${slug}` });

describe("opening an opportunity by its link", () => {
  test("a published opportunity is shown", async () => {
    const res = await open(liveSlug);
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.title, "Live test opportunity");
  });

  test("a draft cannot be read by guessing its link", async () => {
    assert.equal((await open(draftSlug)).statusCode, 404);
  });

  test("a link that matches nothing is reported as not found", async () => {
    assert.equal((await open(`${stamp}-missing`)).statusCode, 404);
  });
});

describe("the public list of opportunities", () => {
  test("drafts are left out", async () => {
    const res = await app.inject({ method: "GET", url: "/api/opportunities" });
    const slugs = res.json().data.map((item: { slug: string }) => item.slug);
    assert.ok(slugs.includes(liveSlug));
    assert.ok(!slugs.includes(draftSlug));
  });
});
