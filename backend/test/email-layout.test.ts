import { describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";

process.env.FRONTEND_URL = "https://www.bengalport.com,https://bengalport.com";
process.env.EMAIL_FROM = "Bengal Port <info@bengalport.com>";
process.env.ADMIN_NOTIFY_EMAIL = "team@example.test";

const { brandedMail, createMailer, sendAccountCreated, sendAuthCode } = await import("../src/lib/email.js");
const notifications = await import("../src/lib/notifications.js");

type Sent = { to: string; subject: string; text: string; html: string; attachments?: { cid: string; content: Buffer; contentType: string }[] };
const collector = () => {
  const sent: Sent[] = [];
  return { sent, mailer: { configured: true, async send(mail: Sent) { sent.push(mail); } } };
};
const sample = (overrides = {}) => brandedMail("a@example.test", "Subject", { heading: "A heading", paragraphs: ["First paragraph."], ...overrides }) as Sent;

describe("the look of every email", () => {
  test("the logo travels inside the email, so it shows without loading anything", () => {
    const mail = sample();
    const logo = mail.attachments![0];
    assert.equal(logo.contentType, "image/png");
    assert.ok(logo.content.length > 1000);
    assert.equal(logo.content.subarray(1, 4).toString(), "PNG");
    assert.match(mail.html, new RegExp(`src="cid:${logo.cid}"`));
  });

  test("the logo has a description for mail apps that hide images", () => {
    assert.match(sample().html, /alt="Bengal Port"/);
  });

  test("the company name and tagline head the message", () => {
    const { html } = sample();
    assert.match(html, /BENGAL PORT/);
    assert.match(html, /Connecting Bengal to the World/);
  });

  test("the footer gives the website and contact address", () => {
    const { html } = sample();
    assert.match(html, /href="https:\/\/www\.bengalport\.com"/);
    assert.match(html, /info@bengalport\.com/);
  });

  test("the heading and paragraphs appear", () => {
    const { html } = sample();
    assert.match(html, /A heading/);
    assert.match(html, /First paragraph\./);
  });

  test("a line break inside a paragraph is kept", () => {
    assert.match(sample({ paragraphs: ["One\nTwo"] }).html, /One<br>Two/);
  });

  test("a button links to its address", () => {
    const { html } = sample({ action: { label: "Open it", url: "https://www.bengalport.com/a?b=1&c=2" } });
    assert.match(html, /href="https:\/\/www\.bengalport\.com\/a\?b=1&amp;c=2"/);
    assert.match(html, />Open it</);
  });

  test("nothing a person typed can become part of the page", () => {
    const hostile = '<img src=x onerror="alert(1)">';
    const { html } = sample({
      heading: hostile,
      paragraphs: [hostile],
      highlight: { label: hostile, value: hostile },
      details: [[hostile, hostile]],
      quote: { label: hostile, text: hostile },
      note: hostile,
    });
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /&lt;img src=x/);
  });

  test("the plain-text copy holds everything, with no markup", () => {
    const { text } = sample({
      highlight: { label: "Code", value: "123456" },
      details: [["Reference", "BP-1"]],
      quote: { label: "Message", text: "Hello there" },
      action: { label: "Open it", url: "https://www.bengalport.com/x" },
      note: "Small print.",
    });
    for (const part of ["First paragraph.", "Code: 123456", "Reference: BP-1", "Message:\nHello there", "Open it: https://www.bengalport.com/x", "Small print."]) assert.ok(text.includes(part), part);
    assert.doesNotMatch(text, /<[a-z]/i);
  });

  test("the mail server is handed the logo with the message", async () => {
    let handed: any = null;
    const replaced = mock.method(nodemailer, "createTransport", () => ({ sendMail: async (mail: unknown) => { handed = mail; } }) as any);
    await createMailer({ SMTP_HOST: "mail.example.test", SMTP_USER: "u", SMTP_PASS: "p" } as any).send(sample() as any);
    replaced.mock.restore();
    assert.equal(handed.attachments[0].contentType, "image/png");
  });
});

