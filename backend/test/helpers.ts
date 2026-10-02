// Shared fixtures for the integration tests: real accounts, because the API
// checks every session against the account it belongs to.
import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { prisma } from "../src/lib/prisma.js";

export const stamp = () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function createUser(role: "USER" | "ADMIN" = "USER", password = "Secret123") {
  return prisma.user.create({
    data: {
      name: role === "ADMIN" ? "Test Admin" : "Test Member",
      email: `${stamp()}-${role.toLowerCase()}@example.test`,
      passwordHash: await bcrypt.hash(password, 4),
      emailVerifiedAt: new Date(),
      role,
    },
  });
}

type Account = { id: string; role: string; tokenVersion: number };

export const sessionToken = (app: FastifyInstance, user: Account) =>
  app.jwt.sign({ sub: user.id, role: user.role, v: user.tokenVersion });

export const bearer = (app: FastifyInstance, user: Account) => ({
  authorization: `Bearer ${sessionToken(app, user)}`,
});

export const deleteUsers = (...ids: string[]) =>
  prisma.user.deleteMany({ where: { id: { in: ids } } });
