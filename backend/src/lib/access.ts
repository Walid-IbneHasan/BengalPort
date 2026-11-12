// Permission checks against the database: the Super Admin's changes to each
// role's defaults, and the branch a member of staff works in.
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";
import { can, refusal, type Overrides } from "./permissions.js";

let cached: { at: number; overrides: Overrides } | null = null;

export async function overrides(): Promise<Overrides> {
  if (cached && Date.now() - cached.at < 30_000) return cached.overrides;
  const rows = await prisma.rolePermission.findMany();
  cached = { at: Date.now(), overrides: new Map(rows.map((row) => [`${row.role}:${row.permission}`, row.allowed])) };
  return cached.overrides;
}
// After the Super Admin changes a role.
export const forgetOverrides = () => {
  cached = null;
};

export async function allowed(role: unknown, permission: string) {
  return can(role, permission, await overrides());
}

export type Staff = { id: string; role: string; name: string; branchId: string | null; allBranches: boolean };

// The signed-in member of staff, read once per request.
export async function staffOf(req: FastifyRequest): Promise<Staff> {
  const known = (req as any).staff as Staff | undefined;
  if (known) return known;
  const user = (req as any).user as { sub: string; role: string };
  const account = await prisma.user.findUnique({ where: { id: user.sub }, select: { name: true, branchId: true, allBranches: true } });
  const staff = { id: user.sub, role: user.role, name: account?.name ?? "Staff", branchId: account?.branchId ?? null, allBranches: account?.allBranches ?? false };
  (req as any).staff = staff;
  return staff;
}

// Records of the staff member's branch only, unless they see every branch.
// Records with no branch are seen by everyone.
export function branchScope(staff: Staff): Record<string, unknown> {
  if (staff.role === "ADMIN" || staff.allBranches || !staff.branchId) return {};
  return { OR: [{ branchId: staff.branchId }, { branchId: null }] };
}

// An employee works on the customers assigned to them.
export const ownOnly = (staff: Staff) => staff.role === "EMPLOYEE";

// A route guard: the request goes on only with the permission.
export function need(permission: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const role = ((req as any).user as { role: string }).role;
    if (!(await allowed(role, permission))) return reply.code(403).send({ error: { code: "FORBIDDEN", message: refusal(req.method), permission } });
  };
}
