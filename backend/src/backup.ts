// Makes one database backup: `npm run backup`. Meant to be run every night
// by the server's scheduler (cron); see "Backups" in README.md.
import "dotenv/config";
import { BackupError, runBackup } from "./lib/backup.js";

try {
  const { file, bytes, removed } = await runBackup();
  console.log(`Backup written: ${file} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
  if (removed.length) console.log(`Removed ${removed.length} older backup${removed.length === 1 ? "" : "s"}.`);
} catch (error) {
  console.error(error instanceof BackupError ? error.message : error);
  process.exit(1);
}
