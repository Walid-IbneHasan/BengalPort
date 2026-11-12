// Document management: client, employee, visa and company documents, each
// with its details, versions, verification and who may open it. Files are
// private: opened only through a checked request, and every opening is
// written in the audit trail.
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { allowed, branchScope, need, ownOnly, staffOf } from "../../lib/access.js";
import { audit, changedFields } from "../../lib/audit.js";
import { documentMetaSchema, verificationSchema } from "../../lib/office-schemas.js";
import { detectDocumentType, MAX_DOCUMENT_BYTES } from "../../lib/documents.js";
import { invalid, problem, withCode } from "./common.js";

// Passports, national ID cards and visas need the passport permission too.
const sensitive = (document: { category: string; docType: string; name: string }) =>
  document.category === "VISA" || /passport|nid|national id|visa|birth/i.test(`${document.docType} ${document.name}`);

const documents: FastifyPluginAsync = async (app) => {
  async function visible(req: any) {
    const staff = await staffOf(req);
    const and: Record<string, unknown>[] = [branchScope(staff)];
    if (staff.role !== "ADMIN") and.push({ OR: [{ restrictedTo: { isEmpty: true } }, { restrictedTo: { has: staff.role } }, { uploadedById: staff.id }] });
    // An employee sees what they uploaded, their own papers, and the checked
    // documents of their customers.
    if (ownOnly(staff)) and.push({ OR: [{ uploadedById: staff.id }, { employeeId: staff.id }, { verification: "VERIFIED", customer: { assignedToId: staff.id } }] });
    return { AND: and.filter((part) => Object.keys(part).length) };
  }
  const summary = { id: true, version: true, fileName: true, mimeType: true, byteSize: true, uploadedByName: true, createdAt: true } as const;
  const view = (document: any) => ({ ...document, customer: document.customer ? withCode(document.customer) : null, sensitive: sensitive(document) });
  const include = { customer: { select: { id: true, code: true, name: true } }, employee: { select: { id: true, name: true } }, files: { select: summary, orderBy: { version: "desc" as const } } };

  app.get("/documents", { preHandler: need("documents.read") }, async (req) => {
    const query = req.query as Record<string, string | undefined>;
    const soon = Number(query.expiringWithin);
    const where: any = { AND: [await visible(req)] };
    if (query.category) where.AND.push({ category: query.category });
    if (query.customerId) where.AND.push({ customerId: query.customerId });
    if (query.employeeId) where.AND.push({ employeeId: query.employeeId });
    if (query.verification) where.AND.push({ verification: query.verification });
    if (Number.isFinite(soon) && soon > 0) where.AND.push({ expiryDate: { not: null, lte: new Date(Date.now() + soon * 86_400_000) } });
    if (query.search) where.AND.push({ OR: [{ name: { contains: query.search, mode: "insensitive" } }, { number: { contains: query.search, mode: "insensitive" } }, { docType: { contains: query.search, mode: "insensitive" } }, { customer: { name: { contains: query.search, mode: "insensitive" } } }] });
    const rows = await prisma.managedDocument.findMany({ where, include, orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }], take: 300 });
    return { data: rows.map(view) };
  });

  app.post("/documents", { preHandler: need("documents.create") }, async (req, reply) => {
    const parsed = documentMetaSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const staff = await staffOf(req);
    if (parsed.data.category === "CLIENT" || parsed.data.category === "VISA") {
      if (!parsed.data.customerId) return problem(reply, 400, "CUSTOMER_NEEDED", "Choose the customer this document belongs to.");
      const customer = await prisma.customer.findFirst({ where: { AND: [{ id: parsed.data.customerId }, ownOnly(staff) ? { assignedToId: staff.id } : {}] } });
      if (!customer) return problem(reply, 400, "UNKNOWN_CUSTOMER", "Choose one of your customers.");
    }
    if (parsed.data.category === "EMPLOYEE" && !parsed.data.employeeId) return problem(reply, 400, "EMPLOYEE_NEEDED", "Choose the member of staff this document belongs to.");
    const document = await prisma.managedDocument.create({ data: { ...parsed.data, branchId: parsed.data.branchId ?? staff.branchId, uploadedById: staff.id, uploadedByName: staff.name }, include });
    await audit(req, { action: "document.create", entityType: "document", entityId: document.id, summary: `${document.category} document ${document.name}` });
    if (document.customerId) await prisma.customerActivity.create({ data: { customerId: document.customerId, kind: "SYSTEM", summary: `Document added: ${document.name}`, byId: staff.id, byName: staff.name } });
    return reply.code(201).send({ data: view(document) });
  });

  async function findVisible(req: any, id: string) {
    return prisma.managedDocument.findFirst({ where: { AND: [{ id }, await visible(req)] }, include });
  }

  app.get("/documents/:id", { preHandler: need("documents.read") }, async (req, reply) => {
    const document = await findVisible(req, (req.params as { id: string }).id);
    return document ? { data: view(document) } : reply.notFound("Document not found");
  });

  app.put("/documents/:id", { preHandler: need("documents.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const before = await findVisible(req, id);
    if (!before) return reply.notFound("Document not found");
    const parsed = documentMetaSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const document = await prisma.managedDocument.update({ where: { id }, data: parsed.data, include });
    const { files: _a, customer: _b, employee: _c, ...was } = before as any;
    const { files: _d, customer: _e, employee: _f, ...now } = document as any;
    await audit(req, { action: "document.update", entityType: "document", entityId: id, summary: `Changed ${document.name}`, changes: changedFields(was, now) });
    return { data: view(document) };
  });

  // A new file for the document, kept beside the earlier versions.
  app.post("/documents/:id/files", { preHandler: need("documents.create"), config: { rateLimit: { max: 60, timeWindow: "10 minutes" } } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const document = await findVisible(req, id);
    if (!document) return reply.notFound("Document not found");
    const upload = await req.file({ limits: { fileSize: MAX_DOCUMENT_BYTES } });
    if (!upload) return problem(reply, 400, "NO_FILE", "Choose a file to upload.");
    let data: Buffer;
    try {
      data = await upload.toBuffer();
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 413) return problem(reply, 413, "TOO_LARGE", "Choose a file under 10 MB.");
      throw error;
    }
    const mimeType = detectDocumentType(data);
    if (!mimeType) return problem(reply, 400, "UNSUPPORTED_FILE", "Upload a PDF, JPEG, PNG or WebP file.");
    const staff = await staffOf(req);
    const version = (document.files[0]?.version ?? 0) + 1;
    const file = await prisma.documentFile.create({ data: { documentId: id, version, fileName: upload.filename.slice(0, 200), mimeType, byteSize: data.length, data: new Uint8Array(data), uploadedByName: staff.name }, select: summary });
    // A new file is checked again.
    await prisma.managedDocument.update({ where: { id }, data: { verification: "PENDING", verifiedByName: null, verifiedAt: null } });
    await audit(req, { action: "document.upload", entityType: "document", entityId: id, summary: `Version ${version} of ${document.name}: ${file.fileName}` });
    return reply.code(201).send({ data: file });
  });

  app.post("/documents/:id/verify", { preHandler: need("documents.approve") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = verificationSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    if (!(await findVisible(req, id))) return reply.notFound("Document not found");
    const staff = await staffOf(req);
    const document = await prisma.managedDocument.update({
      where: { id },
      data: { verification: parsed.data.verification, verifiedByName: parsed.data.verification === "PENDING" ? null : staff.name, verifiedAt: parsed.data.verification === "PENDING" ? null : new Date(), ...(parsed.data.notes !== null ? { notes: parsed.data.notes } : {}) },
      include,
    });
    await audit(req, { action: "document.verify", entityType: "document", entityId: id, summary: `${document.name}: ${parsed.data.verification.toLowerCase()}` });
    return { data: view(document) };
  });

  // Opening a file: to look at it needs the documents permission; to
  // download it, the export permission; a passport, ID or visa, the passport
  // permission as well.
  app.get("/documents/:id/files/:version", { preHandler: need("documents.read") }, async (req, reply) => {
    const { id, version } = req.params as { id: string; version: string };
    const document = await findVisible(req, id);
    if (!document) return reply.notFound("Document not found");
    const role = (req.user as any).role;
    const download = (req.query as { download?: string }).download === "1";
    if (download && !(await allowed(role, "documents.export"))) return problem(reply, 403, "FORBIDDEN", "You may look at this document but not download it.");
    if (sensitive(document) && !(await allowed(role, "passport.read"))) return problem(reply, 403, "FORBIDDEN", "Passports, ID cards and visas are open only to roles with the passport permission.");
    const file = await prisma.documentFile.findUnique({ where: { documentId_version: { documentId: id, version: Number(version) } } });
    if (!file) return reply.notFound("File not found");
    await audit(req, { action: download ? "document.download" : "document.view", entityType: "document", entityId: id, summary: `${download ? "Downloaded" : "Opened"} ${document.name} (version ${file.version})` });
    const plain = file.fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
    return reply
      .header("Content-Type", file.mimeType)
      .header("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${plain}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`)
      .header("X-Content-Type-Options", "nosniff")
      .header("Cache-Control", "private, no-store")
      .send(file.data);
  });

  app.delete("/documents/:id", { preHandler: need("documents.delete") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const document = await findVisible(req, id);
    if (!document) return reply.notFound("Document not found");
    await prisma.managedDocument.delete({ where: { id } });
    await audit(req, { action: "document.delete", entityType: "document", entityId: id, summary: `Deleted ${document.name} and its ${document.files.length} file(s)` });
    return reply.code(204).send();
  });
};

export default documents;
