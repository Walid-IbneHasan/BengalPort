import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { get } from "svelte/store";
import { createConfirms } from "./confirm.js";

describe("asking before something that cannot be undone", () => {
  test("the question waits for an answer and gives it back", async () => {
    const confirms = createConfirms();
    const answer = confirms.ask({ title: "Delete this note?", message: "It cannot be undone." });
    assert.equal(get(confirms)?.title, "Delete this note?");
    confirms.answer(true);
    assert.equal(await answer, true);
    assert.equal(get(confirms), null);
  });

  test("closing the box counts as no", async () => {
    const confirms = createConfirms();
    const answer = confirms.ask({ title: "Delete?" });
    confirms.answer(false);
    assert.equal(await answer, false);
  });

  test("a second question waits until the first is answered", async () => {
    const confirms = createConfirms();
    const first = confirms.ask({ title: "First?" });
    const second = confirms.ask({ title: "Second?" });
    assert.equal(get(confirms)?.title, "First?");
    confirms.answer(false);
    assert.equal(await first, false);
    assert.equal(get(confirms)?.title, "Second?");
    confirms.answer(true);
    assert.equal(await second, true);
  });

  test("the button says Delete and is marked dangerous unless told otherwise", () => {
    const confirms = createConfirms();
    confirms.ask({ title: "Delete?" });
    assert.equal(get(confirms)?.confirmLabel, "Delete");
    assert.equal(get(confirms)?.tone, "danger");
    confirms.answer(false);
    confirms.ask({ title: "Record refund?", confirmLabel: "Record refund", tone: "default" });
    assert.equal(get(confirms)?.confirmLabel, "Record refund");
    assert.equal(get(confirms)?.tone, "default");
  });
});
