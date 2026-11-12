import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  blankDeal,
  daysLeft,
  dealActions,
  dealBody,
  dealDraftFrom,
  dealFigures,
  dealItemsTotal,
  dealLineAmount,
  dealListQuery,
  timelineText,
  type Deal,
} from "./deals";

const customer = { id: "c1", customerCode: "C-000012", name: "Karim Traders" };

describe("the sums on a deal", () => {
  test("a line is its quantity times its unit price, to the paisa", () => {
    assert.equal(dealLineAmount({ quantity: "3", unitPrice: "33.33" }), 99.99);
  });

  test("the total adds the rounded lines", () => {
    assert.equal(dealItemsTotal([{ quantity: "2", unitPrice: "1500" }, { quantity: "1", unitPrice: "250.5" }, { quantity: "", unitPrice: "9" }]), 3250.5);
  });
});

describe("the deal form", () => {
  test("a new deal starts in taka with the office terms and one empty line", () => {
    const draft = blankDeal("Cancellation: in writing.", customer);
    assert.equal(draft.currency, "BDT");
    assert.equal(draft.terms, "Cancellation: in writing.");
    assert.equal(draft.items.length, 1);
    assert.equal(draft.customer?.id, "c1");
  });

  test("what is sent: numbers, Dhaka days and nothing for empty fields", () => {
    const body = dealBody({
      ...blankDeal("", customer),
      title: "  Garments sourcing ",
      items: [{ description: " Factory visits ", serviceLine: "", quantity: "2", unitPrice: "5000" }],
      startDate: "2026-11-12",
    });
    assert.equal(body.customerId, "c1");
    assert.equal(body.title, "Garments sourcing");
    assert.deepEqual(body.items, [{ description: "Factory visits", serviceLine: null, quantity: 2, unitPrice: 5000 }]);
    assert.equal(body.startDate, "2026-11-12T00:00:00+06:00");
    assert.equal(body.endDate, null);
    assert.equal(body.terms, null);
    assert.equal(body.assignedToId, null);
    assert.equal(body.branchId, null);
  });

  test("an existing deal opens with its own values", () => {
    const draft = dealDraftFrom({
      id: "d1",
      customer,
      title: "Garments sourcing",
      serviceLine: "Business",
      description: null,
      currency: "USD",
      items: [{ description: "Visits", serviceLine: "Business", quantity: 2, unitPrice: 500 }],
      startDate: "2026-11-11T18:00:00.000Z",
      endDate: null,
      companyCommitments: "Three factories",
      clientCommitments: null,
      terms: "Terms",
      assignedTo: { id: "u1", name: "Nadia" },
      branch: { id: "b1", name: "Dhaka" },
    } as unknown as Deal);
    assert.equal(draft.id, "d1");
    assert.equal(draft.currency, "USD");
    assert.equal(draft.startDate, "2026-11-12");
    assert.equal(draft.endDate, "");
    assert.equal(draft.clientCommitments, "");
    assert.equal(draft.assignedToId, "u1");
    assert.equal(draft.branchId, "b1");
    assert.deepEqual(draft.items, [{ description: "Visits", serviceLine: "Business", quantity: "2", unitPrice: "500" }]);
  });
});

describe("the timeline", () => {
  const now = new Date("2026-11-12T04:00:00.000Z");

  test("days left are counted by the calendar in Bangladesh", () => {
    assert.equal(daysLeft("2026-11-22T00:00:00+06:00", now), 10);
    assert.equal(daysLeft("2026-11-12T00:00:00+06:00", now), 0);
    assert.equal(daysLeft(null, now), null);
  });

  test("it reads in plain words", () => {
    assert.equal(timelineText("2026-11-22T00:00:00+06:00", "ACTIVE", now), "10 days left");
    assert.equal(timelineText("2026-11-13T00:00:00+06:00", "ACTIVE", now), "1 day left");
    assert.equal(timelineText("2026-11-12T00:00:00+06:00", "ACTIVE", now), "Ends today");
    assert.equal(timelineText("2026-11-11T00:00:00+06:00", "ACTIVE", now), "Ended yesterday");
    assert.equal(timelineText("2026-11-09T00:00:00+06:00", "DRAFT", now), "Ended 3 days ago");
    assert.equal(timelineText("2026-11-09T00:00:00+06:00", "COMPLETED", now), "Completed");
    assert.equal(timelineText(null, "ACTIVE", now), "No end date");
  });
});

describe("what a deal's invoices add up to", () => {
  test("issued invoices count, less credit notes; drafts and cancelled ones do not", () => {
    const figures = dealFigures([
      { id: "1", number: "INV-1", issuedAt: "", state: "ISSUED", currency: "BDT", total: 10000, paid: 4000, credited: 1000, due: 5000, status: "PARTIAL" },
      { id: "2", number: "INV-2", issuedAt: "", state: "DRAFT", currency: "BDT", total: 5000, paid: 0, credited: 0, due: 5000, status: "DRAFT" },
      { id: "3", number: "INV-3", issuedAt: "", state: "CANCELLED", currency: "BDT", total: 700, paid: 0, credited: 0, due: 0, status: "CANCELLED" },
    ]);
    assert.deepEqual(figures, { invoiced: 9000, paid: 4000, due: 5000 });
  });

  test("without money figures there is nothing to add up", () => {
    assert.equal(dealFigures([{ id: "1", number: "INV-1", issuedAt: "", state: "ISSUED", currency: "BDT", status: "SENT" }]), null);
  });

  test("no invoices yet is all zero", () => {
    assert.deepEqual(dealFigures([]), { invoiced: 0, paid: 0, due: 0 });
  });
});

describe("what staff may do with a deal", () => {
  const everything = () => true;
  const only = (...list: string[]) => (permission: string) => list.includes(permission);

  test("a draft is edited, started, invoiced, paid or cancelled", () => {
    assert.deepEqual(dealActions("DRAFT", everything), ["edit", "activate", "invoice", "payment", "cancel"]);
  });

  test("an active deal is completed and its revenue recognised", () => {
    assert.deepEqual(dealActions("ACTIVE", everything), ["edit", "complete", "invoice", "payment", "recognize", "cancel"]);
  });

  test("a completed deal is not edited or cancelled", () => {
    assert.deepEqual(dealActions("COMPLETED", everything), ["invoice", "payment", "recognize"]);
  });

  test("a cancelled deal can only be reopened", () => {
    assert.deepEqual(dealActions("CANCELLED", everything), ["reopen"]);
  });

  test("someone who may only read deals gets no buttons", () => {
    assert.deepEqual(dealActions("ACTIVE", only("deals.read")), []);
  });
});

describe("the deal list", () => {
  test("the status, customer and search go to the server", () => {
    assert.equal(dealListQuery({ status: "ACTIVE", customerId: "c1", search: " D-34 " }), "/office/deals?status=ACTIVE&customerId=c1&search=D-34");
    assert.equal(dealListQuery({}), "/office/deals");
  });
});
