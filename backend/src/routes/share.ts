// Invoices shared with customers through a link (sent by WhatsApp or email).
// The link carries a signed key valid for 30 days; without it nothing opens.
// Only what the printed invoice shows is sent: no internal ids or links.
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { creditNoteNumber, invoiceNumberText } from "../lib/invoice-lifecycle.js";
import { invoiceFigures } from "../lib/office-service.js";

export const SHARE_DAYS = 30;

const share: FastifyPluginAsync = async (app) => {
  app.get("/invoice/:id", { config: { rateLimit: { max: 60, timeWindow: "10 minutes" } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const key = String((req.query as { key?: string }).key ?? "");
    let token: { sub?: string; purpose?: string; v?: number } | null = null;
    try {
      token = app.jwt.verify<{ sub?: string; purpose?: string }>(key);
    } catch {
      // An expired or altered link opens nothing.
    }
    if (token?.purpose !== "invoice-share" || token.sub !== id) return reply.notFound("This link has expired or is not valid. Ask Bengal Port for a new one.");
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        creditNotes: { select: { number: true, amount: true, reason: true, createdAt: true }, orderBy: { number: "asc" } },
        allocations: { select: { amount: true, payment: { select: { paidAt: true, method: true } } } },
        application: { select: { reference: true, type: true } },
        customer: { select: { code: true } },
        deal: { select: { number: true, title: true } },
        signature: true,
      },
    });
    // A link made for an earlier version still opens the invoice as it is now.
    if (!invoice || invoice.state === "DRAFT") return reply.notFound("Invoice not found");
    const { signature } = invoice;
    return reply.header("Cache-Control", "private, no-store").send({
      data: {
        id: invoice.id,
        number: invoiceNumberText(invoice.serial),
        state: invoice.state,
        version: invoice.version,
        templateVersion: invoice.templateVersion,
        issuedAt: invoice.issuedAt,
        dueAt: invoice.dueAt,
        issuedByName: invoice.issuedByName,
        cancelReason: invoice.cancelReason,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        customerEmail: invoice.customerEmail,
        customerAddress: invoice.customerAddress,
        customer: invoice.customer,
        deal: invoice.deal,
        application: invoice.application,
        items: invoice.items,
        notes: invoice.notes,
        terms: invoice.terms,
        companyCommitments: invoice.companyCommitments,
        clientCommitments: invoice.clientCommitments,
        startDate: invoice.startDate,
        endDate: invoice.endDate,
        currency: invoice.currency,
        exchangeRate: Number(invoice.exchangeRate),
        ...invoiceFigures(invoice),
        creditNotes: invoice.creditNotes.map((note) => ({ reference: creditNoteNumber(note.number), amount: Number(note.amount), reason: note.reason, createdAt: note.createdAt })),
        allocations: invoice.allocations.map((part) => ({ amount: Number(part.amount), payment: part.payment })),
        signature: signature ? { ownerName: signature.ownerName, ownerTitle: signature.ownerTitle, image: `data:${signature.mimeType};base64,${Buffer.from(signature.data).toString("base64")}` } : null,
      },
    });
  });
};

export default share;
