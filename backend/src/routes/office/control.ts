// The Super Admin's controls: branches, what each role may do, each member
// of staff's role and branch, the audit trail, the authority signatures and
// the office settings.
import type { FastifyPluginAsync } from "fastify";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { prisma } from "../../lib/prisma.js";
import { allowed, forgetOverrides, need, overrides, staffOf } from "../../lib/access.js";
import { audit } from "../../lib/audit.js";
import { branchSchema, rolePermissionSchema, settingsSchema, staffSchema } from "../../lib/office-schemas.js";
import { can, defaultAllowed, RESOURCES } from "../../lib/permissions.js";
import { getSettings, saveSettings } from "../../lib/settings.js";
import { invalid, problem } from "./common.js";

// The admin guide (docs/ADMIN-GUIDE.md): next to the app when deployed, one
// folder up while developing. Read once and kept.
let guide: string | null = null;
async function readGuide() {
  if (guide) return guide;
  const places = ["docs/ADMIN-GUIDE.md", "../docs/ADMIN-GUIDE.md", fileURLToPath(new URL("../../../docs/ADMIN-GUIDE.md", import.meta.url)), fileURLToPath(new URL("../../../../docs/ADMIN-GUIDE.md", import.meta.url))];
  for (const place of places) {
    try {
      guide = await readFile(place, "utf8");
      return guide;
    } catch {
      // Not here; try the next place.
    }
  }
  return null;
}

