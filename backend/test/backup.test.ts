// The backup helpers are tested without PostgreSQL; the two routes are
// integration tests against the database in backend/.env.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.LOG_LEVEL = "silent";

const { BackupError, backupFileName, dumpCommand, lastBackup, runBackup, staleBackups } = await import("../src/lib/backup.js");
const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers } = await import("./helpers.js");

describe("what pg_dump is asked to do", () => {
  const url = "postgresql://bengal:s3cr%40t@db.example.com:5432/bengal_port?schema=public&connection_limit=5&sslmode=require";

  test("settings only Prisma understands are left out of the address", () => {
    const { args } = dumpCommand({ DATABASE_URL: url });
    const address = args.find((arg) => arg.startsWith("--dbname="))!;
    assert.doesNotMatch(address, /schema=|connection_limit=/);
    assert.match(address, /sslmode=require/);
  });

  test("the password is passed out of sight of the process list", () => {
    const { args, env } = dumpCommand({ DATABASE_URL: url });
    assert.doesNotMatch(args.join(" "), /s3cr/);
    assert.equal(env.PGPASSWORD, "s3cr@t");
  });

  test("the dump is the compressed kind that pg_restore reads, without owners", () => {
    const { args } = dumpCommand({ DATABASE_URL: url });
    assert.ok(args.includes("--format=custom"));
    assert.ok(args.includes("--no-owner"));
  });

  test("pg_dump is looked up on the path unless its place is given", () => {
    assert.equal(dumpCommand({ DATABASE_URL: url }).command, "pg_dump");
    assert.equal(dumpCommand({ DATABASE_URL: url, PG_DUMP_PATH: "/usr/pgsql-16/bin/pg_dump" }).command, "/usr/pgsql-16/bin/pg_dump");
  });

  test("without a database address there is nothing to back up", () => {
    assert.throws(() => dumpCommand({}), BackupError);
  });
});

describe("naming and thinning backups", () => {
  test("a backup is named after the moment it was made, so names sort by age", () => {
    assert.equal(backupFileName(new Date(2026, 9, 2, 3, 5, 9)), "bengal-port-20261002-030509.dump");
  });

  test("only the newest backups are kept", () => {
    const names = ["bengal-port-20261001-030000.dump", "bengal-port-20261003-030000.dump", "bengal-port-20261002-030000.dump", "notes.txt", "other.dump"];
    assert.deepEqual(staleBackups(names, 2), ["bengal-port-20261001-030000.dump"]);
    assert.deepEqual(staleBackups(names, 5), []);
  });

  test("the newest backup in a folder is found, or none", () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "bp-backups-"));
    try {
      assert.equal(lastBackup(folder), null);
      fs.writeFileSync(path.join(folder, "bengal-port-20261001-030000.dump"), "x");
      fs.writeFileSync(path.join(folder, "bengal-port-20261002-030000.dump"), "x");
      assert.equal(lastBackup(folder)?.name, "bengal-port-20261002-030000.dump");
      assert.equal(lastBackup(path.join(folder, "missing")), null);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
});

