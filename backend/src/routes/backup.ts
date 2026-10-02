import { spawn } from "node:child_process";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { MISSING_TOOL, backupFileName, dumpCommand, missingTool } from "../lib/backup.js";

const routes: FastifyPluginAsync = async (app) => {
  // Streams a fresh dump of the database to an administrator's browser. The
  // browser cannot send a sign-in header when it downloads a file, so the
  // admin first gets a link that works for two minutes (GET
  // /api/admin/backup-link) and stops working if their password changes.
  app.get("/download", { config: { rateLimit: { max: 6, timeWindow: "10 minutes" } } }, async (req, reply) => {
    let token: { sub?: string; purpose?: string; v?: number } | null = null;
    try {
      token = app.jwt.verify<{ sub?: string; purpose?: string; v?: number }>((req.query as { key?: string }).key ?? "");
    } catch {
      // An expired or altered link opens nothing.
    }
    const account =
      token?.purpose === "backup" && token.sub
        ? await prisma.user.findUnique({ where: { id: token.sub }, select: { role: true, tokenVersion: true } })
        : null;
    if (!account || account.role !== "ADMIN" || account.tokenVersion !== token?.v)
      return reply.unauthorized("This download link is not valid any more. Ask for a new one in the admin.");

    const dump = dumpCommand(process.env);
    const child = spawn(dump.command, dump.args, { env: { ...process.env, ...dump.env }, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk));
    const closed = new Promise<number | null>((resolve) => child.once("close", resolve));
    // Nothing is sent until pg_dump has produced its first bytes, so a dump
    // that cannot start is reported instead of downloading as an empty file.
    const started = await new Promise<"data" | "missing" | "failed">((resolve) => {
      child.once("error", (error) => resolve(missingTool(error) ? "missing" : "failed"));
      child.stdout.once("readable", () => {
        const chunk = child.stdout.read();
        if (chunk === null) return resolve("failed");
        child.stdout.unshift(chunk);
        resolve("data");
      });
    });
    if (started === "missing") return reply.code(503).send({ error: { code: "PG_DUMP_MISSING", message: MISSING_TOOL } });
    if (started === "failed") {
      await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 3000))]);
      req.log.error({ stderr }, "pg_dump could not make a backup");
      return reply.code(502).send({ error: { code: "BACKUP_FAILED", message: `The backup could not be made: ${stderr.trim().split("\n")[0] || "pg_dump stopped without output"}` } });
    }
    void closed.then((code) => {
      if (code === 0) return;
      // The file is cut short; break the connection so the browser reports a failed download.
      req.log.error({ stderr, code }, "pg_dump failed part-way through a backup download");
      reply.raw.destroy();
    });
    reply.raw.on("close", () => child.kill());
    return reply
      .header("content-type", "application/octet-stream")
      .header("content-disposition", `attachment; filename="${backupFileName(new Date())}"`)
      .header("cache-control", "no-store")
      .send(child.stdout);
  });
};

export default routes;
