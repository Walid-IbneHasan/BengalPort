export type StatusTone = "neutral" | "progress" | "good" | "bad";

// Record and payment statuses as a member should read them.
const statuses: Record<string, { label: string; tone: StatusTone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SUBMITTED: { label: "Received", tone: "neutral" },
  IN_REVIEW: { label: "In review", tone: "progress" },
  APPROVED: { label: "Approved", tone: "good" },
  REJECTED: { label: "Not approved", tone: "bad" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  PAID: { label: "Paid", tone: "good" },
  PARTIALLY_PAID: { label: "Partly paid", tone: "progress" },
  DUE: { label: "Due", tone: "bad" },
  PENDING: { label: "Pending", tone: "progress" },
  FAILED: { label: "Failed", tone: "bad" },
  REFUNDED: { label: "Refunded", tone: "neutral" },
};

export function statusInfo(status: string): { label: string; tone: StatusTone } {
  const words = status.replaceAll("_", " ").toLowerCase();
  return statuses[status] ?? { label: words.charAt(0).toUpperCase() + words.slice(1), tone: "neutral" };
}

const TITLE_LENGTH = 75;

export function enquiryTitle(enquiry: { message: string; details?: unknown }): string {
  const subject = (enquiry.details as { subject?: unknown } | null | undefined)?.subject;
  if (typeof subject === "string" && subject.trim()) return subject.trim();
  const message = enquiry.message.replace(/\s+/g, " ").trim();
  if (message.length <= TITLE_LENGTH) return message;
  const cut = message.slice(0, TITLE_LENGTH + 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}
