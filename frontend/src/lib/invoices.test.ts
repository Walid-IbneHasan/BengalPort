import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  bdt,
  blankDraft,
  draftFromApplication,
  draftFromEntry,
  draftFromInvoice,
  invoiceBody,
  invoiceProblem,
  invoiceTotals,
  lineAmount,
  statusLabel,
} from "./invoices";

const ready = () => ({
  ...blankDraft("2026-11-08"),
  customerName: "Rahim Uddin",
  items: [{ description: "Visa processing", quantity: "2", unitPrice: "1500" }],
  paid: "1000",
});

describe("the sums on an invoice", () => {
  test("a line is its quantity times its unit price, to the paisa", () => {
    assert.equal(lineAmount({ description: "A", quantity: "3", unitPrice: "33.33" }), 99.99);
  });

  test("a line not filled in yet counts for nothing", () => {
    assert.equal(lineAmount({ description: "A", quantity: "", unitPrice: "100" }), 0);
  });

  test("the total, paid and due are worked out from the lines", () => {
    assert.deepEqual(
      invoiceTotals(
        [
          { description: "A", quantity: "2", unitPrice: "1500" },
          { description: "B", quantity: "1", unitPrice: "250.5" },
        ],
        "1000",
      ),
      { total: 3250.5, paid: 1000, due: 2250.5 },
    );
  });

  test("nothing is shown as due when more than the total was entered as paid", () => {
    const totals = invoiceTotals([{ description: "A", quantity: "1", unitPrice: "100" }], "150");
    assert.equal(totals.due, 0);
  });
});

describe("starting an invoice", () => {
  test("a blank invoice is dated the day given and has one empty line", () => {
    const draft = blankDraft("2026-11-08");
    assert.equal(draft.issuedAt, "2026-11-08");
    assert.equal(draft.items.length, 1);
    assert.equal(draft.items[0].quantity, "1");
  });

  test("a ledger entry with a quantity keeps its quantity and price", () => {
    const draft = draftFromEntry({
      id: "e1",
      date: "2026-11-08T06:30:00.000Z",
      description: "Consultation fee",
      customer: "Karim",
      notes: "Cash",
      quantity: 2,
      unitPrice: 500,
      total: 1000,
    });
    assert.equal(draft.transactionId, "e1");
    assert.equal(draft.customerName, "Karim");
    assert.equal(draft.notes, "Cash");
    assert.deepEqual(draft.items, [{ description: "Consultation fee", quantity: "2", unitPrice: "500" }]);
  });

  test("a ledger entry entered as a direct total becomes a single unit", () => {
    const draft = draftFromEntry({ id: "e2", date: "2026-11-08T06:30:00.000Z", description: "Fee", total: 750 });
    assert.deepEqual(draft.items, [{ description: "Fee", quantity: "1", unitPrice: "750" }]);
  });

  test("money in the ledger counts as already paid", () => {
    const draft = draftFromEntry({ id: "e3", date: "2026-11-08T06:30:00.000Z", description: "Fee", total: 750 });
    assert.equal(draft.paid, "750");
  });

  test("an application brings its applicant, its cost and what they have paid", () => {
    const draft = draftFromApplication(
      { id: "a1", reference: "BP-22UM52DZ", type: "EDUCATION", fullName: "Sadia Rahman", phone: "01711000000", email: "sadia@example.test" },
      { amountDue: 40000, paid: 15000 },
      "2026-11-08",
    );
    assert.equal(draft.applicationId, "a1");
    assert.equal(draft.customerName, "Sadia Rahman");
    assert.equal(draft.customerPhone, "01711000000");
    assert.equal(draft.customerEmail, "sadia@example.test");
    assert.equal(draft.paid, "15000");
    assert.deepEqual(draft.items, [{ description: "Education application BP-22UM52DZ", quantity: "1", unitPrice: "40000" }]);
  });

  test("an application whose cost is not set leaves the price for staff to enter", () => {
    const draft = draftFromApplication(
      { id: "a2", reference: "BP-X", type: "UMRAH", fullName: "Sadia", phone: "017", email: "s@example.test" },
      { amountDue: null, paid: 0 },
      "2026-11-08",
    );
    assert.equal(draft.items[0].unitPrice, "");
    assert.equal(draft.paid, "0");
  });

  test("an existing invoice opens for correction with its own values", () => {
    const draft = draftFromInvoice({
      id: "i1",
      issuedAt: "2026-11-08T00:00:00.000Z",
      dueAt: "2026-12-01T00:00:00.000Z",
      customerName: "Rahim",
      customerPhone: null,
      customerEmail: null,
      customerAddress: "Dhaka",
      items: [{ description: "Visa", quantity: 2, unitPrice: 1500 }],
      paid: 1000,
      notes: null,
      applicationId: null,
      transactionId: null,
    });
    assert.equal(draft.id, "i1");
    assert.equal(draft.issuedAt, "2026-11-08");
    assert.equal(draft.dueAt, "2026-12-01");
    assert.equal(draft.customerPhone, "");
    assert.deepEqual(draft.items, [{ description: "Visa", quantity: "2", unitPrice: "1500" }]);
    assert.equal(draft.paid, "1000");
  });
});

describe("checking an invoice before saving", () => {
  test("a complete invoice has no problem", () => {
    assert.equal(invoiceProblem(ready()), "");
  });

  test("it needs a customer", () => {
    assert.match(invoiceProblem({ ...ready(), customerName: " " }), /customer/i);
  });

  test("it needs a date", () => {
    assert.match(invoiceProblem({ ...ready(), issuedAt: "" }), /date/i);
  });

  test("every line needs a description", () => {
    assert.match(
      invoiceProblem({ ...ready(), items: [{ description: " ", quantity: "1", unitPrice: "100" }] }),
      /describe/i,
    );
  });

  test("every line needs a quantity above zero", () => {
    assert.match(
      invoiceProblem({ ...ready(), items: [{ description: "Visa", quantity: "0", unitPrice: "100" }] }),
      /quantity/i,
    );
  });

  test("the total must be above zero", () => {
    assert.match(
      invoiceProblem({ ...ready(), items: [{ description: "Visa", quantity: "1", unitPrice: "0" }], paid: "0" }),
      /more than/i,
    );
  });

  test("the amount paid cannot be above the total", () => {
    assert.match(invoiceProblem({ ...ready(), paid: "3000.01" }), /more than the total/i);
  });
});

describe("sending an invoice to the server", () => {
  test("amounts are numbers and empty optional fields are left out as nothing", () => {
    const body = invoiceBody(ready());
    assert.equal(body.paid, 1000);
    assert.deepEqual(body.items, [{ description: "Visa processing", quantity: 2, unitPrice: 1500 }]);
    assert.equal(body.dueAt, null);
    assert.equal(body.customerPhone, null);
    assert.equal(body.applicationId, null);
  });

  test("a blank amount paid is nothing paid", () => {
    assert.equal(invoiceBody({ ...ready(), paid: "" }).paid, 0);
  });
});

describe("writing money on an invoice", () => {
  test("amounts always show two decimals and a thousands separator", () => {
    assert.equal(bdt(3250.5), "৳3,250.50");
    assert.equal(bdt(0), "৳0.00");
  });
});

describe("naming an invoice's state", () => {
  test("each state reads in plain words", () => {
    assert.equal(statusLabel("PAID"), "Paid");
    assert.equal(statusLabel("PARTIALLY_PAID"), "Partly paid");
    assert.equal(statusLabel("DUE"), "Due");
  });
});
