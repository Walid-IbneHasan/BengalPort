// Customer reviews: what the website shows of one, what a member is told
// about theirs, and the checks made before one is sent.
import type { StatusTone } from "./member-activity";

export type PublicReview = {
  id: string;
  division: string;
  name: string;
  detail: string | null;
  rating: number;
  body: string;
  // The picture shown with the review, or null for an initials disc.
  photoUrl: string | null;
  createdAt: string;
};
export type ReviewStatus = "PENDING" | "APPROVED" | "HIDDEN";
export type OwnReview = PublicReview & { status: ReviewStatus };

export const REVIEW_LENGTH = 1500;

// Why a review cannot be sent yet, or "" when it can. The API checks again.
export function reviewProblem(review: { rating: number; name: string; body: string }): string {
  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) return "Choose a rating from 1 to 5 stars.";
  if (review.name.trim().length < 2) return "Enter the name to show with your review.";
  if (review.body.trim().length < 10) return "Write at least a sentence about your experience.";
  if (review.body.trim().length > REVIEW_LENGTH) return "Keep your review under 1,500 characters.";
  return "";
}

const states: Record<ReviewStatus, { label: string; tone: StatusTone; editable: boolean }> = {
  PENDING: { label: "Waiting for approval", tone: "progress", editable: true },
  APPROVED: { label: "Published", tone: "good", editable: false },
  HIDDEN: { label: "Not published", tone: "neutral", editable: false },
};
export const reviewState = (status: ReviewStatus) => states[status];

// The part of a review the testimonial strip shows: whole when it is short,
// otherwise cut back to the last full sentence that fits, or failing that to
// a whole word with an ellipsis.
export function excerpt(body: string, max = 220): string {
  const text = body.trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  const head = text.slice(0, max + 1);
  const sentenceEnd = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  if (sentenceEnd >= max / 3) return head.slice(0, sentenceEnd + 1);
  const wordEnd = head.lastIndexOf(" ");
  return `${head.slice(0, wordEnd > 0 ? wordEnd : max).trimEnd()}…`;
}

// Up to two initials for a reviewer without a photo: first and last name.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const letters = parts.length === 1 ? [parts[0]] : [parts[0], parts[parts.length - 1]];
  return letters.map((part) => part.charAt(0).toUpperCase()).join("");
}

// Five stars, filled up to the rating.
export function stars(rating: number): boolean[] {
  const filled = Math.min(5, Math.max(0, Math.round(rating)));
  return Array.from({ length: 5 }, (_, index) => index < filled);
}

const services: Record<string, string> = {
  BUSINESS: "Global Business",
  EDUCATION: "Global Education",
  HEALTHCARE: "Global Healthcare",
  UMRAH: "Global Umrah",
};
export const serviceName = (division: string) =>
  services[division] ?? division.charAt(0) + division.slice(1).toLowerCase();
