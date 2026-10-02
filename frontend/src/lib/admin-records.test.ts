import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { blankRecord, recordBody, recordFromRow } from "./admin-records";

describe("what the admin form sends when saving", () => {
  test("an opportunity without a link name gets one made from its title", () => {
    const body = recordBody("opportunity", { ...blankRecord(), title: "  China Sourcing & Factory Tour 2027 ", description: "Meet manufacturers.", country: "China", location: "Guangzhou" });
    assert.equal(body.slug, "china-sourcing-factory-tour-2027");
  });

  test("an opportunity with no deadline sends none", () => {
    assert.equal(recordBody("opportunity", { ...blankRecord(), title: "Open day" }).deadline, null);
  });

  test("a partner is sent with only its own fields", () => {
    const body = recordBody("partner", { ...blankRecord(), name: "Eastern Textiles", country: "China", industry: "Textiles", product: "Cotton", description: "Verified mill.", featured: true });
    assert.deepEqual(body, { name: "Eastern Textiles", country: "China", industry: "Textiles", product: "Cotton", description: "Verified mill.", image: "/images/global-business.webp", featured: true });
  });

  test("an institution is sent with its programmes, leaving out blank rows", () => {
    const body = recordBody("institution", {
      ...blankRecord(),
      name: "International Medical University",
      country: "Malaysia",
      description: "Recognised medical programmes.",
      programs: [
        { title: "MBBS", level: "Undergraduate", discipline: "Medicine", deadline: "2027-03-31" },
        { title: "", level: "", discipline: "", deadline: "" },
      ],
    });
    assert.deepEqual(body.programs, [{ title: "MBBS", level: "Undergraduate", discipline: "Medicine", deadline: "2027-03-31" }]);
    assert.equal("industry" in body, false);
  });

  test("a programme with no deadline sends none", () => {
    const body = recordBody("institution", { ...blankRecord(), programs: [{ title: "MD", level: "Postgraduate", discipline: "Medicine", deadline: "" }] });
    assert.equal(body.programs[0].deadline, null);
  });

  test("a hospital is sent with its city and services", () => {
    const body = recordBody("hospital", { ...blankRecord(), name: "Bangkok Medical Centre", country: "Thailand", city: "Bangkok", description: "International patient centre.", services: [{ title: "Cardiology", category: "Specialist care", description: "Heart care." }] });
    assert.equal(body.city, "Bangkok");
    assert.deepEqual(body.services, [{ title: "Cardiology", category: "Specialist care", description: "Heart care." }]);
  });
});

describe("opening an existing record for editing", () => {
  test("an opportunity's deadline is shown as a date field value", () => {
    const form = recordFromRow("opportunity", { id: "o1", slug: "open-day", category: "EVENT", title: "Open day", description: "Visit us.", country: "Bangladesh", location: "Dhaka", deadline: "2026-12-31T00:00:00.000Z", image: "/images/x.webp", published: false });
    assert.equal(form.id, "o1");
    assert.equal(form.deadline, "2026-12-31");
    assert.equal(form.published, false);
  });

  test("an institution's programmes are listed for editing", () => {
    const form = recordFromRow("institution", { id: "i1", name: "IMU", country: "Malaysia", description: "Medical.", image: "/images/x.webp", programs: [{ id: "p1", institutionId: "i1", title: "MBBS", level: "Undergraduate", discipline: "Medicine", deadline: null }] });
    assert.deepEqual(form.programs, [{ title: "MBBS", level: "Undergraduate", discipline: "Medicine", deadline: "" }]);
  });

  test("saving an edited record sends back what was loaded", () => {
    const row = { id: "h1", name: "KL Specialist", country: "Malaysia", city: "Kuala Lumpur", description: "Specialist hospital.", image: "/images/x.webp", services: [{ id: "s1", hospitalId: "h1", title: "Oncology", category: "Cancer care", description: "Diagnosis and treatment." }] };
    assert.deepEqual(recordBody("hospital", recordFromRow("hospital", row)), {
      name: "KL Specialist", country: "Malaysia", city: "Kuala Lumpur", description: "Specialist hospital.", image: "/images/x.webp",
      services: [{ title: "Oncology", category: "Cancer care", description: "Diagnosis and treatment." }],
    });
  });
});
