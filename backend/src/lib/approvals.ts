// High-risk actions need a second person. Someone whose role may approve
// the action does it at once; anyone else asks, and it happens when an
// approver agrees. Nobody approves their own request.
import type { FastifyInstance } from "fastify";
import { prisma } from "./prisma.js";
import { allowed } from "./access.js";
import { notify, staffWith } from "./office-notifications.js";
import { addCreditNote, cancelInvoice, refundOfficePayment, type By } from "./office-service.js";
import { reverseJournal } from "./accounting.js";

export const APPROVAL_KINDS = {
  INVOICE_CANCEL: { permission: "invoices.approve", label: "Cancel an invoice" },
  CREDIT_NOTE: { permission: "invoices.approve", label: "Credit note" },
  PAYMENT_REFUND: { permission: "payments.approve", label: "Refund a payment" },
  JOURNAL_REVERSAL: { permission: "accounts.approve", label: "Reverse a journal entry" },
} as const;
export type ApprovalKind = keyof typeof APPROVAL_KINDS;

// Does the action now, inside the database transaction it is given.
export async function perform(db: any, kind: ApprovalKind, entityId: string, payload: any, by: By) {
  if (kind === "INVOICE_CANCEL") return cancelInvoice(db, entityId, by, payload.reason);
  if (kind === "CREDIT_NOTE") return addCreditNote(db, entityId, by, Number(payload.amount), payload.reason);
  if (kind === "PAYMENT_REFUND") return refundOfficePayment(db, entityId, { amount: Number(payload.amount), reason: payload.reason, method: payload.method }, by);
  return reverseJournal(db, entityId, by, payload.reason);
}

// Either does the action (approver) or files a request (anyone else).
export async function doOrAsk(app: FastifyInstance, request: { role: string; by: { id: string; name: string } }, kind: ApprovalKind, entity: { type: string; id: string; summary: string }, payload: Record<string, unknown>) {
  if (await allowed(request.role, APPROVAL_KINDS[kind].permission)) {
    const result = await prisma.$transaction((tx) => perform(tx, kind, entity.id, payload, request.by));
    return { done: true as const, result };
  }
  const pending = await prisma.approvalRequest.findFirst({ where: { kind, entityId: entity.id, status: "PENDING" } });
  if (pending) return { done: false as const, approval: pending };
  const approval = await prisma.approvalRequest.create({
    data: { kind, entityType: entity.type, entityId: entity.id, summary: entity.summary, payload: payload as object, requestedById: request.by.id, requestedByName: request.by.name },
  });
  const approvers = (await staffWith(APPROVAL_KINDS[kind].permission)).filter((id) => id !== request.by.id);
  await notify(app, approvers, {
    type: "PENDING_APPROVAL",
    title: `Approval needed: ${APPROVAL_KINDS[kind].label}`,
    body: `${request.by.name} asks: ${entity.summary}`,
    link: "/admin/approvals",
    relatedType: "approval",
    relatedId: approval.id,
    key: `approval:${approval.id}`,
  });
  return { done: false as const, approval };
}
