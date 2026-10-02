import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import {
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENTS,
  detectDocumentType,
  documentSummary,
} from "../lib/documents.js";

const routes: FastifyPluginAsync = async (app) => {
  // Who is asking, for one application: an admin, the member who applied, or
  // the holder of the upload link issued when the application was submitted
  // (so guests can attach documents without an account). Null means no access.
  async function access(req: any, applicationId: string) {
    let token: { sub?: string; purpose?: string };
    try {
      token = await req.jwtVerify();
    } catch {
      throw app.httpErrors.unauthorized("Sign in to manage documents");
    }
    if (token.purpose === "documents")
      return token.sub === applicationId ? ("uploader" as const) : null;
    await app.authenticate(req, undefined);
    if (req.user.role === "ADMIN") return "admin" as const;
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { userId: true },
    });
    return application?.userId === req.user.sub ? ("owner" as const) : null;
  }

  app.post(
    "/:id/documents",
    { config: { rateLimit: { max: 60, timeWindow: "10 minutes" } } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      if (
        !(await access(req, id)) ||
        !(await prisma.application.count({ where: { id } }))
      )
        return reply.notFound("Application not found");
      const upload = await req.file({ limits: { fileSize: MAX_DOCUMENT_BYTES } });
      if (!upload) return reply.badRequest("Choose a file to attach");
      const bytes = await upload.toBuffer();
      const mimeType = detectDocumentType(bytes);
      if (!mimeType)
        return reply.badRequest("Attach a PDF, JPEG, PNG or WebP file");
      if (
        (await prisma.applicationDocument.count({
          where: { applicationId: id },
        })) >= MAX_DOCUMENTS
      )
        return reply.badRequest(
          `An application can hold up to ${MAX_DOCUMENTS} documents`,
        );
      const name =
        upload.filename.replace(/[\\/\u0000-\u001f]/g, "_").slice(-150) ||
        "document";
      const document = await prisma.applicationDocument.create({
        data: { applicationId: id, name, mimeType, byteSize: bytes.length, data: new Uint8Array(bytes) },
        select: documentSummary,
      });
      return reply.code(201).send({ data: document });
    },
  );

  app.get("/:id/documents", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await access(req, id))) return reply.notFound("Application not found");
    return {
      data: await prisma.applicationDocument.findMany({
        where: { applicationId: id },
        select: documentSummary,
        orderBy: { createdAt: "asc" },
      }),
    };
  });

  // Reading a document needs a real session: the upload link can add and
  // remove files but never read them back.
  app.get("/documents/:documentId", async (req: any, reply) => {
    await app.authenticate(req, reply);
    const document = await prisma.applicationDocument.findUnique({
      where: { id: req.params.documentId },
      include: { application: { select: { userId: true } } },
    });
    if (
      !document ||
      (req.user.role !== "ADMIN" && document.application.userId !== req.user.sub)
    )
      return reply.notFound("Document not found");
    const plainName = document.name.replace(/[^\x20-\x7e]|["\\]/g, "_");
    return reply
      .header("Content-Type", document.mimeType)
      .header(
        "Content-Disposition",
        `attachment; filename="${plainName}"; filename*=UTF-8''${encodeURIComponent(document.name)}`,
      )
      .header("X-Content-Type-Options", "nosniff")
      .header("Cache-Control", "private, no-store")
      .send(document.data);
  });

  app.delete("/documents/:documentId", async (req: any, reply) => {
    const document = await prisma.applicationDocument.findUnique({
      where: { id: req.params.documentId },
      select: { id: true, applicationId: true },
    });
    if (!(await access(req, document?.applicationId ?? "")) || !document)
      return reply.notFound("Document not found");
    await prisma.applicationDocument.delete({ where: { id: document.id } });
    return reply.code(204).send();
  });
};

export default routes;
