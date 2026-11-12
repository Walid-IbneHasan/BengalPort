// The words shown when a request fails: the server's own explanation, with
// every field it refused and why, so nobody has to open the browser's
// network panel to find out what went wrong.
import { ApiError } from "./api-error";
import { toasts } from "./toast";

// "customerPhone" -> "Customer phone", "unit_price" -> "Unit price"
export const fieldName = (key: string) =>
  key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

const sentence = (text: string) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);
const lower = (text: string) => text.replace(/^./, (c) => c.toLowerCase());

export function problemText(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 500 || error.code === "SERVER_ERROR")
      return `${sentence(fallback)} Something went wrong on our side; please try again in a minute.`;
    const details = error.details as { formErrors?: string[]; fieldErrors?: Record<string, string[] | undefined> } | undefined;
    const parts = [sentence(error.message || fallback)];
    for (const message of details?.formErrors ?? []) parts.push(sentence(message));
    for (const [key, messages] of Object.entries(details?.fieldErrors ?? {}))
      if (messages?.length) parts.push(sentence(`${fieldName(key)}: ${lower(messages[0])}`));
    return parts.join(" ");
  }
  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message))
    return "Could not reach the server. Check your connection and try again.";
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// The same words, also shown at the top of the screen for a while, for a
// form whose own message might be out of sight.
export function reportProblem(error: unknown, fallback: string): string {
  const text = problemText(error, fallback);
  toasts.show(text, { kind: "error" });
  return text;
}