describe("making a backup", () => {
  const folder = () => fs.mkdtempSync(path.join(os.tmpdir(), "bp-backups-"));
  const env = (dir: string, extra: Record<string, string> = {}) => ({ DATABASE_URL: "postgresql://u:p@localhost:5432/db", BACKUP_DIR: dir, ...extra });
  // Stands in for pg_dump: writes the file it was asked for.
  const dumping = (calls: string[][] = []) => async (_command: string, args: string[]) => {
    calls.push(args);
    fs.writeFileSync(args.find((arg) => arg.startsWith("--file="))!.slice(7), "dump");
    return { code: 0, stderr: "" };
  };

  test("the dump is written into the backup folder, which is created if needed", async () => {
    const dir = path.join(folder(), "nested", "backups");
    const result = await runBackup({ env: env(dir), now: () => new Date(2026, 9, 2, 3, 0, 0), run: dumping() });
    assert.equal(result.file, path.join(dir, "bengal-port-20261002-030000.dump"));
    assert.equal(fs.readFileSync(result.file, "utf8"), "dump");
    fs.rmSync(path.dirname(path.dirname(dir)), { recursive: true, force: true });
  });

  test("older backups beyond the number to keep are removed", async () => {
    const dir = folder();
    for (const day of ["01", "02", "03"]) fs.writeFileSync(path.join(dir, `bengal-port-202609${day}-030000.dump`), "old");
    const result = await runBackup({ env: env(dir, { BACKUP_KEEP: "2" }), now: () => new Date(2026, 9, 2, 3, 0, 0), run: dumping() });
    assert.deepEqual(fs.readdirSync(dir).sort(), ["bengal-port-20260903-030000.dump", "bengal-port-20261002-030000.dump"]);
    assert.equal(result.removed.length, 2);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("a failed dump leaves no half-written file and removes nothing", async () => {
    const dir = folder();
    fs.writeFileSync(path.join(dir, "bengal-port-20260901-030000.dump"), "old");
    const failing = async (_command: string, args: string[]) => {
      fs.writeFileSync(args.find((arg) => arg.startsWith("--file="))!.slice(7), "partial");
      return { code: 1, stderr: "pg_dump: error: connection to server failed" };
    };
    await assert.rejects(runBackup({ env: env(dir, { BACKUP_KEEP: "1" }), run: failing }), (error: unknown) => error instanceof BackupError && /connection to server failed/.test(error.message));
    assert.deepEqual(fs.readdirSync(dir), ["bengal-port-20260901-030000.dump"]);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("a missing pg_dump is explained", async () => {
    const dir = folder();
    const missing = async () => { throw Object.assign(new Error("spawn pg_dump ENOENT"), { code: "ENOENT" }); };
    await assert.rejects(runBackup({ env: env(dir), run: missing }), (error: unknown) => error instanceof BackupError && /pg_dump was not found/.test(error.message) && /PG_DUMP_PATH/.test(error.message));
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("downloading a backup from the admin", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let admin: Awaited<ReturnType<typeof createUser>>;
  let member: Awaited<ReturnType<typeof createUser>>;
  const tool = process.env.PG_DUMP_PATH;
  const link = (user = admin) => app.inject({ method: "GET", url: "/api/admin/backup-link", headers: bearer(app, user) });
  const key = (payload: Record<string, unknown>) => app.jwt.sign(payload, { expiresIn: "2m" });

  before(async () => {
    process.env.PG_DUMP_PATH = path.join(os.tmpdir(), "no-such-pg_dump");
    app = await buildApp();
    admin = await createUser("ADMIN");
    member = await createUser("USER");
  });
  after(async () => {
    process.env.PG_DUMP_PATH = tool ?? "";
    await deleteUsers(admin.id, member.id);
    await app.close();
    await prisma.$disconnect();
  });

  test("a member cannot ask for a backup", async () => {
    assert.equal((await link(member)).statusCode, 403);
  });

  test("where pg_dump is missing the admin is told why no backup can be made", async () => {
    const res = await link();
    assert.equal(res.statusCode, 503);
    assert.equal(res.json().error.code, "PG_DUMP_MISSING");
  });

  test("the download refuses a missing or made-up key", async () => {
    assert.equal((await app.inject({ method: "GET", url: "/api/backup/download" })).statusCode, 401);
    assert.equal((await app.inject({ method: "GET", url: "/api/backup/download?key=not-a-key" })).statusCode, 401);
  });

  test("a sign-in session is not a download key", async () => {
    const session = key({ sub: admin.id, role: "ADMIN", v: admin.tokenVersion });
    assert.equal((await app.inject({ method: "GET", url: `/api/backup/download?key=${session}` })).statusCode, 401);
  });

  test("a key made for someone who is not an admin opens nothing", async () => {
    const forged = key({ sub: member.id, purpose: "backup", v: member.tokenVersion });
    assert.equal((await app.inject({ method: "GET", url: `/api/backup/download?key=${forged}` })).statusCode, 401);
  });

  test("a key stops working when the admin's password changes", async () => {
    const old = key({ sub: admin.id, purpose: "backup", v: admin.tokenVersion - 1 });
    assert.equal((await app.inject({ method: "GET", url: `/api/backup/download?key=${old}` })).statusCode, 401);
  });
});
