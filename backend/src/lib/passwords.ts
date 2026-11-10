import crypto from "node:crypto";

// Left out: 0 and O, 1 and l and I, which look alike in many fonts. A person
// may have to read this from a phone and type it on a computer.
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const ANY = LOWER + UPPER + DIGITS;
const LENGTH = 16;

const pick = (from: string) => from[crypto.randomInt(from.length)];

// A one-time password that always satisfies the site's password rules.
export function temporaryPassword() {
  const letters = [pick(LOWER), pick(UPPER), pick(DIGITS)];
  while (letters.length < LENGTH) letters.push(pick(ANY));
  for (let i = letters.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters.join("");
}
