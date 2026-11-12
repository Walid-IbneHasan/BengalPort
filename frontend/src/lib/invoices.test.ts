import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  bdt,
  blankDraft,
  customerCodeText,
  dayInput,
  dealNumberOf,
  draftForCustomer,
  draftFromApplication,
  draftFromEntry,
  draftFromInvoice,
  invoiceActions,
  invoiceBody,
  invoiceListQuery,
  invoiceMoney,
  invoiceProblem,
  invoicesForTab,
  invoiceTotals,
  latestRate,
  lineAmount,
  paymentLink,
  rateText,
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

  test("every step of an invoice's life has a name", () => {
    assert.deepEqual(
      ["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"].map(statusLabel),
      ["Draft", "Sent", "Part paid", "Paid", "Overdue", "Cancelled", "Refunded"],
    );
  });

  test("a status this screen does not know still reads as words", () => {
    assert.equal(statusLabel("ON_HOLD"), "On hold");
  });
});

describe("money in other currencies", () => {
  test("taka keeps the printed invoice's format", () => {
    assert.equal(invoiceMoney(3250.5), "৳3,250.50");
    assert.equal(invoiceMoney(3250.5, "BDT"), "৳3,250.50");
  });

  test("another currency is written with its code", () => {
    assert.equal(invoiceMoney(1000, "USD"), "USD 1,000.00");
  });

  test("a negative amount gets a proper minus sign", () => {
    assert.equal(invoiceMoney(-500), "−৳500.00");
    assert.equal(invoiceMoney(-2.5, "EUR"), "EUR −2.50");
  });

  test("nothing to show is a dash", () => {
    assert.equal(invoiceMoney(null), "—");
    assert.equal(invoiceMoney(undefined, "USD"), "—");
  });

  test("the exchange rate reads as taka for one unit", () => {
    assert.equal(rateText("USD", 121.5), "1 USD = ৳121.5");
  });

  test("the newest saved rate for the currency is used", () => {
    const rates = [
      { currency: "USD", rate: 118, date: "2026-10-01T00:00:00.000Z" },
      { currency: "EUR", rate: 130, date: "2026-11-10T00:00:00.000Z" },
      { currency: "USD", rate: 121.5, date: "2026-11-09T00:00:00.000Z" },
    ];
    assert.equal(latestRate(rates, "USD"), 121.5);
    assert.equal(latestRate(rates, "GBP"), null);
    assert.equal(latestRate(rates, "BDT"), 1);
  });
});

describe("dates and numbers", () => {
  test("a day saved as midnight in Dhaka comes back as that day", () => {
    assert.equal(dayInput("2026-11-11T18:00:00.000Z"), "2026-11-12");
    assert.equal(dayInput("2026-11-12T00:00:00.000Z"), "2026-11-12");
    assert.equal(dayInput(null), "");
  });

  test("customers and deals are numbered as the server numbers them", () => {
    assert.equal(customerCodeText(12), "C-000012");
    assert.equal(dealNumberOf(34), "D-000034");
    assert.equal(customerCodeText(null), "");
  });
});

describe("invoices in the office workflow", () => {
  const issued = {
    id: "i9",
    serial: 9,
    number: "INV-000009",
    issuedAt: "2026-11-08T00:00:00.000Z",
    dueAt: null,
    customerName: "Karim Traders",
    customerPhone: "01711000000",
    customerEmail: null,
    customerAddress: "Chattogram",
    items: [{ description: "Sourcing", quantity: 1, unitPrice: 1200 }],
    total: 1200,
    paid: 200,
    due: 900,
    status: "PARTIAL" as const,
    notes: null,
    applicationId: null,
    transactionId: null,
    state: "ISSUED" as const,
    credited: 100,
    currency: "USD",
    exchangeRate: 121.5,
    version: 2,
    terms: "Refunds within 7 days",
    companyCommitments: "Find three factories",
    clientCommitments: "Send samples",
    startDate: "2026-11-11T18:00:00.000Z",
    endDate: "2026-12-31T00:00:00.000Z",
    customer: { id: "c1", code: 12, name: "Karim Traders" },
    deal: { id: "d1", number: 34, title: "Garments sourcing" },
  };

  test("an issued invoice opens with its currency, timeline, commitments and version", () => {
    const draft = draftFromInvoice(issued);
    assert.equal(draft.state, "ISSUED");
    assert.equal(draft.version, 2);
    assert.equal(draft.number, "INV-000009");
    assert.equal(draft.currency, "USD");
    assert.equal(draft.exchangeRate, "121.5");
    assert.equal(draft.startDate, "2026-11-12");
    assert.equal(draft.endDate, "2026-12-31");
    assert.equal(draft.terms, "Refunds within 7 days");
    assert.equal(draft.companyCommitments, "Find three factories");
    assert.equal(draft.clientCommitments, "Send samples");
    assert.equal(draft.credited, 100);
    assert.equal(draft.dealId, "d1");
    assert.deepEqual(draft.deal, { id: "d1", number: 34, title: "Garments sourcing" });
    assert.equal(draft.customer?.id, "c1");
    assert.equal(draft.customer?.customerCode, "C-000012");
  });

  test("an older invoice without the office fields opens as a taka draft", () => {
    const draft = draftFromInvoice({
      id: "i1",
      issuedAt: "2026-11-08T00:00:00.000Z",
      dueAt: null,
      customerName: "Rahim",
      customerPhone: null,
      customerEmail: null,
      customerAddress: null,
      items: [{ description: "Visa", quantity: 1, unitPrice: 100 }],
      paid: 0,
      notes: null,
      applicationId: null,
      transactionId: null,
    });
    assert.equal(draft.currency, "BDT");
    assert.equal(draft.state, "DRAFT");
    assert.equal(draft.customer, null);
    assert.equal(draft.terms, "");
  });

  test("the customer, deal, currency and timeline go to the server", () => {
    const body = invoiceBody(draftFromInvoice(issued));
    assert.equal(body.customerId, "c1");
    assert.equal(body.dealId, "d1");
    assert.equal(body.currency, "USD");
    assert.equal(body.exchangeRate, 121.5);
    assert.equal(body.startDate, "2026-11-12");
    assert.equal(body.endDate, "2026-12-31");
    assert.equal(body.terms, "Refunds within 7 days");
  });

  test("taka is always at a rate of 1", () => {
    const body = invoiceBody({ ...ready(), currency: "BDT", exchangeRate: "99" });
    assert.equal(body.exchangeRate, 1);
    assert.equal(body.customerId, null);
    assert.equal(body.startDate, null);
    assert.equal(body.companyCommitments, null);
  });

  test("an invoice in another currency needs its exchange rate", () => {
    assert.match(invoiceProblem({ ...ready(), currency: "USD", exchangeRate: "" }), /exchange rate/i);
    assert.equal(invoiceProblem({ ...ready(), currency: "USD", exchangeRate: "121.5" }), "");
  });

  test("credit notes lower what is due", () => {
    assert.deepEqual(invoiceTotals([{ description: "A", quantity: "1", unitPrice: "1200" }], "200", 100), { total: 1200, paid: 200, due: 900 });
  });

  test("a new invoice for a customer carries their details, still editable", () => {
    const draft = draftForCustomer({ id: "c1", customerCode: "C-000012", name: "Karim Traders", phone: "01711000000", email: null, address: "Chattogram" }, "2026-11-12");
    assert.equal(draft.customer?.id, "c1");
    assert.equal(draft.customerName, "Karim Traders");
    assert.equal(draft.customerPhone, "01711000000");
    assert.equal(draft.customerEmail, "");
    assert.equal(draft.customerAddress, "Chattogram");
    assert.equal(draft.issuedAt, "2026-11-12");
    assert.equal(draft.paid, "0");
  });

  test("a blank invoice is in taka with no terms yet", () => {
    const draft = blankDraft("2026-11-12");
    assert.equal(draft.currency, "BDT");
    assert.equal(draft.terms, "");
    assert.equal(draft.dealId, null);
  });
});

