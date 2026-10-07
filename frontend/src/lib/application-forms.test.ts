import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { applicationForms } from "./application-forms.js";

// The shape of the four application forms, as the form component relies on
// it: short sections a person can take in at once, an honest time estimate,
// and a word about why the sensitive details are asked for.
describe("the application forms", () => {
  test("every step is split into sections of at most six fields, starting with one", () => {
    for (const [division, form] of Object.entries(applicationForms)) {
      for (const step of form.steps) {
        assert.ok(step.fields[0]?.section, `${division} · ${step.title}: the first field opens a section`);
        let inSection = 0;
        for (const field of step.fields) {
          if (field.section) inSection = 0;
          inSection += 1;
          assert.ok(inSection <= 6, `${division} · ${step.title}: more than six fields before “${field.key}”`);
        }
      }
    }
  });

  test("every form says about how long it takes", () => {
    for (const [division, form] of Object.entries(applicationForms)) {
      assert.ok(form.minutes >= 5 && form.minutes <= 30, `${division}: ${form.minutes} minutes`);
    }
  });

  test("a step that asks for passport or family details says why", () => {
    for (const [division, form] of Object.entries(applicationForms)) {
      for (const step of form.steps) {
        const sensitive = step.fields.some((field) => /^passport|^father|^mother|^sponsor|^financialSponsor/.test(field.key));
        if (!sensitive) continue;
        assert.match(step.note ?? "", /Why we ask/, `${division} · ${step.title}`);
        assert.match(step.note ?? "", /Privacy Policy/, `${division} · ${step.title}`);
      }
    }
  });
});
