# Bengal Port

Full-stack Bengal Port platform with a high-fidelity SvelteKit public site, Fastify REST API, PostgreSQL/Prisma data layer, user and admin areas, enquiries, applications, payments, receipts, opportunities and accounts.

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 15+

## Setup

1. Copy `.env.example` to `.env`, `frontend/.env`, and `backend/.env` as appropriate. Set a strong `JWT_SECRET` and your PostgreSQL `DATABASE_URL`.
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run db:generate`
4. Create/apply the development migration: `npm run db:migrate`
5. Seed demo data: `npm run db:seed`
6. Start both apps: `npm run dev`

Frontend: `http://localhost:5173`  
API: `http://localhost:4000/api`

Local seed admin: `admin@bengalport.com` / `Admin123!`. This login is public, so it is for local development only; see [Production](#production) for seeding a real database.

Run the tests with `npm test`. The backend tests use the database in `backend/.env` and delete the rows they create.

## Optional member authentication

Guest browsing and enquiries do not require an account. Member accounts support email verification, password recovery, password changes, optional email-code 2FA, profiles, and Google sign-in. Signed-in members follow their applications, enquiries, payments and receipts on `/dashboard`. Changing or resetting a password signs the account out everywhere else, and a change of role takes effect immediately.

Sign-in codes are sent by email (see [Email](#email)). Without email configured, sign-up, password reset and 2FA are refused, because the code could not reach its owner. For local testing set `AUTH_DEV_CODES="true"` to have the code returned in the response and shown on screen; this switch is ignored when `NODE_ENV=production`.

For Google sign-in, create a Google OAuth 2.0 Web Client and set the same client ID as `GOOGLE_CLIENT_ID` for the backend and `PUBLIC_GOOGLE_CLIENT_ID` for the frontend. Add the local and deployed frontend URLs to its Authorized JavaScript origins.

## Email

Email is used for sign-in codes and notifications. With it configured, each new enquiry and application is emailed to the addresses in `ADMIN_NOTIFY_EMAIL` (comma-separated), and the person who submitted it receives a confirmation; applicants are sent their reference number. Applicants are also emailed when staff start reviewing, approve, decline or cancel their application, and when staff set a new amount due. A mail failure is logged and never blocks the submission.

Settings (backend): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `EMAIL_FROM`, and one way of signing in:

- **Gmail with an app password (simplest).** Turn on 2-Step Verification for the Google account, create an app password at <https://myaccount.google.com/apppasswords>, and set `SMTP_HOST="smtp.gmail.com"`, `SMTP_PORT="465"`, `SMTP_USER` to the Gmail address and `SMTP_PASS` to the app password.
- **Gmail with OAuth keys from Google Cloud Console.** Leave `SMTP_PASS` empty and set `SMTP_OAUTH_CLIENT_ID`, `SMTP_OAUTH_CLIENT_SECRET` and `SMTP_OAUTH_REFRESH_TOKEN`. The refresh token must be issued for the `https://mail.google.com/` scope for the `SMTP_USER` account.

`EMAIL_FROM` should use the same Gmail address, for example `Bengal Port <you@gmail.com>`; Gmail replaces other sender addresses.

## Online payment (bKash)

Paying online is optional for the customer. An enquiry is always free; an application can be paid in full or in part, straight after applying, later from the member dashboard, or without an account on `/pay` using the reference number plus the phone number or email the application was submitted with.

**What an application costs.** In Admin → Settings, each division has a service fee and a smallest part payment. A new application owes its division's fee; leave a fee at 0 if staff quote each application instead. The amount due can be set or changed per application in Admin → Applications → View. Payments recorded by staff (cash, bank transfer) count toward the same balance.

**How a payment works.** The site uses bKash Tokenized Checkout (API v2). The customer is sent to bKash's own page to approve the payment with their wallet PIN and is then sent back. The money is counted only when bKash itself confirms the payment; if that confirmation goes unanswered the payment is checked with bKash again rather than assumed. Each payment gets a receipt, which is emailed to the payer and can be opened through its own link without an account.

**Refunds.** In Admin → Payments, *Refund* sends all or part of a bKash payment back to the wallet that paid (bKash allows this for 60 days, in up to ten parts) and records it; for a payment taken by staff it records a refund staff made by hand. Refunded money is owed again on the application, the payer is emailed, and the receipt lists the refunds. If bKash does not answer, the refund is shown as waiting and its amount is held back until bKash's own records settle it. A refund made directly in the bKash merchant portal is not seen by the website, so make refunds here.

**Settings (backend).** Online payment stays switched off until all four keys are set:

- `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`: issued by bKash for your merchant account.
- `BKASH_BASE_URL`: `https://tokenized.sandbox.bka.sh` for testing (the default), and the live address bKash gives you, normally `https://tokenized.pay.bka.sh`, in production.
- `API_PUBLIC_URL` must be the public address of the API: bKash sends customers back to `<API_PUBLIC_URL>/api/payments/bkash/callback`, and `FRONTEND_URL` decides which site they then land on.

bKash allows two token requests per hour, so the API stores its token in the database and renews it only when needed. Do not run a second copy of the API with the same bKash credentials against a different database.

**Going live.** bKash normally asks you to complete a set of sandbox test cases with your own sandbox credentials before issuing live ones. Put the sandbox credentials in the API's `.env`, set a small fee, and run a payment through `/apply` and `/pay`; then switch the five `BKASH_*` values to the live ones and restart the API.

## Spam protection on the public forms

The enquiry and application forms are rate-limited per visitor and carry a hidden field that only automated scripts fill in; such submissions are discarded. For a stronger check, create a free **Cloudflare Turnstile** widget for your website address and set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in the API's settings. The forms then show Cloudflare's check to visitors (signed-in members are not asked), and the API refuses a guest submission that has not passed it. If Cloudflare cannot be reached, submissions are let through rather than lost. Admin → Settings shows whether the check is on.

## Production

Production settings for the API:

- `NODE_ENV="production"`, a private `JWT_SECRET` (the API refuses to start without one) and the email settings above.
- `FRONTEND_URL`: the public site address(es), comma-separated, allowed to call the API. It must include the website's `ORIGIN`; otherwise pages load without their live content and the website log shows `Could not load …`.
- `API_PUBLIC_URL`: the public API address, used in uploaded image URLs.
- `TRUST_PROXY="true"` when the API sits behind a reverse proxy, as it does on cPanel, so rate limits apply per visitor rather than to the proxy.

Settings for the website: `ORIGIN` (its public address), `PUBLIC_API_URL` (the API address ending in `/api`), `PUBLIC_WHATSAPP_NUMBER` and `PUBLIC_GOOGLE_CLIENT_ID`. They are read when the website starts, so they can be changed without rebuilding.

**Security headers.** Both apps send them without any setting. The website's content security policy (in `frontend/svelte.config.js`) lets pages load scripts only from the site itself, Google sign-in and the Cloudflare check on the public forms; the API's address from `PUBLIC_API_URL` is added when the site starts. If you embed something from another service (a map, a video, an analytics script), add its address there and rebuild, or the browser will block it. Over HTTPS both apps also tell browsers to keep using HTTPS for their own address for a year, so serve them over HTTPS from the first day.

Seeding a production database requires `SEED_ADMIN_PASSWORD` (12+ characters; the local default is rejected) and optionally `SEED_ADMIN_EMAIL`. It creates the admin account, page content and accounting categories only. Demo partners, enquiries, payments and ledger entries are added only with `SEED_DEMO_DATA="true"`.

### Deploying to cPanel

The API and the website each run as a cPanel **Node.js App** (Node 20.12 or newer), and the API needs a **PostgreSQL** database, either from cPanel or an external provider. These steps were tested by running both bundles standalone on a development machine, not on a cPanel server.

1. On your computer run `npm run package:cpanel`. It builds everything and writes `deploy/bengal-port-api.zip` and `deploy/bengal-port-web.zip`.
2. In cPanel create a PostgreSQL database and user, and two addresses, for example `example.com` for the website and `api.example.com` for the API.
3. **API.** Upload and extract `bengal-port-api.zip` into a folder outside `public_html`, such as `bengal-port-api`. Copy `.env.example` to `.env` in that folder and fill it in. In *Setup Node.js App* create an app with that folder as the application root, `api.example.com` as the URL and `server.cjs` as the startup file. Click *Run NPM Install*, then *Run JS script* → `setup` (creates the database tables), then `db:seed` (creates the admin account), then restart the app. `https://api.example.com/api/health` should answer `{"data":{"status":"ok"}}`.
4. **Website.** Upload and extract `bengal-port-web.zip` into another folder, such as `bengal-port-web`. Copy `.env.example` to `.env` and fill it in. Create a second Node.js App with that folder as the application root, `example.com` as the URL and `server.cjs` as the startup file, then start it. It has no packages to install.
5. Sign in at `/login` with the seed admin account and replace the starter content.

To update later, run `npm run package:cpanel` again, upload and extract the new zips over the old folders (your `.env` files are not in the zips), run `setup` for the API if there are new database changes, and restart both apps.

## Editing the website

Everything a visitor reads can be changed in the admin without touching code: **Website content** (homepage, header and footer, including the phone number, email, office address and social links used across the site), one editor per division page (Business, Education, Healthcare, Umrah), and the **About**, **Services** and **Contact** pages. Each save is a new revision; a page that is unpublished falls back to its built-in wording. The WhatsApp button uses `PUBLIC_WHATSAPP_NUMBER` from the website's settings.

## Key API groups

`/api/auth`, `/api/enquiries`, `/api/applications`, `/api/opportunities`, `/api/suppliers`, `/api/factories`, `/api/education`, `/api/healthcare`, `/api/payments`, `/api/admin`, `/api/admin/accounts`.

Payments are either made online through bKash (see [Online payment](#online-payment-bkash)) or recorded by an administrator after money is received another way (Admin → Payments → Record payment). Each one creates its receipt atomically. A receipt can be opened by an administrator, by the member it belongs to, or through the receipt link sent to the payer.

The public enquiry and application endpoints accept 10 submissions per client every 10 minutes, and JSON request bodies are limited to 1 MB.

Applicants can attach documents to an application (PDF, JPEG, PNG or WebP; 10 MB each; 10 per application). They are stored in PostgreSQL, are never public, and can be downloaded only by an administrator or the member who applied. A guest attaches files through an upload link that is valid for two hours after submitting.

## CMS media storage

Authenticated administrators can upload images directly from the Homepage, Global Business, Global Education, Global Healthcare, opportunity, supplier and factory editors. Uploads are streamed through Sharp, auto-rotated using their embedded orientation, resized only when larger than the 2400×2400 delivery envelope, converted to WebP, and stored as PostgreSQL `BYTEA` records with dimensions, orientation and byte-size metadata. The raw source file is not retained.

Set `API_PUBLIC_URL` to the externally reachable API origin (without `/api`) so saved CMS image URLs work in production. Media is delivered from `/api/media/:id.webp` with an ETag and immutable one-year browser caching. The application does not impose a small upload-size limit; real deployment limits may still be imposed by the reverse proxy, available memory, PostgreSQL or hosting provider and should be configured for the server's capacity.
