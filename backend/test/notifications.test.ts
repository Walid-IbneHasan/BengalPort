// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Mail, Mailer } from "../src/lib/email.js";

process.env.LOG_LEVEL = "silent";
process.env.ADMIN_NOTIFY_EMAIL = "";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { sendAuthCode } = await import("../src/lib/email.js");
const { applicationForms } = await import(
  "../../frontend/src/lib/application-forms.js"
);

const adminEmail = "bookings@example.test";
const visitorEmail = "visitor@example.test";
const createdEnquiries: string[] = [];
const createdApplications: string[] = [];

after(async () => {
  await prisma.enquiry.deleteMany({ where: { id: { in: createdEnquiries } } });
  await prisma.application.deleteMany({
    where: { id: { in: createdApplications } },
  });
  await prisma.$disconnect();
});

function fakeMailer(options: { configured?: boolean; failing?: boolean } = {}) {
  const sent: Mail[] = [];
  const mailer: Mailer = {
    configured: options.configured ?? true,
    async send(mail) {
      if (options.failing) throw new Error("SMTP connection refused");
      sent.push(mail);
    },
  };
  return { sent, mailer };
}

const enquiry = (overrides: Record<string, unknown> = {}) => ({
  type: "UMRAH",
  name: "Nadia Rahman",
  phone: "01711000000",
  email: visitorEmail,
  message: "We are four travellers looking at December.",
  details: { subject: "Family Umrah" },
  ...overrides,
});

// What the website sends when every required question has been answered.
function completedForm(division: "BUSINESS" | "EDUCATION" | "HEALTHCARE") {
  const details: Record<string, unknown> = {};
  for (const field of applicationForms[division].steps.flatMap(
    (step) => step.fields,
  )) {
    if (!field.required && field.type !== "checkbox") continue;
    details[field.key] =
      field.type === "multi"
        ? [field.options![0]]
        : field.type === "checkbox"
          ? true
          : field.type === "select"
            ? field.options![0]
            : field.type === "email"
              ? visitorEmail
              : field.type === "tel"
                ? "01711000000"
                : field.type === "date"
                  ? "2027-01-15"
                  : field.type === "number"
                    ? "2"
                    : "Test answer";
  }
  return {
    type: division,
    fullName: details.fullName,
    email: details.email,
    phone: details.phone,
    details,
  };
}

async function submit(
  url: "/api/enquiries" | "/api/applications",
  payload: Record<string, unknown>,
  options: Parameters<typeof fakeMailer>[0] & { notify?: string } = {},
) {
  process.env.ADMIN_NOTIFY_EMAIL = options.notify ?? adminEmail;
  const { sent, mailer } = fakeMailer(options);
  const app = await buildApp({ mailer });
  try {
    const res = await app.inject({ method: "POST", url, payload });
    const id = res.json().data?.id;
    if (id)
      (url === "/api/enquiries" ? createdEnquiries : createdApplications).push(
        id,
      );
    return { res, sent };
  } finally {
    await app.close();
  }
}
const mailTo = (sent: Mail[], address: string) =>
  sent.find((mail) => mail.to === address);

describe("the website's application forms", () => {
  for (const division of ["BUSINESS", "EDUCATION", "HEALTHCARE"] as const)
    test(`a completed ${division} form is accepted`, async () => {
      const { res } = await submit("/api/applications", completedForm(division));
      assert.equal(res.statusCode, 201);
      assert.match(res.json().data.reference, /^BP-/);
    });

  test("applications submitted at the same instant get different references", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: new Date("2027-01-15T10:00:00Z") });
    const first = await submit("/api/applications", completedForm("BUSINESS"));
    const second = await submit("/api/applications", completedForm("BUSINESS"));
    assert.equal(second.res.statusCode, 201);
    assert.notEqual(
      first.res.json().data.reference,
      second.res.json().data.reference,
    );
  });
});

