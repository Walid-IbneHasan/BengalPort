import { providerKeys, providers } from "./gateway.js";
import type { FastifyInstance } from "fastify";
import { brandedMail, siteUrl, type Mail } from "./email.js";
import type { Row } from "./email-layout.js";

type EnquiryRecord = { type: string; name: string; phone: string; email: string | null; message: string; details: unknown };
type ApplicationRecord = { type: string; reference: string; fullName: string; phone: string; email: string };

// ADMIN_NOTIFY_EMAIL holds one or more comma-separated team addresses.
export const teamAddresses = () => (process.env.ADMIN_NOTIFY_EMAIL || "").split(",").map((x) => x.trim()).filter(Boolean);
const adminUrl = (section: string) => `${siteUrl()}/admin/${section}`;
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 120);

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
  const mails = teamAddresses().map((to) => brandedMail(to, `New ${enquiry.type.toLowerCase()} enquiry from ${oneLine(enquiry.name)}`, {
    heading: "New enquiry",
    paragraphs: ["A new enquiry was submitted on the Bengal Port website."],
    details: [["Name", enquiry.name], ["Phone", enquiry.phone], ["Email", enquiry.email || "Not provided"], ["Division", enquiry.type], ...(typeof subject === "string" && subject ? [["Subject", subject] as Row] : [])],
    quote: { label: "Message", text: enquiry.message },
    action: { label: "Open in admin", url: adminUrl("enquiries") },
  }));
  if (enquiry.email)
    mails.push(brandedMail(enquiry.email, "We received your enquiry | Bengal Port", {
      heading: "We received your enquiry",
      paragraphs: ["Hello,", "Thank you for contacting Bengal Port. We have received your enquiry and our team will contact you soon."],
      note: notYou("send this enquiry"),
    }));
  deliver(app, mails);
}

type PaymentNotice = {
  application: { reference: string; type: string; fullName: string; email: string };
  amount: number;
  remaining: number;
  transactionId: string;
  receiptUrl: string;
  // How the customer paid: bKash, Nagad, or the way staff recorded.
  method: string;
};
// "bKash or Nagad": the providers a customer can pay with right now.
const onlineNames = (app: FastifyInstance) =>
  providerKeys.filter((provider) => app.gateways[provider].configured).map((provider) => providers[provider].name).join(" or ");
const money = (amount: number) => `BDT ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)}`;

// A payment the provider has confirmed: the team is told, and the payer is
// sent their receipt link.
export function notifyPayment(app: FastifyInstance, notice: PaymentNotice) {
  const { application, amount, remaining, method } = notice;
  const balance: Row = remaining > 0 ? ["Still due", money(remaining)] : ["Balance", "Fully paid"];
  const mails = teamAddresses().map((to) => brandedMail(to, `Payment received for ${application.reference}: ${money(amount)}`, {
    heading: "Payment received",
    paragraphs: [`A ${method} payment was received on the Bengal Port website.`],
    details: [["Reference", application.reference], ["Applicant", application.fullName], ["Division", application.type], ["Amount", money(amount)], [`${method} transaction`, notice.transactionId], balance],
    action: { label: "Open payments", url: adminUrl("payments") },
  }));
  mails.push(brandedMail(application.email, `Payment received | Bengal Port ${application.reference}`, {
    heading: "Payment received",
    paragraphs: ["Hello,", `We have received your ${method} payment of ${money(amount)} for application ${application.reference}.`],
    details: [["Reference", application.reference], ["Amount paid", money(amount)], [`${method} transaction`, notice.transactionId], balance],
    action: { label: "View your receipt", url: notice.receiptUrl },
    note: notYou("make this payment"),
  }));
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
  deliver(app, [brandedMail(application.email, `${notice.subject} | Bengal Port ${application.reference}`, {
    heading: notice.subject,
    paragraphs: ["Hello,", `This is an update on your Bengal Port application ${application.reference}.`, ...notice.lines],
    ...(application.userId ? { action: { label: "View your application", url: `${siteUrl()}/dashboard` } } : {}),
  })]);
}

