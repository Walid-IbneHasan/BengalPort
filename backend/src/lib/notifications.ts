import type { FastifyInstance } from "fastify";
import { escapeHtml, type Mail } from "./email.js";

type EnquiryRecord = { type: string; name: string; phone: string; email: string | null; message: string; details: unknown };
type ApplicationRecord = { type: string; reference: string; fullName: string; phone: string; email: string };

// ADMIN_NOTIFY_EMAIL holds one or more comma-separated team addresses.
export const teamAddresses = () => (process.env.ADMIN_NOTIFY_EMAIL || "").split(",").map((x) => x.trim()).filter(Boolean);
const siteUrl = () => (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim();
const adminUrl = (section: string) => `${siteUrl()}/admin/${section}`;
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

// What an applicant is told when staff move their application on. Moving it
// back to "received" or to a draft is housekeeping and is not announced.
const statusNotices: Record<string, { subject: string; lines: string[] }> = {
  IN_REVIEW: { subject: "Your application is being reviewed", lines: ["Our team has started reviewing your application. We will contact you if we need anything else from you."] },
  APPROVED: { subject: "Your application has been approved", lines: ["Good news: your application has been approved. Our team will contact you about the next steps."] },
  REJECTED: { subject: "An update on your application", lines: ["Thank you for applying through Bengal Port. After reviewing your application, we are unable to proceed with it at this time.", "If you would like to know more or discuss other options, please contact us and quote your reference number."] },
  CANCELLED: { subject: "Your application has been cancelled", lines: ["Your application has been cancelled. If you did not expect this, please contact us and quote your reference number."] },
};

type ApplicantRecord = { reference: string; email: string; userId: string | null };

export function notifyApplicationStatus(app: FastifyInstance, application: ApplicantRecord, status: string) {
  const notice = statusNotices[status];
  if (!notice) return;
  deliver(app, [mail(application.email, `${notice.subject} | Bengal Port ${application.reference}`, [
    "Hello,",
    `This is an update on your Bengal Port application ${application.reference}.`,
    ...notice.lines,
    ...(application.userId ? [`You can follow your application from your account: ${siteUrl()}/dashboard`] : []),
  ])]);
}

// Staff have set what an application costs. The link is offered only while
// the site can actually take a payment.
export function notifyAmountDue(app: FastifyInstance, application: ApplicantRecord, amounts: { amountDue: number; remaining: number }) {
  const { amountDue, remaining } = amounts;
  deliver(app, [mail(application.email, `Amount due for your application | Bengal Port ${application.reference}`, [
    "Hello,",
    `The amount due for your Bengal Port application ${application.reference} is ${money(amountDue)}.${remaining < amountDue ? ` After the payments we have received, ${money(remaining)} is still due.` : ""}`,
    app.gateway.configured
      ? `You can pay online with bKash, in full or in part: ${siteUrl()}/pay?ref=${application.reference}`
      : "Our team will contact you about how to pay.",
    "If you have a question about this amount, please contact us and quote your reference number.",
  ])]);
}

type RefundNotice = {
  application: { reference: string; fullName: string; email: string };
  amount: number;
  method: string;
  transactionId: string | null;
};

// Money sent back to a customer: the team is told, and so is the payer.
export function notifyRefund(app: FastifyInstance, notice: RefundNotice) {
  const { application, amount, method } = notice;
  const trace = notice.transactionId ? ` bKash refund transaction: ${notice.transactionId}.` : "";
  const mails = teamAddresses().map((to) => mail(to, `Refund made for ${application.reference}: ${money(amount)}`, [
    "A refund was recorded on the Bengal Port website.",
    [`Reference: ${application.reference}`, `Applicant: ${application.fullName}`, `Amount: ${money(amount)}`, `Returned by: ${method}`, ...(notice.transactionId ? [`bKash refund transaction: ${notice.transactionId}`] : [])].join("\n"),
    `Payments in the admin: ${adminUrl("payments")}`,
  ]));
  mails.push(mail(application.email, `Refund made | Bengal Port ${application.reference}`, [
    "Hello,",
    `We have refunded ${money(amount)} of your payment for application ${application.reference}${method === "bKash" ? " to the bKash wallet it was paid from" : ` by ${method.toLowerCase()}`}.${trace}`,
    "If you have a question about this refund, please contact us and quote your reference number.",
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
