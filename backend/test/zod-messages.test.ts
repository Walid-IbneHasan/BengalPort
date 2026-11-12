// What a person is told when a form is sent back.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import "../src/lib/zod-messages.js";

const first = (schema: z.ZodTypeAny, value: unknown) => {
  const result = schema.safeParse(value);
  assert.equal(result.success, false);
  return result.error!.issues[0].message;
};

describe("plain messages", () => {
  test("a missing field is required", () => {
    assert.equal(first(z.object({ name: z.string() }), {}), "This is required");
    assert.equal(first(z.string().min(1), ""), "This is required");
  });
  test("a short or long text says how long it may be", () => {
    assert.equal(first(z.string().min(2), "a"), "Use at least 2 characters");
    assert.equal(first(z.string().max(5), "abcdefgh"), "Use at most 5 characters");
  });
  test("numbers, dates, emails and choices", () => {
    assert.equal(first(z.number().positive(), 0), "Enter more than 0");
    assert.equal(first(z.coerce.date(), "soon"), "Enter a valid date");
    assert.equal(first(z.string().email(), "rahim@"), "Enter a valid email address");
    assert.equal(first(z.enum(["A", "B"]), "C"), "Choose one of the listed options");
  });
  test("a check with its own message keeps it", () => {
    assert.equal(first(z.string().regex(/^x/, "Start with x"), "y"), "Start with x");
  });
});
