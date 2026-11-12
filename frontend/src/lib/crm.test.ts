import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { blankCustomer, customerBody, dayTime, draftFromCustomer, followUpState, invoiceCounts, paymentCounts, plural, telLink, totalsByCurrency, whatsappLink, type Customer } from "./crm.js";

const customer: Customer = {
  id: "c1",
  code: 12,
  customerCode: "C-000012",
  name: "Rahima Begum",
  phone: "01712-345678",
  whatsapp: "+8801712345678",
  email: "rahima@example.com",
  address: "Khulna",
  category: "Education",
  leadSource: "Facebook",
  status: "ACTIVE",
  notes: null,
  nextFollowUpAt: "2026-11-19T18:00:00.000Z",
  passportNumber: "Hidden",
  passportCountry: null,
  passportExpiry: null,
  assignedToId: "u1",
  branchId: "b1",
  userId: "w1",
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

describe("customer form", () => {
  test("a record fills the form, and the same WhatsApp number ticks the box", () => {
    const draft = draftFromCustomer(customer);
    assert.equal(draft.sameWhatsapp, true);
    assert.equal(draft.whatsapp, "");
    assert.equal(draft.nextFollowUpAt, "2026-11-20");
    assert.equal(draft.assignedToId, "u1");
    assert.equal(draft.passportNumber, "", "the server's 'Hidden' is never put in the box");
    assert.equal(draftFromCustomer({ ...customer, whatsapp: "01811111111" }).whatsapp, "01811111111");
    assert.equal(draftFromCustomer({ ...customer, whatsapp: null }).sameWhatsapp, false);
  });

  test("the body carries every field, the website account and, when allowed, the passport", () => {
    const draft = { ...draftFromCustomer(customer), passportNumber: "A1234567", passportExpiry: "2030-01-31" };
    const withPassport = customerBody(draft, { passport: true });
    assert.equal(withPassport.whatsapp, "01712-345678");
    assert.equal(withPassport.userId, "w1");
    assert.equal(withPassport.passportNumber, "A1234567");
    assert.equal(withPassport.passportExpiry, "2030-01-31T00:00:00+06:00");
    assert.equal(withPassport.nextFollowUpAt, "2026-11-20T00:00:00+06:00");
    assert.equal("force" in withPassport, false);
    const without = customerBody(draft, { passport: false, force: true });
    assert.equal(without.passportNumber, null);
    assert.equal(without.passportExpiry, null);
    assert.equal(without.force, true);
    const fresh = customerBody(blankCustomer(), { passport: true });
    assert.equal(fresh.status, "LEAD");
    assert.equal(fresh.assignedToId, null);
    assert.equal(fresh.category, null);
    assert.equal(fresh.nextFollowUpAt, null);
  });
});

describe("contact links", () => {
  test("WhatsApp gets Bangladesh's country code for local numbers", () => {
    assert.equal(whatsappLink("01712-345678"), "https://wa.me/8801712345678");
    assert.equal(whatsappLink("+880 1712 345678"), "https://wa.me/8801712345678");
    assert.equal(whatsappLink("0060 12 345 6789"), "https://wa.me/60123456789");
    assert.equal(whatsappLink(""), null);
    assert.equal(whatsappLink(null), null);
  });

  test("a phone call link keeps only digits and the plus", () => {
    assert.equal(telLink("+880 1712-345678"), "tel:+8801712345678");
    assert.equal(telLink(""), null);
  });
});

describe("customer page figures", () => {
  test("follow-up dates are late, today or later", () => {
    assert.equal(followUpState("2026-11-10T18:00:00Z", "2026-11-12"), "late");
    assert.equal(followUpState("2026-11-11T18:00:00Z", "2026-11-12"), "today");
    assert.equal(followUpState("2026-11-20T18:00:00Z", "2026-11-12"), "later");
    assert.equal(followUpState(null, "2026-11-12"), "none");
  });

  test("words and times read naturally", () => {
    assert.equal(plural(1, "deal"), "1 deal");
    assert.equal(plural(3, "invoice"), "3 invoices");
    assert.equal(dayTime("2026-11-12T09:40:00Z"), "12 Nov 2026, 3:40 pm");
    assert.equal(dayTime(null), "—");
  });

  test("sums are kept apart by currency, taka first, drafts and cancelled left out", () => {
    const invoices = [
      { currency: "USD", total: 100, paid: 40, due: 60, status: "PARTIAL" },
      { currency: "BDT", total: 1000.1, paid: 0, due: 1000.1, status: "SENT" },
      { currency: "BDT", total: 500.2, paid: 500.2, due: 0, status: "PAID" },
      { currency: "BDT", total: 900, paid: 0, due: 900, status: "CANCELLED" },
    ].filter((row) => invoiceCounts(row.status));
    assert.deepEqual(totalsByCurrency(invoices, ["total", "paid", "due"]), [
      { currency: "BDT", total: 1500.3, paid: 500.2, due: 1000.1 },
      { currency: "USD", total: 100, paid: 40, due: 60 },
    ]);
    assert.deepEqual(totalsByCurrency([], ["total"]), []);
    assert.equal(paymentCounts("PAID"), true);
    assert.equal(paymentCounts("FAILED"), false);
  });
});
