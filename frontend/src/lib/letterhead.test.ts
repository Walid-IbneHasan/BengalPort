import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { addressLines, letterheadSvg } from "./letterhead.js";

const details = {
  logo: "data:image/webp;base64,AAAA",
  font: "data:font/woff2;base64,BBBB",
  name: "BENGAL PORT",
  subtitle: "Business · Education · Healthcare · Umrah",
  tagline: "Connecting Bengal to the World",
  address: "13 KDA Avenue, Dal Mill More, Moylapota, Khulna",
  phone: "+8801711991035",
  email: "info@bengalport.com",
  website: "www.bengalport.com",
};

describe("Bengal Port's own letterhead", () => {
  test("is an A4-shaped drawing with the name, contact details and tagline", () => {
    const svg = letterheadSvg(details);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 2100 2970"/);
    for (const text of ["BENGAL PORT", "+8801711991035", "info@bengalport.com", "www.bengalport.com", "CONNECTING BENGAL TO THE WORLD"]) assert.ok(svg.includes(text), text);
    assert.doesNotMatch(svg, /Global Education/);
  });

  test("carries its own font and logo, so it draws the same as a picture", () => {
    const svg = letterheadSvg(details);
    assert.ok(svg.includes("@font-face"));
    assert.ok(svg.includes(details.font));
    assert.equal(svg.split(details.logo).length - 1, 2, "the emblem and the watermark");
  });

  test("words that mean something in a drawing are written safely", () => {
    const svg = letterheadSvg({ ...details, name: "Bengal <Port> & Co" });
    assert.ok(svg.includes("Bengal &lt;Port&gt; &amp; Co"));
    assert.ok(!svg.includes("<Port>"));
  });

  test("without a logo the circle stays and nothing is broken", () => {
    const svg = letterheadSvg({ ...details, logo: "" });
    assert.ok(!svg.includes("<image"));
  });

  test("a long address goes on two lines, broken after a comma near the middle", () => {
    assert.deepEqual(addressLines("13 KDA Avenue, Dal Mill More, Moylapota, Khulna"), ["13 KDA Avenue, Dal Mill More,", "Moylapota, Khulna"]);
    assert.deepEqual(addressLines("Dhaka, Bangladesh"), ["Dhaka, Bangladesh"]);
  });

  test("an empty contact detail leaves no empty row", () => {
    const svg = letterheadSvg({ ...details, website: "" });
    assert.equal((svg.match(/class="row"/g) ?? []).length, 3);
  });
});
