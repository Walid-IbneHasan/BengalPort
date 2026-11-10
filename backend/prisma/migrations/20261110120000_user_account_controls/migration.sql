-- Accounts an administrator created must choose a password first; blocked accounts cannot sign in.
ALTER TABLE "User" ADD COLUMN "blockedAt" TIMESTAMP(3), ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
