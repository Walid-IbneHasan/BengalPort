import type { FastifyInstance } from "fastify";
import { escapeHtml, type Mail } from "./email.js";

type EnquiryRecord = { type: string; name: string; phone: string; email: string | null; message: string; details: unknown };
type ApplicationRecord = { type: string; reference: string; fullName: string; phone: string; email: string };

// ADMIN_NOTIFY_EMAIL holds one or more comma-separated team addresses.
const teamAddresses = () => (process.env.ADMIN_NOTIFY_EMAIL || "").split(",").map((x) => x.trim()).filter(Boolean);
const adminUrl = (section: string) => `${(process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim()}/admin/${section}`;
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 120);

function mail(to: string, subject: string, paragraphs: string[]): Mail {
  return {
    to,
    subject,
    text: paragraphs.join("\n\n"),
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#102642"><h2 style="color:#0a1d3a">Bengal Port</h2>${paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("")}</div>`,
  };
}

// Sending never delays or fails the visitor's request; failures are logged.
function deliver(app: FastifyInstance, mails: Mail[]) {
  if (!app.mailer.configured) return;
  for (const item of mails)
    void (async () => {
      try { await app.mailer.send(item); }
      catch (error) { app.log.error({ error, to: item.to }, "Notification email failed"); }
    })();
}

// Confirmations go to an address typed into a public form, so they contain
// nothing the sender wrote: only fixed wording and our own reference number.
const notYou = (what: string) => `If you did not ${what}, you can ignore this email.`;

export function notifyNewEnquiry(app: FastifyInstance, enquiry: EnquiryRecord) {
  const subject = (enquiry.details as { subject?: unknown } | null)?.subject;
  const mails = teamAddresses().map((to) => mail(to, `New ${enquiry.type.toLowerCase()} enquiry from ${oneLine(enquiry.name)}`, [
    "A new enquiry was submitted on the Bengal Port website.",
    [`Name: ${enquiry.name}`, `Phone: ${enquiry.phone}`, `Email: ${enquiry.email || "not provided"}`, `Division: ${enquiry.type}`, ...(typeof subject === "string" && subject ? [`Subject: ${subject}`] : [])].join("\n"),
    `Message:\n${enquiry.message}`,
    `Open it in the admin: ${adminUrl("enquiries")}`,
  ]));
  if (enquiry.email)
    mails.push(mail(enquiry.email, "We received your enquiry | Bengal Port", [
      "Hello,",
      "Thank you for contacting Bengal Port. We have received your enquiry and our team will contact you soon.",
      notYou("send this enquiry"),
    ]));
  deliver(app, mails);
}

type PaymentNotice = {
  application: { reference: string; type: string; fullName: string; email: string };
  amount: number;
  remaining: number;
  transactionId: string;
  receiptUrl: string;
};
const money = (amount: number) => `BDT ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)}`;

// A payment bKash has confirmed: the team is told, and the payer is sent
// their receipt link.
export function notifyPayment(app: FastifyInstance, notice: PaymentNotice) {
  const { application, amount, remaining } = notice;
  const balance = remaining > 0 ? `Still due: ${money(remaining)}` : "The application is now fully paid.";
  const mails = teamAddresses().map((to) => mail(to, `Payment received for ${application.reference}: ${money(amount)}`, [
    "A bKash payment was received on the Bengal Port website.",
    [`Reference: ${application.reference}`, `Applicant: ${application.fullName}`, `Division: ${application.type}`, `Amount: ${money(amount)}`, `bKash transaction: ${notice.transactionId}`, balance].join("\n"),
    `Payments in the admin: ${adminUrl("payments")}`,
  ]));
  mails.push(mail(application.email, `Payment received | Bengal Port ${application.reference}`, [
    "Hello,",
    `We have received your bKash payment of ${money(amount)} for application ${application.reference}. bKash transaction: ${notice.transactionId}.`,
    balance,
    `Your receipt: ${notice.receiptUrl}`,
    notYou("make this payment"),
  ]));
  deliver(app, mails);
}

export function notifyNewApplication(app: FastifyInstance, application: ApplicationRecord) {
  const mails = teamAddresses().map((to) => mail(to, `New ${application.type.toLowerCase()} application ${application.reference}`, [
    "A new application was submitted on the Bengal Port website.",
    [`Reference: ${application.reference}`, `Applicant: ${application.fullName}`, `Phone: ${application.phone}`, `Email: ${application.email}`, `Division: ${application.type}`].join("\n"),
    `Read the full application in the admin: ${adminUrl("applications")}`,
  ]));
  mails.push(mail(application.email, `Your Bengal Port application ${application.reference}`, [
    "Hello,",
    `We have received your application. Your reference number is ${application.reference}. Keep it for future communication with Bengal Port.`,
    "Our team will review your application and contact you.",
    notYou("submit this application"),
  ]));
  deliver(app, mails);
}
