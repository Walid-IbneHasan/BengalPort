import crypto from "node:crypto";

// Unambiguous characters only (no 0/O or 1/I), so a code can be read out over
// the phone or copied from a printed receipt.
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export const randomCode = (length: number) =>
  Array.from({ length }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");

// The number printed on a receipt: BPR-2026-7KQ3M9X.
export const receiptNumber = () => `BPR-${new Date().getFullYear()}-${randomCode(7)}`;
