import { prisma } from "./prisma.js";
import type { TokenStore } from "./bkash.js";

// Keeps the bKash token in the database so that a restarted (or second)
// server process reuses it instead of asking bKash for another one.
export const databaseTokens: TokenStore = {
  async load() {
    const row = await prisma.gatewayToken.findUnique({ where: { provider: "bkash" } });
    return row && { idToken: row.idToken, refreshToken: row.refreshToken, expiresAt: row.expiresAt };
  },
  async save(token) {
    await prisma.gatewayToken.upsert({
      where: { provider: "bkash" },
      update: token,
      create: { provider: "bkash", ...token },
    });
  },
};
