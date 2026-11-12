// Builds the two folders (and zips) that are uploaded to cPanel:
//   deploy/api  - the API, run as a cPanel "Node.js App"
//   deploy/web  - the website, run as a second "Node.js App"
// Usage: npm run package:cpanel        (see "Deploying to cPanel" in README.md)
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "deploy");
const run = (command, cwd = root) => execSync(command, { cwd, stdio: "inherit" });
const write = (file, content) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};

// cPanel's Passenger loads the startup file with require(), so this CommonJS
// file loads .env (if present) and then starts the ES-module server.
const startupFile = (entry) => `const path = require("node:path");
try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch {
  // No .env file: settings come from cPanel's environment variables.
}
import(${JSON.stringify(entry)}).catch((error) => {
  console.error(error);
  process.exit(1);
});
`;

// The website's startup file: a plain Node server around the built site. The
// site's own images keep their names when they change, so browsers may keep
// them for a week rather than for ever.
const webStartupFile = `const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch {
  // No .env file: settings come from cPanel's environment variables.
}
const kept = /^\\/(images\\/|favicon\\.png|apple-touch-icon\\.png|icon-\\d+\\.png|site\\.webmanifest)/;
const isKept = (url) => {
  try {
    const { pathname } = new URL(url, "http://site");
    return kept.test(pathname) && fs.existsSync(path.join(__dirname, "build", "client", pathname));
  } catch {
    return false;
  }
};
import("./build/handler.js")
  .then(({ handler }) => {
    http
      .createServer((req, res) => {
        if (isKept(req.url)) res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
        handler(req, res, () => {
          res.statusCode = 404;
          res.end("Not found");
        });
      })
      .listen(Number(process.env.PORT) || 3000, process.env.HOST || "0.0.0.0");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;

rmSync(out, { recursive: true, force: true });
run("npm run build -w backend");
run("npm run build -w frontend");

// ---- API ----
const api = path.join(out, "api");
const backend = path.join(root, "backend");
const backendPackage = JSON.parse(readFileSync(path.join(backend, "package.json"), "utf8"));
const rootPackage = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
cpSync(path.join(backend, "dist"), path.join(api, "dist"), { recursive: true });
cpSync(path.join(backend, "prisma", "schema.prisma"), path.join(api, "prisma", "schema.prisma"));
cpSync(path.join(backend, "prisma", "migrations"), path.join(api, "prisma", "migrations"), { recursive: true });
// The admin guide, shown to the Super Admin inside the admin.
cpSync(path.join(root, "docs", "ADMIN-GUIDE.md"), path.join(api, "docs", "ADMIN-GUIDE.md"));
// The seed is compiled next to the schema so the server needs no TypeScript tooling.
run(
  `npx tsc prisma/seed.ts --outDir "${api}" --rootDir . --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck`,
  backend,
);
write(
  path.join(api, "package.json"),
  JSON.stringify(
    {
      name: "bengal-port-api",
      private: true,
      type: "module",
      scripts: {
        start: "node server.cjs",
        setup: "prisma generate && prisma migrate deploy",
        "db:seed": "node prisma/seed.js",
        backup: "node dist/backup.js",
      },
      // The Prisma CLI is a runtime dependency here: the server generates its
      // own client and applies migrations.
      dependencies: { ...backendPackage.dependencies, prisma: backendPackage.devDependencies.prisma },
      // Same patched transitive dependency as the workspace root.
      overrides: { "deepmerge-ts": rootPackage.overrides["deepmerge-ts"] },
    },
    null,
    2,
  ) + "\n",
);
write(path.join(api, "server.cjs"), startupFile("./dist/server.js"));
write(
  path.join(api, ".env.example"),
  `NODE_ENV="production"
DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@localhost:5432/DB_NAME?schema=public"
JWT_SECRET="replace-with-at-least-32-random-characters"
# The public site address(es) allowed to call the API, comma-separated.
FRONTEND_URL="https://example.com,https://www.example.com"
# The public address of this API, used in uploaded image links.
API_PUBLIC_URL="https://api.example.com"
TRUST_PROXY="true"
# Shared hosting allows only a few processes (HostNil: 100). Keep the database
# engine, file work and image work to two threads each, and end DATABASE_URL
# with "&connection_limit=5".
TOKIO_WORKER_THREADS="2"
UV_THREADPOOL_SIZE="2"
VIPS_CONCURRENCY="2"

