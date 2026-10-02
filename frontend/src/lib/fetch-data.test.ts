import { afterEach, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import { fetchData } from "./fetch-data";

const respond = (status: number, body: unknown) => async () =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("loading page data from the API", () => {
  let warn: ReturnType<typeof mock.method>;
  beforeEach(() => {
    warn = mock.method(console, "warn", () => {});
  });
  afterEach(() => mock.restoreAll());

  test("the data inside the API envelope is returned", async () => {
    const data = await fetchData<{ title: string }[]>(respond(200, { data: [{ title: "Open day" }] }), "http://api.test/opportunities");
    assert.deepEqual(data, [{ title: "Open day" }]);
  });

  test("the requested address is the one fetched", async () => {
    let requested = "";
    await fetchData(async (input) => {
      requested = String(input);
      return new Response('{"data":1}');
    }, "http://api.test/content/home");
    assert.equal(requested, "http://api.test/content/home");
  });

  test("an API error gives nothing, so the page can fall back", async () => {
    assert.equal(await fetchData(respond(500, { error: { message: "boom" } }), "http://api.test/x"), null);
  });

  test("an unreachable API gives nothing instead of failing the page", async () => {
    const down = async () => {
      throw new TypeError("fetch failed");
    };
    assert.equal(await fetchData(down, "http://api.test/x"), null);
  });

  test("a failure is noted in the log with the address that failed", async () => {
    await fetchData(respond(500, {}), "http://api.test/content/home");
    assert.equal(warn.mock.callCount(), 1);
    assert.ok(String(warn.mock.calls[0].arguments[0]).includes("http://api.test/content/home"));
  });

  test("a successful load logs nothing", async () => {
    await fetchData(respond(200, { data: 1 }), "http://api.test/x");
    assert.equal(warn.mock.callCount(), 0);
  });

  test("a response that is not JSON gives nothing", async () => {
    assert.equal(await fetchData(async () => new Response("<html>Bad gateway</html>"), "http://api.test/x"), null);
  });

  test("a slow API is abandoned after the time limit", async () => {
    const slow: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    const started = Date.now();
    assert.equal(await fetchData(slow, "http://api.test/x", 30), null);
    assert.ok(Date.now() - started < 1000);
  });
});
