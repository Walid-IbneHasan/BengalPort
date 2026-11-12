import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { fitWithin, worthShrinking } from "./image-resize.js";

describe("shrinking a photo before it is uploaded", () => {
  test("a large photo keeps its shape and fits the longest side", () => {
    assert.deepEqual(fitWithin(6000, 4000, 2400), { width: 2400, height: 1600 });
    assert.deepEqual(fitWithin(3000, 4500, 2400), { width: 1600, height: 2400 });
  });

  test("a photo already small enough keeps its size", () => {
    assert.deepEqual(fitWithin(1200, 800, 2400), { width: 1200, height: 800 });
  });

  test("only big JPEG, PNG and WebP photos are shrunk in the browser", () => {
    assert.equal(worthShrinking({ type: "image/jpeg", size: 6_000_000 }), true);
    assert.equal(worthShrinking({ type: "image/png", size: 3_000_000 }), true);
    assert.equal(worthShrinking({ type: "image/jpeg", size: 300_000 }), false);
    assert.equal(worthShrinking({ type: "image/gif", size: 9_000_000 }), false);
    assert.equal(worthShrinking({ type: "image/svg+xml", size: 9_000_000 }), false);
    assert.equal(worthShrinking({ type: "application/pdf", size: 9_000_000 }), false);
  });
});