const control: FastifyPluginAsync = async (app) => {
  // ---- Branches --------------------------------------------------------------
  app.get("/branches", async () => ({ data: await prisma.branch.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true, customers: true } } } }) }));

  app.post("/branches", { preHandler: need("branches.create") }, async (req, reply) => {
    const parsed = branchSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    if (await prisma.branch.count({ where: { code: parsed.data.code } })) return problem(reply, 409, "CODE_TAKEN", `A branch with the code ${parsed.data.code} already exists.`);
    const company = await prisma.company.findFirstOrThrow();
    const branch = await prisma.branch.create({ data: { ...parsed.data, companyId: company.id } });
    await audit(req, { action: "branch.create", entityType: "branch", entityId: branch.id, summary: `${branch.code} ${branch.name}` });
    return reply.code(201).send({ data: branch });
  });

  app.put("/branches/:id", { preHandler: need("branches.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = branchSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    if (!(await prisma.branch.count({ where: { id } }))) return reply.notFound("Branch not found");
    if (await prisma.branch.count({ where: { code: parsed.data.code, id: { not: id } } })) return problem(reply, 409, "CODE_TAKEN", `A branch with the code ${parsed.data.code} already exists.`);
    const branch = await prisma.branch.update({ where: { id }, data: parsed.data });
    await audit(req, { action: "branch.update", entityType: "branch", entityId: id, summary: `${branch.code} ${branch.name}` });
    return { data: branch };
  });

  // ---- Roles and permissions -------------------------------------------------
  app.get("/roles", async () => {
    const changes = await overrides();
    const roles = ["MANAGER", "ACCOUNTANT", "EMPLOYEE", "MODERATOR"];
    return {
      data: {
        resources: RESOURCES,
        roles: roles.map((role) => ({
          role,
          permissions: Object.fromEntries(Object.entries(RESOURCES).flatMap(([resource, actions]) => actions.map((action) => {
            const key = `${resource}.${action}`;
            return [key, { allowed: can(role, key, changes), changed: changes.has(`${role}:${key}`), byDefault: defaultAllowed(role, key) }];
          }))),
        })),
      },
    };
  });

  app.put("/roles", { preHandler: need("roles.update") }, async (req, reply) => {
    const parsed = rolePermissionSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const { role, permission, allowed: allow } = parsed.data;
    const [resource, action] = permission.split(".");
    if (!RESOURCES[resource]?.includes(action)) return problem(reply, 400, "UNKNOWN_PERMISSION", "That permission does not exist.");
    // Back to the default removes the change.
    if (allow === defaultAllowed(role, permission)) await prisma.rolePermission.deleteMany({ where: { role, permission } });
    else await prisma.rolePermission.upsert({ where: { role_permission: { role, permission } }, update: { allowed: allow }, create: { role, permission, allowed: allow } });
    forgetOverrides();
    await audit(req, { action: "permission.change", entityType: "role", entityId: role, summary: `${role}: ${permission} ${allow ? "allowed" : "taken away"}`, changes: { [permission]: { from: !allow, to: allow } } });
    return { data: { role, permission, allowed: allow } };
  });

  // A member of staff's role and branch. Changing a role is recorded.
  app.put("/staff/:id", { preHandler: need("users.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = staffSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const staff = await staffOf(req);
    const before = await prisma.user.findUnique({ where: { id }, select: { name: true, role: true, branchId: true, allBranches: true } });
    if (!before) return reply.notFound("User not found");
    if (parsed.data.role && parsed.data.role !== before.role) {
      if (!(await allowed(staff.role, "roles.update"))) return problem(reply, 403, "FORBIDDEN", "Only the Super Admin can change roles.");
      if (id === staff.id) return problem(reply, 400, "OWN_ROLE", "You cannot change your own role.");
      if (parsed.data.role === "ADMIN" && staff.role !== "ADMIN") return problem(reply, 403, "FORBIDDEN", "Only a Super Admin can make another Super Admin.");
    }
    if (parsed.data.branchId && !(await prisma.branch.count({ where: { id: parsed.data.branchId } }))) return problem(reply, 400, "UNKNOWN_BRANCH", "That branch does not exist.");
    const user = await prisma.user.update({ where: { id }, data: { ...parsed.data, ...(parsed.data.role && parsed.data.role !== before.role ? { tokenVersion: { increment: 1 } } : {}) }, select: { id: true, name: true, role: true, branchId: true, allBranches: true } });
    await audit(req, {
      action: parsed.data.role && parsed.data.role !== before.role ? "user.role" : "user.branch",
      entityType: "user",
      entityId: id,
      summary: parsed.data.role && parsed.data.role !== before.role ? `${before.name}: ${before.role} → ${parsed.data.role}` : `${before.name}: branch settings changed`,
      changes: { role: { from: before.role, to: user.role }, branchId: { from: before.branchId, to: user.branchId }, allBranches: { from: before.allBranches, to: user.allBranches } },
    });
    return { data: user };
  });

  // ---- The audit trail -------------------------------------------------------
  app.get("/audit", { preHandler: need("audit.read") }, async (req) => {
    const query = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.actorId) where.actorId = query.actorId;
    if (query.action) where.action = { startsWith: query.action };
    if (query.from || query.to) where.createdAt = { ...(query.from ? { gte: new Date(`${query.from}T00:00:00+06:00`) } : {}), ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999+06:00`) } : {}) };
    if (query.search) where.OR = [{ summary: { contains: query.search, mode: "insensitive" } }, { actorName: { contains: query.search, mode: "insensitive" } }];
    const take = Math.min(500, Number(query.limit) || 200);
    return { data: await prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take }) };
  });

  // ---- Authority signatures --------------------------------------------------
  const signatureFields = { id: true, label: true, ownerName: true, ownerTitle: true, active: true, uploadedByName: true, createdAt: true, retiredAt: true } as const;
  app.get("/signatures", async (req, reply) => {
    const role = (req.user as any).role;
    if (!(await allowed(role, "signature.use")) && !(await allowed(role, "signature.update"))) return reply.forbidden("You do not have permission to use the authority signature.");
    return { data: await prisma.signatureAsset.findMany({ select: signatureFields, orderBy: { createdAt: "desc" } }) };
  });

  // The picture, for printing an invoice issued with it.
  app.get("/signatures/:id/image", async (req, reply) => {
    const role = (req.user as any).role;
    if (!(await allowed(role, "invoices.read"))) return reply.forbidden("You do not have permission to see signatures.");
    const signature = await prisma.signatureAsset.findUnique({ where: { id: (req.params as { id: string }).id } });
    if (!signature) return reply.notFound("Signature not found");
    return reply.header("Content-Type", signature.mimeType).header("Cache-Control", "private, max-age=3600").send(signature.data);
  });

  // A new signature: a picture, the signer's name and title. The earlier
  // active one is retired; invoices issued with it keep it.
  app.post("/signatures", { preHandler: need("signature.update") }, async (req, reply) => {
    const upload = await req.file({ limits: { fileSize: 5 * 1024 * 1024 } });
    if (!upload) return problem(reply, 400, "NO_FILE", "Choose a picture of the signature.");
    const fields = upload.fields as Record<string, any>;
    const value = (name: string) => String(fields[name]?.value ?? "").trim();
    const label = value("label") || "Authority signature";
    const ownerName = value("ownerName");
    if (ownerName.length < 2) return problem(reply, 400, "VALIDATION_ERROR", "Enter the name of the person who signs.");
    let png: Buffer;
    try {
      // Kept as a small PNG with its transparency.
      png = await sharp(await upload.toBuffer()).rotate().resize({ width: 900, height: 360, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
    } catch {
      return problem(reply, 400, "NOT_AN_IMAGE", "The file could not be read as a picture. Use PNG or JPEG.");
    }
    const staff = await staffOf(req);
    const signature = await prisma.$transaction(async (tx) => {
      await tx.signatureAsset.updateMany({ where: { active: true }, data: { active: false, retiredAt: new Date() } });
      return tx.signatureAsset.create({ data: { label, ownerName, ownerTitle: value("ownerTitle") || null, mimeType: "image/png", data: new Uint8Array(png), uploadedByName: staff.name }, select: signatureFields });
    });
    await audit(req, { action: "signature.upload", entityType: "signature", entityId: signature.id, summary: `New authority signature for ${ownerName}` });
    return reply.code(201).send({ data: signature });
  });

  app.post("/signatures/:id/retire", { preHandler: need("signature.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { count } = await prisma.signatureAsset.updateMany({ where: { id, active: true }, data: { active: false, retiredAt: new Date() } });
    if (!count) return reply.notFound("Active signature not found");
    await audit(req, { action: "signature.retire", entityType: "signature", entityId: id, summary: "Authority signature retired" });
    return reply.code(204).send();
  });

  // ---- Settings --------------------------------------------------------------
  app.get("/settings", async () => ({ data: await getSettings() }));

  app.put("/settings", { preHandler: need("settings.update") }, async (req, reply) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const before = await getSettings();
    const saved = await saveSettings(parsed.data);
    await audit(req, { action: "settings.update", entityType: "settings", summary: `Changed: ${Object.keys(parsed.data).join(", ")}`, changes: Object.fromEntries(Object.keys(parsed.data).map((key) => [key, { from: (before as any)[key], to: (saved as any)[key] }])) });
    return { data: saved };
  });

  // The admin guide, for the Super Admin only.
  app.get("/guide", async (req, reply) => {
    if ((await staffOf(req)).role !== "ADMIN") return problem(reply, 403, "FORBIDDEN", "Only the Super Admin can open the admin guide.");
    const text = await readGuide();
    if (!text) return reply.notFound("The admin guide is missing from this server. Upload docs/ADMIN-GUIDE.md with the API.");
    return reply.header("Cache-Control", "private, no-store").send({ data: { markdown: text } });
  });

  // What the signed-in member of staff may do, for the screens.
  app.get("/me/permissions", async (req) => {
    const staff = await staffOf(req);
    const changes = await overrides();
    const list = Object.entries(RESOURCES).flatMap(([resource, actions]) => actions.map((action) => `${resource}.${action}`)).filter((key) => can(staff.role, key, changes));
    return { data: { id: staff.id, role: staff.role, name: staff.name, branchId: staff.branchId, allBranches: staff.allBranches, permissions: list } };
  });
};

export default control;
