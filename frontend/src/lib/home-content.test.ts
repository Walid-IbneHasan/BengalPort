import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { defaultHomeContent, homeContentFrom } from "./home-content.js";

// The home page's copy was refreshed in October 2026: a proposition in place
// of the brand name, Umrah named everywhere the other three divisions are.
// A page saved with the old built-in wording picks up the new wording;
// wording the admin wrote themselves is kept.
describe("reading the saved home page", () => {
  const oldDefaults = () => {
    const saved = structuredClone(defaultHomeContent) as any;
    saved.hero.title = "BENGAL PORT";
    saved.intro.description =
      "Bengal Port brings together verified business networks, international study pathways and trusted healthcare partners through one accountable team.";
    saved.pathways.eyebrow = "THREE PATHWAYS. ONE STANDARD.";
    saved.pathways.items = saved.pathways.items.filter((item: any) => item.href !== "/umrah");
    saved.footer.description =
      "Connecting Bengal to the world through trusted business, education and healthcare partnerships.";
    return saved;
  };

  test("the retired built-in wording is replaced by the current wording", () => {
    const content = homeContentFrom(oldDefaults());
    assert.equal(content.hero.title, defaultHomeContent.hero.title);
    assert.notEqual(content.hero.title, "BENGAL PORT");
    assert.equal(content.intro.description, defaultHomeContent.intro.description);
    assert.equal(content.pathways.eyebrow, "FOUR PATHWAYS. ONE STANDARD.");
    assert.equal(content.footer.description, defaultHomeContent.footer.description);
    assert.match(content.footer.description, /Umrah/);
  });

  test("wording the admin changed is kept", () => {
    const saved = oldDefaults();
    saved.hero.title = "Gateway to the world";
    saved.footer.description = "Our own footer line.";
    const content = homeContentFrom(saved);
    assert.equal(content.hero.title, "Gateway to the world");
    assert.equal(content.footer.description, "Our own footer line.");
  });

  test("three saved pathways gain the built-in Umrah pathway", () => {
    const content = homeContentFrom(oldDefaults());
    assert.equal(content.pathways.items.length, 4);
    assert.equal(content.pathways.items[3].href, "/umrah");
    assert.equal(content.pathways.items[3].icon, "umrah");
  });

  test("a pathways list that already names Umrah is left alone", () => {
    const saved = structuredClone(defaultHomeContent) as any;
    saved.pathways.items[3].title = "Our own Umrah title";
    const content = homeContentFrom(saved);
    assert.equal(content.pathways.items.length, 4);
    assert.equal(content.pathways.items[3].title, "Our own Umrah title");
  });

  test("the retired five-figure stat strip becomes the current one", () => {
    const saved = structuredClone(defaultHomeContent) as any;
    // Keys in the order the database returns them, not the built-in order.
    saved.stats = [
      { icon: "globe", label: "Countries", value: "10+" },
      { icon: "users", label: "Global Partners", value: "500+" },
      { icon: "package", label: "Products", value: "1000+" },
      { icon: "briefcase", label: "Business Tours", value: "100+" },
      { icon: "smile", label: "Happy Clients", value: "500+" },
    ];
    const content = homeContentFrom(saved);
    assert.deepEqual(content.stats, defaultHomeContent.stats);
    assert.equal(content.stats.length, 4);
    assert.equal(content.stats.some((stat) => stat.label === "Products"), false);
  });

  test("stats the admin edited are kept", () => {
    const saved = structuredClone(defaultHomeContent) as any;
    saved.stats = [
      { value: "12+", label: "Countries", icon: "globe" },
      { value: "500+", label: "Global Partners", icon: "users" },
      { value: "1000+", label: "Products", icon: "package" },
      { value: "100+", label: "Business Tours", icon: "briefcase" },
      { value: "500+", label: "Happy Clients", icon: "smile" },
    ];
    const content = homeContentFrom(saved);
    assert.equal(content.stats.length, 5);
    assert.equal(content.stats[0].value, "12+");
  });

  test("a saved page missing newer fields gets them from the built-in page", () => {
    const saved = structuredClone(defaultHomeContent) as any;
    delete saved.utility.facebook;
    delete saved.closing;
    const content = homeContentFrom(saved);
    assert.equal(content.utility.facebook, "");
    assert.deepEqual(content.closing, defaultHomeContent.closing);
  });

  test("nothing saved gives the built-in page", () => {
    assert.deepEqual(homeContentFrom(undefined), defaultHomeContent);
  });
});