describe("sign-in codes", () => {
  for (const [purpose, heading] of [["VERIFY_EMAIL", /Verify your email/], ["LOGIN_2FA", /sign-in code/i], ["RESET_PASSWORD", /Reset your password/]] as const)
    test(`${purpose} is branded and shows the code`, async () => {
      const { sent, mailer } = collector();
      await sendAuthCode(mailer as any, "a@example.test", "123456", purpose);
      assert.match(sent[0].html, heading);
      assert.match(sent[0].html, /123456/);
      assert.match(sent[0].text, /123456/);
      assert.ok(sent[0].attachments?.length);
    });
});

describe("a new account", () => {
  const send = async () => {
    const { sent, mailer } = collector();
    await sendAccountCreated(mailer as any, { to: "a@example.test", name: "Karim", password: "TempPass2345abcd" });
    return sent[0];
  };

  test("gives the temporary password in both versions", async () => {
    const mail = await send();
    assert.match(mail.html, /TempPass2345abcd/);
    assert.match(mail.text, /Temporary password: TempPass2345abcd/);
  });

  test("links to the sign-in page", async () => {
    assert.match((await send()).html, /href="https:\/\/www\.bengalport\.com\/login"/);
  });

  test("says the password must be changed", async () => {
    assert.match((await send()).text, /choose a new password/i);
  });

  test("greets the person by name and carries the logo", async () => {
    const mail = await send();
    assert.match(mail.html, /Hello Karim/);
    assert.ok(mail.attachments?.length);
  });
});

describe("every notification", () => {
  test("uses the branded layout", async () => {
    const { sent, mailer } = collector();
    const app = { mailer, log: { error() {} }, gateways: { bkash: { configured: true }, nagad: { configured: false } } } as any;
    const application = { reference: "BP-1", type: "UMRAH", fullName: "Karim", phone: "01711000000", email: "k@example.test", userId: "u1" };
    notifications.notifyNewEnquiry(app, { type: "GENERAL", name: "Karim", phone: "017", email: "k@example.test", message: "Hello", details: { subject: "Visa" } });
    notifications.notifyPayment(app, { application, amount: 100, remaining: 50, transactionId: "T1", receiptUrl: "https://www.bengalport.com/receipt/1", method: "bKash" });
    notifications.notifyApplicationStatus(app, application, "APPROVED");
    notifications.notifyAmountDue(app, application, { amountDue: 100, remaining: 100 });
    notifications.notifyRefund(app, { application, amount: 10, method: "Cash", transactionId: null });
    notifications.notifyNewApplication(app, application);
    notifications.notifyNewReview(app, { division: "UMRAH", name: "Karim", rating: 5, body: "Great", reference: "BP-1", customer: "Karim" });
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(sent.length >= 11, `${sent.length} emails`);
    for (const mail of sent) {
      assert.match(mail.html, /cid:/, mail.subject);
      assert.match(mail.html, /BENGAL PORT/, mail.subject);
      assert.ok(mail.attachments?.length, mail.subject);
    }
  });

  test("a message from a visitor is shown quoted, and safely", async () => {
    const { sent, mailer } = collector();
    const app = { mailer, log: { error() {} }, gateways: {} } as any;
    notifications.notifyNewEnquiry(app, { type: "GENERAL", name: "Karim", phone: "017", email: null, message: '<img src=x onerror="alert(1)">', details: null });
    await new Promise((resolve) => setImmediate(resolve));
    assert.doesNotMatch(sent[0].html, /<img src=x/);
  });

  test("a confirmation to a visitor repeats nothing they typed", async () => {
    const { sent, mailer } = collector();
    const app = { mailer, log: { error() {} }, gateways: {} } as any;
    notifications.notifyNewEnquiry(app, { type: "GENERAL", name: "Visit evil dot example", phone: "017", email: "k@example.test", message: "Buy now", details: null });
    await new Promise((resolve) => setImmediate(resolve));
    const confirmation = sent.find((mail) => mail.to === "k@example.test")!;
    assert.doesNotMatch(confirmation.html + confirmation.text, /evil dot example|Buy now/);
  });
});
