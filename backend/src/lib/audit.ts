// The audit trail: who did what, when, to which record. Finance, invoices,
// permissions and document access are always recorded. A failure to write
// the trail never stops the action itself; it is logged instead.
import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  changes?: unknown;
};

export async function audit(req: FastifyRequest | null, entry: AuditEntry, actor?: { id?: string | null; name: string; role?: string | null }) {
  try {
    let who = actor;
    if (!who && req && (req as any).user?.sub) {
      const user = (req as any).user as { sub: string; role: string };
      const staff = (req as any).staff as { name?: string } | undefined;
      const name = staff?.name ?? (await prisma.user.findUnique({ where: { id: user.sub }, select: { name: true } }))?.name ?? "Staff";
      who = { id: user.sub, name, role: user.role };
    }
    await prisma.auditLog.create({
      data: {
        actorId: who?.id ?? null,
        actorName: who?.name ?? "System",
        actorRole: who?.role ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        summary: entry.summary.slice(0, 500),
        changes: entry.changes === undefined ? undefined : (JSON.parse(JSON.stringify(entry.changes)) as object),
        ip: req?.ip ?? null,
      },
    });
  } catch (error) {
    req?.log?.error({ error }, "The audit trail could not be written");
  }
}

// The fields that differ between two versions of a record.
export function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const a = before[key] instanceof Date ? (before[key] as Date).toISOString() : before[key];
    const b = after[key] instanceof Date ? (after[key] as Date).toISOString() : after[key];
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) out[key] = { from: a ?? null, to: b ?? null };
  }
  return out;
}
