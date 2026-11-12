# Putting the new version live — নতুন ভার্সন লাইভ করা

For bengalport.com on HostNil cPanel. Version of 12 November 2026. [বাংলা নির্দেশনা নিচে](#বাংলা-নির্দেশনা)

---

## English

### What you upload
Two files from the `deploy` folder of the project:

| File | Goes to | cPanel app |
|---|---|---|
| `deploy/bengal-port-api.tar.gz` | `/home/bengalpo/bengal-port-api` | the API app (api.bengalport.com) |
| `deploy/bengal-port-web.tar.gz` | `/home/bengalpo/bengal-port-web` | the website app (www.bengalport.com) |

Use the **.tar.gz** files: HostNil's upload scanner refuses the .zip copies.

This update adds 4 database changes (new staff roles and the business-management tables). They only add things; nothing existing is removed or changed. If the live site has not yet had the 12 November update (moderator role, ledger links), those changes are applied in the same step.

### Before you start (5 minutes)
1. **Take a backup.** Admin → **Settings** → **Backup** → download it to your computer. (cPanel → JetBackup is a second copy.)
2. Choose a quiet time: the site is unavailable for a few minutes while the apps restart.

### Step 1 — the API
1. cPanel → **Setup Node.js App** → the app for **api.bengalport.com** → **STOP APP**.
2. cPanel → **File Manager** → open `/home/bengalpo/bengal-port-api`.
3. Delete these old items: the folders `dist`, `prisma`, `src`, `docs` (if there), and the files `server.cjs`, `package.json`.
   **Do not delete** `.env`, `backups`, `node_modules`, `stderr.log`.
4. **Upload** `bengal-port-api.tar.gz` into this folder. Right-click it → **Extract** → extract here. Then delete the `.tar.gz` file.
5. Open `.env` (Edit) and check that it has these lines (they were added on 10 November; add them if missing):
   ```
   TOKIO_WORKER_THREADS="2"
   UV_THREADPOOL_SIZE="2"
   VIPS_CONCURRENCY="2"
   ```
   and that `DATABASE_URL` ends with `&connection_limit=5`.
6. Back in **Setup Node.js App** → the API app → **Run NPM Install**. (A red message about the page content check can be ignored, as before.)
7. cPanel → **Terminal**, and run these two lines:
   ```
   source /home/bengalpo/nodevenv/bengal-port-api/24/bin/activate && cd /home/bengalpo/bengal-port-api
   npm run setup
   ```
   The end of the output should say **All migrations have been successfully applied.** (Do not run `db:seed` again; it is not needed.)
8. **Setup Node.js App** → the API app → **START APP**.
9. Open **https://api.bengalport.com/api/health** — it should show `{"data":{"status":"ok"}}`.

### Step 2 — the website
1. **Setup Node.js App** → the app for **www.bengalport.com** → **STOP APP**.
2. **File Manager** → `/home/bengalpo/bengal-port-web` → delete the folder `build` and the files `server.cjs`, `package.json`. **Do not delete** `.env`.
3. Upload `bengal-port-web.tar.gz` → **Extract** here → delete the `.tar.gz`.
4. **START APP**.

### Step 3 — check
1. Open **https://www.bengalport.com** (press Ctrl+F5 once to load the new version).
2. Sign in as the Super Admin. The menu now has the **Office** group (Dashboard, Customers, Deals, Invoices, Collections, Finance, Hisab Kitab, Documents, Tasks, Approvals, Notifications, Audit log, Office settings, Admin guide).
3. Open **Dashboard**, **Hisab Kitab** and **Finance** once (the first visit creates the chart of accounts and the Head office branch by itself).

### Step 4 — first settings in the admin (once)
1. **Office settings → Signature**: click **Use it on invoices** (or upload the signature), so issued invoices are signed.
2. **Office settings → Reminders and terms**: replace the placeholder **standard terms** with your own; check the reminder days and currencies.
3. **Office settings → Branches**: add other offices if you have them.
4. **Users**: give each member of staff their role (Employee, Accountant, Manager, Moderator). **Office settings → Staff**: their branch.
5. **Office settings → Roles and permissions**: adjust what each role may do, if needed.
6. Optional: **Finance → Journal → New journal entry** for opening balances (cash in hand, bank balance on the first day).

### Good to know
- **Reminders** (payments due, follow-ups, deadlines, expiring documents) are sent by the API every 15 minutes. No new cron job is needed: the existing homepage cron keeps the apps awake. Reminder **emails** need the SMTP lines in the API `.env`.
- **If the site does not come back**: open `stderr.log` in the app folder (File Manager) and send me its last lines. Your data is safe: the update only adds tables and columns, and you have the backup from the first step.
- **If `npm run setup` stops with an error** mentioning `ALTER TYPE`: send me the message. (These changes were written to avoid the old-PostgreSQL problem from 10 November, so this is not expected.)

---

## বাংলা নির্দেশনা

### কী আপলোড করবেন
প্রজেক্টের `deploy` ফোল্ডার থেকে দুটি ফাইল:

| ফাইল | কোথায় যাবে | cPanel অ্যাপ |
|---|---|---|
| `deploy/bengal-port-api.tar.gz` | `/home/bengalpo/bengal-port-api` | API অ্যাপ (api.bengalport.com) |
| `deploy/bengal-port-web.tar.gz` | `/home/bengalpo/bengal-port-web` | ওয়েবসাইট অ্যাপ (www.bengalport.com) |

**.tar.gz** ফাইলগুলোই ব্যবহার করবেন: HostNil-এর আপলোড স্ক্যানার .zip ফাইল আটকে দেয়।

এই আপডেটে ডাটাবেসে 4টি পরিবর্তন যোগ হবে (নতুন স্টাফ রোল এবং বিজনেস ম্যানেজমেন্টের টেবিল)। এগুলো শুধু নতুন জিনিস যোগ করে; আগের কিছু মোছে না বা বদলায় না। লাইভ সাইটে যদি 12 নভেম্বরের আগের আপডেট (মডারেটর রোল, লেজার লিংক) এখনও না দেওয়া থাকে, সেগুলোও একই ধাপে চলে যাবে।

### শুরুর আগে (5 মিনিট)
1. **ব্যাকআপ নিন।** Admin → **Settings** → **Backup** → কম্পিউটারে ডাউনলোড করুন। (cPanel → JetBackup দ্বিতীয় কপি হিসেবে আছে।)
2. ব্যস্ততা কম এমন সময় বেছে নিন: অ্যাপ রিস্টার্টের সময় কয়েক মিনিট সাইট বন্ধ থাকবে।

### ধাপ 1 — API
1. cPanel → **Setup Node.js App** → **api.bengalport.com**-এর অ্যাপ → **STOP APP**।
2. cPanel → **File Manager** → `/home/bengalpo/bengal-port-api` খুলুন।
3. এই পুরনো জিনিসগুলো মুছে দিন: ফোল্ডার `dist`, `prisma`, `src`, `docs` (থাকলে), এবং ফাইল `server.cjs`, `package.json`।
   **মুছবেন না:** `.env`, `backups`, `node_modules`, `stderr.log`।
4. `bengal-port-api.tar.gz` এই ফোল্ডারে **Upload** করুন। ফাইলে রাইট-ক্লিক → **Extract** → এখানেই extract করুন। তারপর `.tar.gz` ফাইলটি মুছে দিন।
5. `.env` খুলে (Edit) দেখুন এই লাইনগুলো আছে কি না (10 নভেম্বর যোগ করা হয়েছিল; না থাকলে যোগ করুন):
   ```
   TOKIO_WORKER_THREADS="2"
   UV_THREADPOOL_SIZE="2"
   VIPS_CONCURRENCY="2"
   ```
   এবং `DATABASE_URL`-এর শেষে `&connection_limit=5` আছে কি না।
6. আবার **Setup Node.js App** → API অ্যাপ → **Run NPM Install**। (পেজ কনটেন্ট চেক নিয়ে লাল একটা মেসেজ এলে আগের মতোই উপেক্ষা করবেন।)
7. cPanel → **Terminal** খুলে এই দুটি লাইন চালান:
   ```
   source /home/bengalpo/nodevenv/bengal-port-api/24/bin/activate && cd /home/bengalpo/bengal-port-api
   npm run setup
   ```
   শেষে লেখা আসবে **All migrations have been successfully applied.** (`db:seed` আবার চালাবেন না; দরকার নেই।)
8. **Setup Node.js App** → API অ্যাপ → **START APP**।
9. **https://api.bengalport.com/api/health** খুলুন — দেখাবে `{"data":{"status":"ok"}}`।

### ধাপ 2 — ওয়েবসাইট
1. **Setup Node.js App** → **www.bengalport.com**-এর অ্যাপ → **STOP APP**।
2. **File Manager** → `/home/bengalpo/bengal-port-web` → ফোল্ডার `build` এবং ফাইল `server.cjs`, `package.json` মুছে দিন। **`.env` মুছবেন না।**
3. `bengal-port-web.tar.gz` আপলোড করুন → এখানেই **Extract** → `.tar.gz` মুছে দিন।
4. **START APP**।

### ধাপ 3 — যাচাই
1. **https://www.bengalport.com** খুলুন (নতুন ভার্সন লোড করতে একবার Ctrl+F5 চাপুন)।
2. Super Admin হিসেবে সাইন ইন করুন। মেনুতে এখন **Office** গ্রুপ থাকবে (Dashboard, Customers, Deals, Invoices, Collections, Finance, Hisab Kitab, Documents, Tasks, Approvals, Notifications, Audit log, Office settings, Admin guide)।
3. **Dashboard**, **Hisab Kitab** ও **Finance** একবার করে খুলুন (প্রথমবার খোলার সময় হিসাবের খাতাগুলো ও Head office শাখা নিজে থেকে তৈরি হয়)।

### ধাপ 4 — অ্যাডমিনে প্রথমবারের সেটিংস (একবারই)
1. **Office settings → Signature**: **Use it on invoices** চাপুন (বা সই আপলোড করুন), যাতে ইস্যু করা ইনভয়েসে সই থাকে।
2. **Office settings → Reminders and terms**: নমুনা **standard terms** বদলে আপনার নিজের শর্ত লিখুন; রিমাইন্ডারের দিন ও মুদ্রাগুলো দেখে নিন।
3. **Office settings → Branches**: অন্য অফিস থাকলে যোগ করুন।
4. **Users**: প্রত্যেক স্টাফকে তার রোল দিন (Employee, Accountant, Manager, Moderator)। **Office settings → Staff**: তাদের শাখা।
5. **Office settings → Roles and permissions**: দরকার হলে কোন রোল কী করতে পারবে বদলে নিন।
6. ঐচ্ছিক: শুরুর ব্যালান্স (প্রথম দিনের হাতে নগদ, ব্যাংকের ব্যালান্স) দিতে **Finance → Journal → New journal entry**।

### জেনে রাখুন
- **রিমাইন্ডার** (বকেয়া পেমেন্ট, ফলো-আপ, ডেডলাইন, মেয়াদ শেষ হতে চলা ডকুমেন্ট) API প্রতি 15 মিনিটে পাঠায়। নতুন কোনো cron job লাগবে না: হোমপেজের আগের cron অ্যাপগুলোকে সজাগ রাখে। রিমাইন্ডার **ইমেইলে** পেতে API-এর `.env`-এ SMTP লাইনগুলো পূরণ করতে হবে।
- **সাইট আবার চালু না হলে**: অ্যাপ ফোল্ডারের `stderr.log` (File Manager-এ) খুলে শেষের লাইনগুলো আমাকে পাঠান। আপনার ডেটা নিরাপদ: আপডেট শুধু টেবিল ও কলাম যোগ করে, আর প্রথম ধাপের ব্যাকআপ আপনার কাছে আছে।
- **`npm run setup` যদি `ALTER TYPE` লেখা কোনো এরর দিয়ে থেমে যায়**: মেসেজটি আমাকে পাঠান। (10 নভেম্বরের পুরনো PostgreSQL সমস্যা এড়িয়ে এই পরিবর্তনগুলো লেখা হয়েছে, তাই এটা হওয়ার কথা নয়।)
