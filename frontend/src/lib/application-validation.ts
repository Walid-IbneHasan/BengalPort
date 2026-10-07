import type { ApplicationField } from "./application-forms";

const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// The message to show for a phone number, or "" when it looks real. A blank
// number is left to the required check. Numbers are compared by their digits,
// so spaces, dashes and a leading plus are fine; seven to fifteen digits is the
// range real numbers fall in, and one digit repeated is nobody's number.
export function phoneProblem(value: string): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length < 7) return "Enter a full phone number, including the area or country code.";
  if (digits.length > 15 || /^(\d)\1+$/.test(digits))
    return "That does not look like a real phone number. Please check the digits.";
  return "";
}

// The message to show for a field's current answer, or "" when it is fine.
// Checked step by step, so a mistake is pointed out where it was made instead
// of being rejected by the server after the last step.
export function fieldError(field: ApplicationField, value: unknown): string {
  if (field.type === "checkbox") return field.required && value !== true ? `Please tick “${field.label}”` : "";
  if (field.type === "multi")
    return field.required && !(Array.isArray(value) && value.length) ? `Please complete “${field.label}”.` : "";
  const answer = String(value ?? "").trim();
  if (!answer) return field.required ? `Please complete “${field.label}”.` : "";
  if (field.type === "email" && !emailShape.test(answer)) return "Enter a valid email address, like name@example.com.";
  if (field.type === "tel") return phoneProblem(answer);
  if (field.type === "date" && /expiry/i.test(field.key) && answer < new Date().toISOString().slice(0, 10))
    return `“${field.label}” is in the past. Please check the date.`;
  return "";
}
