// Each person's notifications and their choices, and the approvals waiting
// for a second person.
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { allowed, need, staffOf } from "../../lib/access.js";
import { audit } from "../../lib/audit.js";
import { decisionSchema, preferenceSchema } from "../../lib/office-schemas.js";
import { NOTIFICATION_TYPES, notify, sweep } from "../../lib/office-notifications.js";
import { APPROVAL_KINDS, perform, type ApprovalKind } from "../../lib/approvals.js";
import { OfficeError } from "../../lib/office-service.js";
import { invalid, problem } from "./common.js";

const inbox: FastifyPluginAsync = async (app) => {
  app.get("/notifications", async (req) => {
    const staff = await staffOf(req);
    const query = req.query as { unread?: string };
    const [rows, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: staff.id, ...(query.unread === "1" ? { readAt: null } : {}) }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.notification.count({ where: { userId: staff.id, readAt: null } }),
    ]);
    return { data: rows, meta: { unread } };
  });

  app.post("/notifications/:id/read", async (req, reply) => {
    const staff = await staffOf(req);
    const { count } = await prisma.notification.updateMany({ where: { id: (req.params as { id: string }).id, userId: staff.id, readAt: null }, data: { readAt: new Date() } });
    return count ? reply.code(204).send() : reply.code(204).send();
  });

  app.post("/notifications/read-all", async (req, reply) => {
    const staff = await staffOf(req);
    await prisma.notification.updateMany({ where: { userId: staff.id, readAt: null }, data: { readAt: new Date() } });
    return reply.code(204).send();
  });

  app.get("/notification-preferences", async (req) => {
    const staff = await staffOf(req);
    const saved = await prisma.notificationPreference.findMany({ where: { userId: staff.id } });
    return { data: Object.entries(NOTIFICATION_TYPES).map(([type, label]) => ({ type, label, inApp: saved.find((row) => row.type === type)?.inApp ?? true, email: saved.find((row) => row.type === type)?.email ?? false })) };
  });

  app.put("/notification-preferences", async (req, reply) => {
    const parsed = preferenceSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const staff = await staffOf(req);
    for (const preference of parsed.data.preferences) {
      if (!(preference.type in NOTIFICATION_TYPES)) continue;
      await prisma.notificationPreference.upsert({
        where: { userId_type: { userId: staff.id, type: preference.type } },
        update: { inApp: preference.inApp, email: preference.email },
        create: { userId: staff.id, type: preference.type, inApp: preference.inApp, email: preference.email },
      });
    }
    return reply.code(204).send();
  });

  // Runs the reminders now instead of waiting for the next quarter hour.
  app.post("/notifications/run", { preHandler: need("settings.update") }, async () => ({ data: { sent: await sweep(app) } }));

  // ---- Approvals ---------------------------------------------------------------
  app.get("/approvals", async (req) => {
    const staff = await staffOf(req);
    const query = req.query as { status?: string };
    const seesAll = await allowed(staff.role, "approvals.read");
    const rows = await prisma.approvalRequest.findMany({
      where: { ...(query.status ? { status: query.status as any } : {}), ...(seesAll ? {} : { requestedById: staff.id }) },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    });
    const canDecide = await Promise.all(rows.map((row) => allowed(staff.role, APPROVAL_KINDS[row.kind as ApprovalKind]?.permission ?? "approvals.approve")));
    return { data: rows.map((row, i) => ({ ...row, label: APPROVAL_KINDS[row.kind as ApprovalKind]?.label ?? row.kind, canDecide: canDecide[i] && row.status === "PENDING" && row.requestedById !== staff.id })) };
  });

  app.post("/approvals/:id/decide", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const request = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!request) return reply.notFound("Request not found");
    if (request.status !== "PENDING") return problem(reply, 409, "DECIDED", "This request has already been decided.");
    const staff = await staffOf(req);
    const kind = request.kind as ApprovalKind;
    if (!(await allowed(staff.role, APPROVAL_KINDS[kind].permission))) return problem(reply, 403, "FORBIDDEN", "You do not have permission to decide this request.");
    if (request.requestedById === staff.id) return problem(reply, 403, "OWN_REQUEST", "A second person must approve this; you asked for it yourself.");
    try {
      await prisma.$transaction(async (tx) => {
        if (parsed.data.approve) await perform(tx, kind, request.entityId, request.payload, { id: staff.id, name: staff.name });
        await tx.approvalRequest.update({ where: { id }, data: { status: parsed.data.approve ? "APPROVED" : "REJECTED", decidedById: staff.id, decidedByName: staff.name, decisionNote: parsed.data.note, decidedAt: new Date() } });
      });
    } catch (error) {
      if (error instanceof OfficeError || (error as any)?.statusCode) return problem(reply, (error as any).statusCode ?? 400, (error as any).code ?? "REFUSED", (error as Error).message);
      throw error;
    }
    await audit(req, { action: parsed.data.approve ? "approval.approve" : "approval.reject", entityType: request.entityType, entityId: request.entityId, summary: `${parsed.data.approve ? "Approved" : "Rejected"}: ${request.summary}` });
    await notify(app, [request.requestedById], {
      type: "PENDING_APPROVAL",
      title: `${parsed.data.approve ? "Approved" : "Not approved"}: ${APPROVAL_KINDS[kind].label}`,
      body: `${staff.name} ${parsed.data.approve ? "approved" : "did not approve"} your request: ${request.summary}${parsed.data.note ? ` — ${parsed.data.note}` : ""}`,
      link: "/admin/approvals",
      relatedType: "approval",
      relatedId: id,
      key: `approval-decided:${id}`,
    });
    return { data: await prisma.approvalRequest.findUniqueOrThrow({ where: { id } }) };
  });
};

export default inbox;
