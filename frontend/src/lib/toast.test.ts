import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createToasts, type Toast } from "./toast.js";

// Timers the test controls: nothing runs until `advance` is called.
function fakeTimers() {
  let now = 0;
  let next = 1;
  const pending = new Map<number, { at: number; run: () => void }>();
  return {
    setTimeout: (run: () => void, ms: number) => { pending.set(next, { at: now + ms, run }); return next++; },
    clearTimeout: (id: number) => { pending.delete(id); },
    advance(ms: number) {
      now += ms;
      for (const [id, timer] of [...pending]) if (timer.at <= now) { pending.delete(id); timer.run(); }
    },
  };
}
function setup(options: { duration?: number; limit?: number } = {}) {
  const timers = fakeTimers();
  const toasts = createToasts({ ...options, setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout });
  let shown: Toast[] = [];
  toasts.subscribe((list) => (shown = list));
  return { timers, toasts, messages: () => shown.map((toast) => toast.message), shown: () => shown };
}

describe("notifications that pop up on the page", () => {
  test("a notification appears with its message and detail", () => {
    const { toasts, shown } = setup();
    toasts.show("Application submitted", { detail: "Reference BP-7KQ2M9XA" });
    assert.equal(shown().length, 1);
    assert.deepEqual({ message: shown()[0].message, detail: shown()[0].detail, kind: shown()[0].kind }, { message: "Application submitted", detail: "Reference BP-7KQ2M9XA", kind: "success" });
  });

  test("it goes away by itself after a while", () => {
    const { toasts, timers, messages } = setup({ duration: 6000 });
    toasts.show("Enquiry sent");
    timers.advance(5999);
    assert.deepEqual(messages(), ["Enquiry sent"]);
    timers.advance(1);
    assert.deepEqual(messages(), []);
  });

  test("it can be closed sooner", () => {
    const { toasts, messages } = setup();
    const id = toasts.show("Enquiry sent");
    toasts.dismiss(id);
    assert.deepEqual(messages(), []);
  });

  test("closing one leaves the others, and its timer does nothing later", () => {
    const { toasts, timers, messages } = setup({ duration: 6000 });
    const first = toasts.show("First");
    timers.advance(3000);
    toasts.show("Second");
    toasts.dismiss(first);
    timers.advance(3000);
    assert.deepEqual(messages(), ["Second"]);
  });

  test("a problem stays longer than good news", () => {
    const { toasts, timers, messages } = setup({ duration: 6000 });
    toasts.show("Could not submit", { kind: "error" });
    timers.advance(6000);
    assert.deepEqual(messages(), ["Could not submit"]);
    timers.advance(6000);
    assert.deepEqual(messages(), []);
  });

  test("the newest is listed first and only a few are kept", () => {
    const { toasts, messages } = setup({ limit: 3 });
    for (const message of ["One", "Two", "Three", "Four"]) toasts.show(message);
    assert.deepEqual(messages(), ["Four", "Three", "Two"]);
  });

  test("each notification gets its own number", () => {
    const { toasts } = setup();
    assert.notEqual(toasts.show("One"), toasts.show("Two"));
  });
});
