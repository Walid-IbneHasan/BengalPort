// Plain messages for every check that has none of its own, so that a form
// sent back can say exactly what to fix ("Use at most 120 characters")
// instead of "Too big: expected string to have <=120 characters".
import { z } from "zod";

const count = (n: unknown, word: string) => `${n} ${word}${Number(n) === 1 ? "" : "s"}`;

export function plainMessage(issue: any): string | undefined {
  switch (issue.code) {
    case "invalid_type":
      if (issue.input === undefined || issue.input === null || issue.input === "") return "This is required";
      if (issue.expected === "date") return "Enter a valid date";
      if (issue.expected === "number") return "Enter a number";
      if (issue.expected === "boolean") return "Choose yes or no";
      if (issue.expected === "array") return "Choose at least one";
      return "This is not in the expected form";
    case "too_small":
      if (issue.origin === "string")
        return Number(issue.minimum) <= 1 ? "This is required" : `Use at least ${count(issue.minimum, "character")}`;
      if (issue.origin === "number" || issue.origin === "bigint")
        return issue.inclusive === false ? `Enter more than ${issue.minimum}` : `Enter ${issue.minimum} or more`;
      if (issue.origin === "array" || issue.origin === "set")
        return Number(issue.minimum) <= 1 ? "Add at least one" : `Add at least ${issue.minimum}`;
      if (issue.origin === "date") return "Choose a later date";
      return "This is too short";
    case "too_big":
      if (issue.origin === "string") return `Use at most ${count(issue.maximum, "character")}`;
      if (issue.origin === "number" || issue.origin === "bigint")
        return issue.inclusive === false ? `Enter less than ${issue.maximum}` : `Enter ${issue.maximum} or less`;
      if (issue.origin === "array" || issue.origin === "set") return `Use at most ${issue.maximum}`;
      if (issue.origin === "date") return "Choose an earlier date";
      return "This is too long";
    case "invalid_format":
      if (issue.format === "email") return "Enter a valid email address";
      if (issue.format === "url") return "Enter a full web address starting with https://";
      if (issue.format === "regex") return "This is not in the right format";
      return "This is not in the right format";
    case "invalid_value":
      return "Choose one of the listed options";
    case "not_multiple_of":
      return Number(issue.divisor) === 0.01 ? "Use at most two decimal places" : `Use a multiple of ${issue.divisor}`;
    case "unrecognized_keys":
      return "This form sent something it should not";
    case "invalid_union":
      return "This is not in the expected form";
    default:
      return undefined;
  }
}

z.config({ customError: plainMessage });