describe("the invoice list's tabs", () => {
  test("drafts and cancelled invoices are asked for by state, a page at a time", () => {
    assert.equal(invoiceListQuery("drafts", { page: 2 }), "/admin/invoices?page=2&pageSize=25&state=DRAFT");
    assert.equal(invoiceListQuery("cancelled"), "/admin/invoices?page=1&pageSize=25&state=CANCELLED");
  });

  test("worked-out statuses ask for many issued invoices to pick from", () => {
    assert.equal(invoiceListQuery("overdue"), "/admin/invoices?page=1&pageSize=100&state=ISSUED");
  });

  test("the search and the customer go along", () => {
    assert.equal(invoiceListQuery("all", { search: " INV-12 ", customerId: "c1" }), "/admin/invoices?page=1&pageSize=25&search=INV-12&customerId=c1");
  });

  test("a worked-out tab keeps only its own status", () => {
    const rows = [{ status: "SENT" }, { status: "OVERDUE" }, { status: "PAID" }];
    assert.deepEqual(invoicesForTab("overdue", rows), [{ status: "OVERDUE" }]);
    assert.equal(invoicesForTab("all", rows).length, 3);
  });
});

describe("what staff may do with an invoice", () => {
  const everything = () => true;
  const only = (...list: string[]) => (permission: string) => list.includes(permission);
  const issuedInvoice = { state: "ISSUED" as const, due: 500, version: 1, customer: { id: "c1" } };

  test("a draft is edited, issued or withdrawn; only the Super Admin deletes it", () => {
    const draft = { state: "DRAFT" as const, due: 500, version: 1 };
    assert.deepEqual(invoiceActions(draft, only("invoices.update", "invoices.cancel"), "MANAGER"), ["edit", "issue", "cancel"]);
    assert.ok(invoiceActions(draft, everything, "ADMIN").includes("delete"));
    assert.ok(!invoiceActions(draft, only("invoices.update"), "MANAGER").includes("delete"));
  });

  test("an issued invoice is revised, paid, credited, cancelled or shared, never edited", () => {
    const actions = invoiceActions(issuedInvoice, everything, "ADMIN");
    assert.deepEqual(actions, ["revise", "payment", "credit", "cancel", "share"]);
  });

  test("a payment needs a customer from the customer list", () => {
    assert.ok(!invoiceActions({ ...issuedInvoice, customer: null }, everything, "ADMIN").includes("payment"));
  });

  test("nothing is left to pay or credit on a paid invoice", () => {
    const actions = invoiceActions({ ...issuedInvoice, due: 0 }, everything, "ADMIN");
    assert.ok(!actions.includes("payment"));
    assert.ok(!actions.includes("credit"));
  });

  test("a cancelled invoice only shows its history", () => {
    assert.deepEqual(invoiceActions({ state: "CANCELLED", due: 0, version: 3 }, everything, "ADMIN"), ["history"]);
  });

  test("someone who may only read invoices gets no actions", () => {
    assert.deepEqual(invoiceActions(issuedInvoice, only("invoices.read"), "EMPLOYEE"), []);
  });

  test("a payment is recorded under Collections for the invoice's customer", () => {
    assert.equal(paymentLink({ id: "i9", customer: { id: "c1" } }), "/admin/collections?new=1&customer=c1&invoice=i9");
  });
});
