# Bengal Port

Full-stack Bengal Port platform with a high-fidelity SvelteKit public site, Fastify REST API, PostgreSQL/Prisma data layer, user and admin areas, enquiries, applications, mock payments, receipts, opportunities and accounts.

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

Guest browsing and enquiries do not require an account. Member accounts support email verification, password recovery, password changes, optional email-code 2FA, profiles, and Google sign-in. Signed-in members follow their applications, enquiries, payments and receipts on `/dashboard`.

Sign-in codes are sent by email (see [Email](#email)). Without email configured, sign-up, password reset and 2FA are refused, because the code could not reach its owner. For local testing set `AUTH_DEV_CODES="true"` to have the code returned in the response and shown on screen; this switch is ignored when `NODE_ENV=production`.

For Google sign-in, create a Google OAuth 2.0 Web Client and set the same client ID as `GOOGLE_CLIENT_ID` for the backend and `PUBLIC_GOOGLE_CLIENT_ID` for the frontend. Add the local and deployed frontend URLs to its Authorized JavaScript origins.

## Email

Email is used for sign-in codes and notifications. With it configured, each new enquiry and application is emailed to the addresses in `ADMIN_NOTIFY_EMAIL` (comma-separated), and the person who submitted it receives a confirmation; applicants are sent their reference number. A mail failure is logged and never blocks the submission.

Settings (backend): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `EMAIL_FROM`, and one way of signing in:

- **Gmail with an app password (simplest).** Turn on 2-Step Verification for the Google account, create an app password at <https://myaccount.google.com/apppasswords>, and set `SMTP_HOST="smtp.gmail.com"`, `SMTP_PORT="465"`, `SMTP_USER` to the Gmail address and `SMTP_PASS` to the app password.
- **Gmail with OAuth keys from Google Cloud Console.** Leave `SMTP_PASS` empty and set `SMTP_OAUTH_CLIENT_ID`, `SMTP_OAUTH_CLIENT_SECRET` and `SMTP_OAUTH_REFRESH_TOKEN`. The refresh token must be issued for the `https://mail.google.com/` scope for the `SMTP_USER` account.

`EMAIL_FROM` should use the same Gmail address, for example `Bengal Port <you@gmail.com>`; Gmail replaces other sender addresses.

## Production

Production settings for the API:

- `NODE_ENV="production"`, a private `JWT_SECRET` (the API refuses to start without one) and the email settings above.
- `FRONTEND_URL`: the public site address(es), comma-separated, allowed to call the API. It must include the website's `ORIGIN`; otherwise pages load without their live content and the website log shows `Could not load …`.
- `API_PUBLIC_URL`: the public API address, used in uploaded image URLs.
- `TRUST_PROXY="true"` when the API sits behind a reverse proxy, as it does on cPanel, so rate limits apply per visitor rather than to the proxy.

Settings for the website: `ORIGIN` (its public address), `PUBLIC_API_URL` (the API address ending in `/api`), `PUBLIC_WHATSAPP_NUMBER` and `PUBLIC_GOOGLE_CLIENT_ID`. They are read when the website starts, so they can be changed without rebuilding.

Seeding a production database requires `SEED_ADMIN_PASSWORD` (12+ characters; the local default is rejected) and optionally `SEED_ADMIN_EMAIL`. It creates the admin account, page content and accounting categories only. Demo partners, enquiries, payments and ledger entries are added only with `SEED_DEMO_DATA="true"`.

### Deploying to cPanel

The API and the website each run as a cPanel **Node.js App** (Node 20.12 or newer), and the API needs a **PostgreSQL** database, either from cPanel or an external provider. These steps were tested by running both bundles standalone on a development machine, not on a cPanel server.

1. On your computer run `npm run package:cpanel`. It builds everything and writes `deploy/bengal-port-api.zip` and `deploy/bengal-port-web.zip`.
2. In cPanel create a PostgreSQL database and user, and two addresses, for example `example.com` for the website and `api.example.com` for the API.
3. **API.** Upload and extract `bengal-port-api.zip` into a folder outside `public_html`, such as `bengal-port-api`. Copy `.env.example` to `.env` in that folder and fill it in. In *Setup Node.js App* create an app with that folder as the application root, `api.example.com` as the URL and `server.cjs` as the startup file. Click *Run NPM Install*, then *Run JS script* → `setup` (creates the database tables), then `db:seed` (creates the admin account), then restart the app. `https://api.example.com/api/health` should answer `{"data":{"status":"ok"}}`.
4. **Website.** Upload and extract `bengal-port-web.zip` into another folder, such as `bengal-port-web`. Copy `.env.example` to `.env` and fill it in. Create a second Node.js App with that folder as the application root, `example.com` as the URL and `server.cjs` as the startup file, then start it. It has no packages to install.
5. Sign in at `/login` with the seed admin account and replace the starter content.

To update later, run `npm run package:cpanel` again, upload and extract the new zips over the old folders (your `.env` files are not in the zips), run `setup` for the API if there are new database changes, and restart both apps.

## Key API groups

`/api/auth`, `/api/enquiries`, `/api/applications`, `/api/opportunities`, `/api/suppliers`, `/api/factories`, `/api/education`, `/api/healthcare`, `/api/payments`, `/api/admin`, `/api/admin/accounts`.

The payment route uses a mock provider-compatible flow and creates a receipt atomically. Only administrators can record a payment, and a receipt can be opened only by an administrator or the customer it belongs to. Replace the payment service with a real provider adapter without changing receipt or application relationships.

The public enquiry and application endpoints accept 10 submissions per client every 10 minutes, and JSON request bodies are limited to 1 MB.

## CMS media storage

Authenticated administrators can upload images directly from the Homepage, Global Business, Global Education, Global Healthcare, opportunity, supplier and factory editors. Uploads are streamed through Sharp, auto-rotated using their embedded orientation, resized only when larger than the 2400×2400 delivery envelope, converted to WebP, and stored as PostgreSQL `BYTEA` records with dimensions, orientation and byte-size metadata. The raw source file is not retained.

Set `API_PUBLIC_URL` to the externally reachable API origin (without `/api`) so saved CMS image URLs work in production. Media is delivered from `/api/media/:id.webp` with an ETag and immutable one-year browser caching. The application does not impose a small upload-size limit; real deployment limits may still be imposed by the reverse proxy, available memory, PostgreSQL or hosting provider and should be configured for the server's capacity.
