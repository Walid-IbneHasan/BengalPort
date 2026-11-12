// The business management system (CEO / Super Admin control panel): CRM,
// deals, accounts, documents, notifications, approvals and the audit log.
// Every route needs a member of staff; each also checks its own permission.
import type { FastifyPluginAsync } from "fastify";
import { isStaff } from "../../lib/permissions.js";
import { ensureChart } from "../../lib/accounting.js";
import crm from "./crm.js";
import deals from "./deals.js";
import money from "./money.js";
import accounts from "./accounts.js";
import documents from "./documents.js";
import inbox from "./inbox.js";
import control from "./control.js";
import dashboard from "./dashboard.js";

const office: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", async (req, reply) => {
    if (!isStaff((req.user as any).role)) return reply.forbidden("Staff access required");
  });
  app.addHook("onRequest", async () => {
    await ensureChart();
  });
  await app.register(crm);
  await app.register(deals);
  await app.register(money);
  await app.register(accounts);
  await app.register(documents);
  await app.register(inbox);
  await app.register(control);
  await app.register(dashboard);
};

export default office;
