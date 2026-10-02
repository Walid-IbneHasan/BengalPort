import { z } from "zod";
import { prisma } from "./prisma.js";

// How someone without access to an application proves it is theirs: its
// reference number together with the phone number or email it was made with.
export const lookupSchema = z.object({
  reference: z.string().trim().min(3).max(40),
  contact: z.string().trim().min(5).max(160),
});

// Phone numbers are compared on their last ten digits, so "+880 1711-000000"
// and "01711000000" are the same number.
const digits = (value: string) => value.replace(/\D/g, "").slice(-10);

export function contactMatches(contact: string, application: { email: string; phone: string }): boolean {
  return contact.includes("@")
    ? contact.toLowerCase() === application.email.toLowerCase()
    : digits(contact).length >= 7 && digits(contact) === digits(application.phone);
}

// The application the details point to, or null. An unknown reference and a
// wrong contact detail are deliberately not told apart.
export async function findApplication(input: unknown) {
  const parsed = lookupSchema.safeParse(input);
  if (!parsed.success) return null;
  const application = await prisma.application.findUnique({ where: { reference: parsed.data.reference.toUpperCase() } });
  return application && contactMatches(parsed.data.contact, application) ? application : null;
}