# Gmail: use an app password, or the three OAuth keys instead of SMTP_PASS.
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="you@gmail.com"
SMTP_PASS=""
SMTP_OAUTH_CLIENT_ID=""
SMTP_OAUTH_CLIENT_SECRET=""
SMTP_OAUTH_REFRESH_TOKEN=""
EMAIL_FROM="Bengal Port <you@gmail.com>"
ADMIN_NOTIFY_EMAIL="you@gmail.com"

GOOGLE_CLIENT_ID=""

# bKash online payment (stays off until all four keys are set). Use the live
# address and credentials bKash issues for your merchant account.
BKASH_BASE_URL="https://tokenized.pay.bka.sh"
BKASH_USERNAME=""
BKASH_PASSWORD=""
BKASH_APP_KEY=""
BKASH_APP_SECRET=""

# Nagad online payment (stays off until these are set). Use the live address
# and the keys Nagad issues for your merchant account.
NAGAD_BASE_URL=""
NAGAD_MERCHANT_ID=""
NAGAD_MERCHANT_NUMBER=""
NAGAD_PUBLIC_KEY=""
NAGAD_PRIVATE_KEY=""

# Cloudflare Turnstile on the enquiry and application forms (stays off until
# both keys are set). Create a widget for your website address at
# dash.cloudflare.com -> Turnstile.
TURNSTILE_SITE_KEY=""
TURNSTILE_SECRET_KEY=""

# Database backups ("npm run backup", see "Backups" in the README). pg_dump is
# usually /usr/bin/pg_dump on cPanel; leave PG_DUMP_PATH empty if it is on the path.
BACKUP_DIR="backups"
BACKUP_KEEP="14"
PG_DUMP_PATH=""

# Used once by "db:seed" to create the admin account.
SEED_ADMIN_EMAIL=""
SEED_ADMIN_PASSWORD=""
`,
);

// ---- Website ----
const web = path.join(out, "web");
cpSync(path.join(root, "frontend", "build"), path.join(web, "build"), { recursive: true });
write(
  path.join(web, "package.json"),
  JSON.stringify({ name: "bengal-port-web", private: true, type: "module", scripts: { start: "node server.cjs" } }, null, 2) + "\n",
);
write(path.join(web, "server.cjs"), webStartupFile);
write(
  path.join(web, ".env.example"),
  `# The public address of this website.
ORIGIN="https://example.com"
# The public address of the API, ending in /api.
PUBLIC_API_URL="https://api.example.com/api"
PUBLIC_WHATSAPP_NUMBER="8801711991035"
PUBLIC_GOOGLE_CLIENT_ID=""
`,
);

// ---- Zips for the cPanel File Manager (Windows ships a tar that writes zip) ----
const zipped = [];
if (process.platform === "win32") {
  const tar = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");
  if (existsSync(tar))
    for (const name of ["api", "web"]) {
      run(`"${tar}" -a -c -f "${path.join(out, `bengal-port-${name}.zip`)}" -C "${path.join(out, name)}" .`);
      zipped.push(`deploy/bengal-port-${name}.zip`);
    }
}

// HostNil's upload scanner refuses JavaScript inside .zip files, so the same
// folders also go out as .tar.gz (GNU tar from Git for Windows, or the system's).
const gnuTar = ["C:/Program Files/Git/usr/bin/tar.exe", "/usr/bin/tar"].find((candidate) => existsSync(candidate));
if (gnuTar)
  for (const name of ["api", "web"]) {
    run(`"${gnuTar}" --force-local --mode="u+rwX,go+rX,go-w" -czf "${path.join(out, `bengal-port-${name}.tar.gz`)}" -C "${path.join(out, name)}" .`);
    zipped.push(`deploy/bengal-port-${name}.tar.gz`);
  }

console.log(`\nReady to upload: deploy/api and deploy/web${zipped.length ? ` (also packed: ${zipped.join(", ")})` : ""}`);
