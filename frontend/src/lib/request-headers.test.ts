import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { requestHeaders } from "./request-headers";

describe("headers sent to the API", () => {
  // A plain GET with no custom headers needs no CORS preflight round trip.
  test("a signed-out request without a body sends no extra headers", () => {
    assert.deepEqual(requestHeaders(undefined, null), {});
  });

  test("a request with a body is labelled as JSON", () => {
    assert.deepEqual(
      requestHeaders({ method: "POST", body: "{}" }, null),
      { "content-type": "application/json" },
    );
  });

  test("a signed-in visitor's token is attached", () => {
    assert.deepEqual(requestHeaders(undefined, "abc"), {
      authorization: "Bearer abc",
    });
  });

  test("headers given by the caller take precedence", () => {
    assert.deepEqual(
      requestHeaders({ headers: { authorization: "Bearer mine" } }, "abc"),
      { authorization: "Bearer mine" },
    );
  });
});
