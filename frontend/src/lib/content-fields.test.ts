import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { addItem, contentRows, fillMissing, removeItem, setAt } from "./content-fields.js";

const content = {
  hero: { title: "Connection with purpose.", description: "Short", image: "/images/hero.webp" },
  values: [
    { title: "Mission", description: "First" },
    { title: "Vision", description: "Second" },
  ],
  work: { points: ["Verified", "Human"] },
};
const fields = (rows: ReturnType<typeof contentRows>) => rows.filter((row) => row.kind === "field");

describe("turning page content into editor rows", () => {
  test("every piece of text becomes a field, in the order of the content", () => {
    assert.deepEqual(
      fields(contentRows(content)).map((row) => row.path),
      ["hero.title", "hero.description", "hero.image", "values.0.title", "values.0.description", "values.1.title", "values.1.description", "work.points.0", "work.points.1"],
    );
  });

  test("labels read naturally and count from one", () => {
    const labels = Object.fromEntries(fields(contentRows(content)).map((row) => [row.path, row.label]));
    assert.equal(labels["hero.title"], "Hero · title");
    assert.equal(labels["values.1.description"], "Values 2 · description");
    assert.equal(labels["work.points.0"], "Work · points 1");
  });

  test("descriptions get a larger box and images an image picker", () => {
    const rows = Object.fromEntries(fields(contentRows(content)).map((row) => [row.path, row]));
    assert.equal(rows["hero.description"].long, true);
    assert.equal(rows["hero.title"].long, false);
    assert.equal(rows["hero.image"].image, true);
  });

  test("a photo gets an image picker too", () => {
    const rows = Object.fromEntries(fields(contentRows({ fields: { medical: { photo: "/images/medical.webp", title: "Medical" } } })).map((row) => [row.path, row]));
    assert.equal(rows["fields.medical.photo"].image, true);
    assert.equal(rows["fields.medical.title"].image, false);
  });

  test("lists cannot be changed unless the page allows it", () => {
    assert.ok(contentRows(content).every((row) => row.kind === "field" && !row.remove));
  });

  test("a list of texts gets a remove button per item and an add button at the end", () => {
    const rows = contentRows(content, { lists: true });
    const point = rows.find((row) => row.kind === "field" && row.path === "work.points.1");
    assert.deepEqual(point?.kind === "field" && point.remove, { list: "work.points", index: 1 });
    assert.deepEqual(rows.at(-1), { kind: "add", list: "work.points", label: "Add to work · points" });
  });

  test("a list of cards gets a remove row after each card and an add row after the last", () => {
    const rows = contentRows(content, { lists: true });
    const after = (path: string) => rows[rows.findIndex((row) => row.kind === "field" && row.path === path) + 1];
    assert.deepEqual(after("values.0.description"), { kind: "remove", list: "values", index: 0, label: "Remove values 1" });
    assert.deepEqual(rows[rows.findIndex((row) => row.kind === "remove" && row.index === 1) + 1], { kind: "add", list: "values", label: "Add to values" });
  });

  test("the last item of a list cannot be removed", () => {
    const rows = contentRows({ work: { points: ["Only one"] } }, { lists: true });
    assert.ok(rows.every((row) => row.kind !== "remove" && !(row.kind === "field" && row.remove)));
  });
});

describe("changing page content", () => {
  test("setting a text changes only that text, in a copy", () => {
    const changed = setAt(content, "values.1.title", "Our Vision");
    assert.equal(changed.values[1].title, "Our Vision");
    assert.equal(content.values[1].title, "Vision");
    assert.equal(changed.values[0].title, "Mission");
  });

  test("adding to a list of texts appends an empty text", () => {
    assert.deepEqual(addItem(content, "work.points").work.points, ["Verified", "Human", ""]);
    assert.equal(content.work.points.length, 2);
  });

  test("adding to a list of cards appends a blank card of the same shape", () => {
    assert.deepEqual(addItem(content, "values").values[2], { title: "", description: "" });
  });

  test("removing takes out the item at that position", () => {
    assert.deepEqual(removeItem(content, "values", 0).values, [{ title: "Vision", description: "Second" }]);
    assert.deepEqual(removeItem(content, "work.points", 1).work.points, ["Verified"]);
    assert.equal(content.values.length, 2);
  });
});

describe("opening a page that was saved before a section was added", () => {
  const builtIn = {
    hero: { title: "Study beyond borders.", tagline: "Choose clearly." },
    fields: { medical: { title: "Medical", points: ["Eligibility"] } },
    reviews: { items: [] as unknown[] },
  };

  test("the missing section and the missing text get the built-in wording", () => {
    assert.deepEqual(fillMissing(builtIn, { hero: { title: "Study abroad." } }), {
      hero: { title: "Study abroad.", tagline: "Choose clearly." },
      fields: { medical: { title: "Medical", points: ["Eligibility"] } },
      reviews: { items: [] },
    });
  });

  test("sections the page no longer has are left out", () => {
    const filled = fillMissing(builtIn, { hero: { title: "Saved", tagline: "Saved too" }, shortcuts: [{ title: "Old" }] });
    assert.deepEqual(Object.keys(filled), ["hero", "fields", "reviews"]);
  });

  test("saved lists are kept as they are", () => {
    const saved = { fields: { medical: { points: ["One", "Two", "Three"] } }, reviews: { items: [{ name: "A student" }] } };
    const filled = fillMissing(builtIn, saved);
    assert.deepEqual(filled.fields.medical.points, ["One", "Two", "Three"]);
    assert.deepEqual(filled.reviews.items, [{ name: "A student" }]);
  });

  test("something saved in the wrong shape is replaced by the built-in wording", () => {
    assert.deepEqual(fillMissing(builtIn, { hero: "broken", reviews: { items: "none" } }), builtIn);
  });

  test("nothing saved gives a copy of the built-in wording", () => {
    const filled = fillMissing(builtIn, undefined);
    assert.deepEqual(filled, builtIn);
    assert.notEqual(filled.hero, builtIn.hero);
  });
});
