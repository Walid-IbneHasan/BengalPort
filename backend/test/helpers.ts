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

// A multipart/form-data request body holding one file.
export function fileUpload(name: string, type: string, content: Buffer) {
  const boundary = "----test-boundary";
  return {
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    payload: Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${type}\r\n\r\n`),
      content,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]),
  };
}

export const pdfBytes = (size = 600) =>
  Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(Math.max(0, size - 9), 0x20)]);
