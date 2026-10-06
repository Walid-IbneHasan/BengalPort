import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { destinations, fieldPrograms, flagCodes, institutionFields, studyField } from "./education.js";

const records = [
  {
    name: "International Medical University",
    country: "Malaysia",
    image: "/images/imu.webp",
    programs: [{ title: "Bachelor of Medicine and Surgery", level: "Undergraduate", discipline: "MBBS" }],
  },
  {
    name: "Global Engineering Institute",
    country: "China",
    image: "/images/gei.webp",
    programs: [
      { title: "BSc Mechanical Engineering", level: "Undergraduate", discipline: "Engineering" },
      { title: "MBA International Business", level: "Postgraduate", discipline: "Business" },
    ],
  },
  {
    name: "Asia Pacific University",
    country: "Malaysia",
    image: "/images/apu.webp",
    programs: [{ title: "BSc Computer Science", level: "Undergraduate", discipline: "Computing" }],
  },
];

describe("which field of study a programme belongs to", () => {
  test("medicine and the other health professions are Medical", () => {
    for (const discipline of ["MBBS", "Medicine", "Dentistry", "Nursing", "Pharmacy", "Public Health"])
      assert.equal(studyField({ title: "A programme", discipline }), "medical", discipline);
  });

  test("engineering, computing and technology are Engineering", () => {
    for (const discipline of ["Engineering", "Computer Science", "Software", "Information Technology", "Architecture"])
      assert.equal(studyField({ title: "A programme", discipline }), "engineering", discipline);
  });

  test("the short names IT and ICT are Engineering", () => {
    assert.equal(studyField({ title: "BSc IT", discipline: "IT" }), "engineering");
    assert.equal(studyField({ title: "Diploma", discipline: "ICT" }), "engineering");
    assert.equal(studyField({ title: "BA Italian Studies", discipline: "Languages" }), "general");
  });

  test("everything else is General Subjects", () => {
    for (const discipline of ["Business", "Economics", "Law", "English Literature", ""])
      assert.equal(studyField({ title: "A programme", discipline }), "general", discipline);
  });

  test("the programme's title decides when the discipline does not say", () => {
    assert.equal(studyField({ title: "Bachelor of Medicine and Surgery", discipline: "Undergraduate degree" }), "medical");
    assert.equal(studyField({ title: "BSc Civil Engineering", discipline: "" }), "engineering");
  });

  test("an engineering degree in a medical area is Engineering", () => {
    assert.equal(studyField({ title: "BEng Biomedical Engineering", discipline: "Biomedical Engineering" }), "engineering");
  });

  test("a medical degree with technology in its name is Medical", () => {
    assert.equal(studyField({ title: "BSc Medical Laboratory Technology", discipline: "Medical Technology" }), "medical");
  });
});

describe("the fields an institution teaches", () => {
  test("are listed once each, Medical first", () => {
    assert.deepEqual(institutionFields(records[1]), ["engineering", "general"]);
    assert.deepEqual(institutionFields(records[0]), ["medical"]);
  });

  test("an institution with no programmes has none", () => {
    assert.deepEqual(institutionFields({ name: "New College", country: "Turkey", image: "" }), []);
  });
});

describe("the programmes offered in a field", () => {
  test("come with the institution and country that offer them", () => {
    assert.deepEqual(fieldPrograms(records, "engineering"), [
      { title: "BSc Mechanical Engineering", level: "Undergraduate", institution: "Global Engineering Institute", country: "China" },
      { title: "BSc Computer Science", level: "Undergraduate", institution: "Asia Pacific University", country: "Malaysia" },
    ]);
  });

  test("a field nobody teaches yet has no programmes", () => {
    assert.deepEqual(fieldPrograms([records[0]], "general"), []);
  });
});

describe("study destinations", () => {
  test("each country appears once with what it offers, the largest first", () => {
    assert.deepEqual(destinations(records), [
      { country: "Malaysia", institutions: 2, programs: 2, image: "/images/imu.webp" },
      { country: "China", institutions: 1, programs: 2, image: "/images/gei.webp" },
    ]);
  });

  test("countries with the same number of institutions are in alphabetical order", () => {
    const names = destinations([
      { name: "B", country: "Turkey", image: "" },
      { name: "A", country: "China", image: "" },
    ]).map((d) => d.country);
    assert.deepEqual(names, ["China", "Turkey"]);
  });

  test("no institutions means no destinations", () => {
    assert.deepEqual(destinations([]), []);
  });
});

describe("the flags shown for study destinations", () => {
  test("each known country gives its flag code, in the order given", () => {
    assert.deepEqual(flagCodes(["UK", "USA", "Canada", "Australia", "Malaysia"]), ["gb", "us", "ca", "au", "my"]);
  });

  test("a country is recognised however it is written", () => {
    assert.deepEqual(flagCodes(["united kingdom", " China ", "U.S.A."]), ["gb", "cn", "us"]);
  });

  test("a country written twice gives one flag", () => {
    assert.deepEqual(flagCodes(["UK", "United Kingdom", "Malaysia"]), ["gb", "my"]);
  });

  test("a country without a known flag is left out", () => {
    assert.deepEqual(flagCodes(["Atlantis", "Malaysia"]), ["my"]);
  });
});
