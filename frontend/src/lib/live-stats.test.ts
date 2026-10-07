import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { liveStats } from "./live-stats.js";

// The figures on a division page's trust panel. A figure about something the
// page lists (partners, hospitals, institutions, programs, countries) shows
// the live count so the panel never contradicts the directory beneath it.
describe("figures beside a live directory", () => {
  const stat = (value: string, label: string) => ({ value, label, icon: "users" });

  test("a figure about partners shows the live partner count", () => {
    const [shown] = liveStats([stat("500+", "Global partners")], { partners: 5 });
    assert.equal(shown.value, "5");
    assert.equal(shown.label, "Global partners");
  });

  test("partner institutions count institutions, not partners", () => {
    const [shown] = liveStats([stat("50+", "Partner institutions")], { partners: 9, institutions: 2 });
    assert.equal(shown.value, "2");
  });

  test("partner hospitals count hospitals", () => {
    const [shown] = liveStats([stat("30+", "Partner hospitals")], { partners: 9, hospitals: 2 });
    assert.equal(shown.value, "2");
  });

  test("destinations and countries count countries", () => {
    const shown = liveStats([stat("12+", "Study destinations"), stat("10+", "Countries")], { countries: 2 });
    assert.deepEqual(shown.map((item) => item.value), ["2", "2"]);
  });

  test("programs and treatment categories have their own counts", () => {
    const shown = liveStats([stat("120+", "Programs"), stat("20+", "Treatment categories")], { programs: 3, treatments: 6 });
    assert.deepEqual(shown.map((item) => item.value), ["3", "6"]);
  });

  test("a figure with no live counterpart is kept as written", () => {
    const [shown] = liveStats([stat("95%", "Guided applications")], { institutions: 2 });
    assert.equal(shown.value, "95%");
  });

  test("a figure whose live count is zero is left out", () => {
    const shown = liveStats([stat("500+", "Global partners"), stat("100+", "Business tours")], { partners: 0 });
    assert.deepEqual(shown.map((item) => item.label), ["Business tours"]);
  });

  test("a figure whose count was not supplied is kept as written", () => {
    const [shown] = liveStats([stat("5+", "Trusted hotel partners")], {});
    assert.equal(shown.value, "5+");
  });
});
