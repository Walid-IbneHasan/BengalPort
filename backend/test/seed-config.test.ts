import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { seedPlan } from "../prisma/seed-config.js";

describe("seeding a local database", () => {
  test("uses the documented local admin and includes demo records", () => {
    assert.deepEqual(seedPlan({}), {
      adminEmail: "admin@bengalport.com",
      adminPassword: "Admin123!",
      demoData: true,
    });
  });
});

describe("seeding a production database", () => {
  const production = { NODE_ENV: "production" };

  test("refuses to run without an admin password", () => {
    assert.throws(() => seedPlan(production), /SEED_ADMIN_PASSWORD/);
  });

  test("refuses the publicly documented local password", () => {
    assert.throws(
      () => seedPlan({ ...production, SEED_ADMIN_PASSWORD: "Admin123!" }),
      /SEED_ADMIN_PASSWORD/,
    );
  });

  test("refuses a password shorter than 12 characters", () => {
    assert.throws(
      () => seedPlan({ ...production, SEED_ADMIN_PASSWORD: "Short1!" }),
      /12 characters/,
    );
  });

  test("uses the supplied admin credentials and leaves demo records out", () => {
    assert.deepEqual(
      seedPlan({
        ...production,
        SEED_ADMIN_EMAIL: "Owner@Example.com",
        SEED_ADMIN_PASSWORD: "a-long-unique-passphrase",
      }),
      {
        adminEmail: "owner@example.com",
        adminPassword: "a-long-unique-passphrase",
        demoData: false,
      },
    );
  });

  test("includes demo records only when asked to", () => {
    const plan = seedPlan({
      ...production,
      SEED_ADMIN_PASSWORD: "a-long-unique-passphrase",
      SEED_DEMO_DATA: "true",
    });
    assert.equal(plan.demoData, true);
  });
});
