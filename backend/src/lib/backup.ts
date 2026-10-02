// Database backups with PostgreSQL's own pg_dump. Everything the site holds
// lives in the database (applications, documents, images, payments), so one
// dump is a complete backup. Restore one with:
//   pg_restore --clean --if-exists --no-owner --dbname=<database address> <file>
//
// Settings: BACKUP_DIR (default ./backups), BACKUP_KEEP (how many to keep,
// default 14) and PG_DUMP_PATH (when pg_dump is not on the path).
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export class BackupError extends Error {}

type Env = Record<string, string | undefined>;

// Parts of a Prisma database address that PostgreSQL's own tools reject.
const PRISMA_ONLY = ["schema", "connection_limit", "pool_timeout", "pgbouncer", "socket_timeout", "statement_cache_size"];

// The pg_dump call for the database in DATABASE_URL. The password travels in
// the environment, not in the arguments other users of a shared server can see.
export function dumpCommand(env: Env, file?: string): { command: string; args: string[]; env: Record<string, string> } {
  if (!env.DATABASE_URL) throw new BackupError("DATABASE_URL is not set, so there is no database to back up.");
  let address: URL;
  try {
    address = new URL(env.DATABASE_URL);
  } catch {
    throw new BackupError("DATABASE_URL is not a valid database address.");
  }
  const password = decodeURIComponent(address.password);
  address.password = "";
  for (const name of PRISMA_ONLY) address.searchParams.delete(name);
  return {
    command: env.PG_DUMP_PATH || "pg_dump",
    args: ["--format=custom", "--no-owner", "--no-privileges", `--dbname=${address.toString()}`, ...(file ? [`--file=${file}`] : [])],
    env: password ? { PGPASSWORD: password } : {},
  };
}

const pad = (value: number) => String(value).padStart(2, "0");
const PATTERN = /^bengal-port-\d{8}-\d{6}\.dump$/;

export const backupFileName = (now: Date) =>
  `bengal-port-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.dump`;

// The backups to delete so that only the newest `keep` remain.
export const staleBackups = (names: string[], keep: number) =>
  names
    .filter((name) => PATTERN.test(name))
    .sort()
    .reverse()
    .slice(Math.max(1, keep));

export const backupFolder = (env: Env) => path.resolve(env.BACKUP_DIR || "backups");

// The newest backup in a folder, or null when there is none.
export function lastBackup(folder: string): { name: string; madeAt: Date; bytes: number } | null {
  let names: string[];
  try {
    names = fs.readdirSync(folder);
  } catch {
    return null;
  }
  const name = names.filter((item) => PATTERN.test(item)).sort().at(-1);
  if (!name) return null;
  const stats = fs.statSync(path.join(folder, name));
  return { name, madeAt: stats.mtime, bytes: stats.size };
}

type Run = (command: string, args: string[], env: Record<string, string>) => Promise<{ code: number | null; stderr: string }>;

const runProcess: Run = (command, args, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stderr }));
  });

// Whether pg_dump can be started on this server.
export const dumpToolAvailable = (env: Env = process.env) =>
  new Promise<boolean>((resolve) => {
    const child = spawn(env.PG_DUMP_PATH || "pg_dump", ["--version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });

export const missingTool = (error: unknown) => (error as { code?: string })?.code === "ENOENT";
export const MISSING_TOOL =
  "pg_dump was not found on this server. Set PG_DUMP_PATH to its full path (on cPanel usually /usr/bin/pg_dump), or use your hosting panel's own database backup.";

// Writes a dump into the backup folder and removes the oldest ones beyond
// the number to keep. A dump that fails leaves nothing behind.
export async function runBackup(options: { env?: Env; now?: () => Date; run?: Run } = {}): Promise<{ file: string; bytes: number; removed: string[] }> {
  const env = options.env ?? process.env;
  const folder = backupFolder(env);
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, backupFileName((options.now ?? (() => new Date()))()));
  const dump = dumpCommand(env, file);
  const discard = () => fs.rmSync(file, { force: true });
  let result: Awaited<ReturnType<Run>>;
  try {
    result = await (options.run ?? runProcess)(dump.command, dump.args, dump.env);
  } catch (error) {
    discard();
    throw new BackupError(missingTool(error) ? MISSING_TOOL : `pg_dump could not be started: ${error instanceof Error ? error.message : error}`);
  }
  if (result.code !== 0) {
    discard();
    throw new BackupError(`pg_dump failed: ${result.stderr.trim() || `exit code ${result.code}`}`);
  }
  const keep = Number(env.BACKUP_KEEP) > 0 ? Math.floor(Number(env.BACKUP_KEEP)) : 14;
  const removed = staleBackups(fs.readdirSync(folder), keep);
  for (const name of removed) fs.rmSync(path.join(folder, name), { force: true });
  return { file, bytes: fs.statSync(file).size, removed };
}