// Staff have set what an application costs. The link is offered only while
// the site can actually take a payment.
export function notifyAmountDue(app: FastifyInstance, application: ApplicantRecord, amounts: { amountDue: number; remaining: number }) {
  const { amountDue, remaining } = amounts;
  const payOnline = onlineNames(app);
  deliver(app, [brandedMail(application.email, `Amount due for your application | Bengal Port ${application.reference}`, {
    heading: "Amount due for your application",
    paragraphs: [
      "Hello,",
      `The amount due for your Bengal Port application ${application.reference} is ${money(amountDue)}.${remaining < amountDue ? ` After the payments we have received, ${money(remaining)} is still due.` : ""}`,
      payOnline ? `You can pay online with ${payOnline}, in full or in part.` : "Our team will contact you about how to pay.",
    ],
    highlight: { label: remaining < amountDue ? "Still due" : "Amount due", value: money(remaining) },
    ...(payOnline ? { action: { label: "Pay now", url: `${siteUrl()}/pay?ref=${application.reference}` } } : {}),
    note: "If you have a question about this amount, please contact us and quote your reference number.",
  })]);
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
  const trace: Row[] = notice.transactionId ? [[`${method} refund transaction`, notice.transactionId]] : [];
  const mails = teamAddresses().map((to) => brandedMail(to, `Refund made for ${application.reference}: ${money(amount)}`, {
    heading: "Refund made",
    paragraphs: ["A refund was recorded on the Bengal Port website."],
    details: [["Reference", application.reference], ["Applicant", application.fullName], ["Amount", money(amount)], ["Returned by", method], ...trace],
    action: { label: "Open payments", url: adminUrl("payments") },
  }));
  mails.push(brandedMail(application.email, `Refund made | Bengal Port ${application.reference}`, {
    heading: "Your refund has been made",
    paragraphs: ["Hello,", `We have refunded ${money(amount)} of your payment for application ${application.reference}${method === "bKash" || method === "Nagad" ? ` to the ${method} wallet it was paid from` : ` by ${method.toLowerCase()}`}.`],
    details: [["Reference", application.reference], ["Amount refunded", money(amount)], ...trace],
    note: "If you have a question about this refund, please contact us and quote your reference number.",
  }));
  deliver(app, mails);
}

export function notifyNewApplication(app: FastifyInstance, application: ApplicationRecord) {
  const mails = teamAddresses().map((to) => brandedMail(to, `New ${application.type.toLowerCase()} application ${application.reference}`, {
    heading: "New application",
    paragraphs: ["A new application was submitted on the Bengal Port website."],
    details: [["Reference", application.reference], ["Applicant", application.fullName], ["Phone", application.phone], ["Email", application.email], ["Division", application.type]],
    action: { label: "Read the application", url: adminUrl("applications") },
  }));
  mails.push(brandedMail(application.email, `Your Bengal Port application ${application.reference}`, {
    heading: "We received your application",
    paragraphs: ["Hello,", "We have received your application. Our team will review it and contact you."],
    highlight: { label: "Your reference number", value: application.reference },
    note: `Keep this reference for future communication with Bengal Port. ${notYou("submit this application")}`,
  }));
  deliver(app, mails);
}

type ReviewRecord = { division: string; name: string; rating: number; body: string; reference: string; customer: string };

// A review waits for approval, so the team is told it has arrived.
export function notifyNewReview(app: FastifyInstance, review: ReviewRecord) {
  deliver(app, teamAddresses().map((to) => brandedMail(to, `New ${review.division.toLowerCase()} review from ${oneLine(review.customer)}`, {
    heading: "New review to approve",
    paragraphs: ["A customer wrote a review on the Bengal Port website. It is not shown until you approve it."],
    details: [["Application", review.reference], ["Customer", review.customer], ["Name to show", review.name], ["Rating", `${review.rating} out of 5`]],
    quote: { label: "Review", text: review.body },
    action: { label: "Approve or hide it", url: adminUrl("reviews") },
  })));
}