describe("sign-in code emails", () => {
  test("the member's name is escaped in the HTML email", async () => {
    const { sent, mailer } = fakeMailer();
    await sendAuthCode(mailer, "member@example.test", "<script>x</script>", "123456", "VERIFY_EMAIL");
    assert.equal(sent.length, 1);
    assert.doesNotMatch(sent[0].html, /<script>/);
  });
});

describe("emails after a new enquiry", () => {
  test("the team is told who enquired and what they asked", async () => {
    const { sent } = await submit("/api/enquiries", enquiry());
    const mail = mailTo(sent, adminEmail);
    assert.ok(mail, "no email was sent to the admin address");
    assert.match(mail.subject, /Nadia Rahman/);
    assert.match(mail.text, /01711000000/);
    assert.match(mail.text, /We are four travellers looking at December\./);
    assert.match(mail.text, /Family Umrah/);
  });

  test("every address in ADMIN_NOTIFY_EMAIL receives it", async () => {
    const { sent } = await submit("/api/enquiries", enquiry(), {
      notify: "bookings@example.test, owner@example.test",
    });
    assert.ok(mailTo(sent, "bookings@example.test"));
    assert.ok(mailTo(sent, "owner@example.test"));
  });

  test("the visitor gets a confirmation at the email they gave", async () => {
    const { sent } = await submit("/api/enquiries", enquiry());
    assert.ok(mailTo(sent, visitorEmail), "no confirmation was sent");
  });

  // Anyone can type any address into the form, so the confirmation must not
  // carry text of their choosing to it.
  test("the confirmation repeats nothing the visitor typed", async () => {
    const { sent } = await submit("/api/enquiries", enquiry());
    const mail = mailTo(sent, visitorEmail)!;
    assert.doesNotMatch(mail.text + mail.subject, /four travellers|Nadia|Family Umrah/);
  });

  test("a visitor who gave no email only triggers the team email", async () => {
    const { sent } = await submit("/api/enquiries", enquiry({ email: "" }));
    assert.deepEqual(
      sent.map((mail) => mail.to),
      [adminEmail],
    );
  });

  test("text typed by the visitor is escaped in the HTML email", async () => {
    const { sent } = await submit(
      "/api/enquiries",
      enquiry({ message: 'Hello <img src=x onerror="alert(1)">' }),
    );
    const html = mailTo(sent, adminEmail)!.html;
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&lt;img/);
  });

  test("without ADMIN_NOTIFY_EMAIL only the visitor is emailed", async () => {
    const { sent } = await submit("/api/enquiries", enquiry(), { notify: "" });
    assert.deepEqual(
      sent.map((mail) => mail.to),
      [visitorEmail],
    );
  });
});

describe("emails after a new application", () => {
  test("the team is sent the reference and applicant", async () => {
    const { res, sent } = await submit(
      "/api/applications",
      completedForm("EDUCATION"),
    );
    const mail = mailTo(sent, adminEmail);
    assert.ok(mail, "no email was sent to the admin address");
    assert.match(mail.subject, new RegExp(res.json().data.reference));
    assert.match(mail.text, /Test answer/);
    assert.match(mail.text, /EDUCATION/i);
  });

  test("the applicant is sent their reference number", async () => {
    const { res, sent } = await submit(
      "/api/applications",
      completedForm("HEALTHCARE"),
    );
    const mail = mailTo(sent, visitorEmail);
    assert.ok(mail, "no confirmation was sent to the applicant");
    assert.match(mail.text, new RegExp(res.json().data.reference));
  });
});

describe("when email cannot be sent", () => {
  test("an enquiry is still saved if the mail server fails", async () => {
    const { res } = await submit("/api/enquiries", enquiry(), {
      failing: true,
    });
    assert.equal(res.statusCode, 201);
  });

  test("nothing is sent while email delivery is not configured", async () => {
    const { res, sent } = await submit("/api/enquiries", enquiry(), {
      configured: false,
    });
    assert.equal(res.statusCode, 201);
    assert.equal(sent.length, 0);
  });
});
