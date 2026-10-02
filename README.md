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

Guest browsing and enquiries do not require an account. Member accounts support email verification, password recovery, password changes, optional email-code 2FA, profiles, and Google sign-in.

For real OTP delivery, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` in `backend/.env`. Without SMTP, sign-up, password reset and 2FA are refused, because the code could not reach its owner. For local testing set `AUTH_DEV_CODES="true"` to have the code returned in the response and shown on screen; this switch is ignored when `NODE_ENV=production`.

## Email notifications

With SMTP configured, each new enquiry and application is emailed to the addresses in `ADMIN_NOTIFY_EMAIL` (comma-separated), and the person who submitted it receives a confirmation. Applicants are sent their reference number. A mail failure is logged and never blocks the submission.

For Google sign-in, create a Google OAuth 2.0 Web Client and set the same client ID as `GOOGLE_CLIENT_ID` in `backend/.env` and `PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env`. Add the local and deployed frontend URLs to its Authorized JavaScript origins.

## Production

Run `npm run build`, configure production environment variables, apply migrations with `npx prisma migrate deploy -w backend`, and start the backend with `npm start -w backend`. Deploy the SvelteKit build using the adapter appropriate to your hosting provider.

Backend environment for production:

- `NODE_ENV="production"`, a private `JWT_SECRET` (the API refuses to start without one) and the SMTP settings above.
- `FRONTEND_URL`: the public site origin(s), comma-separated, allowed to call the API.
- `API_PUBLIC_URL`: the public API origin, used in uploaded image URLs.
- `TRUST_PROXY="true"` when the API sits behind a reverse proxy or load balancer, so rate limits apply per visitor rather than to the proxy.
- If the server is not Windows, run `npm run db:generate` on it once so Prisma installs the engine for that platform.

Frontend environment: `PUBLIC_API_URL`, `PUBLIC_WHATSAPP_NUMBER` and `PUBLIC_GOOGLE_CLIENT_ID` are read when the frontend server starts, so they can be changed without rebuilding.

Seeding a production database (`NODE_ENV=production npm run db:seed`) requires `SEED_ADMIN_PASSWORD` (12+ characters; the local default is rejected) and optionally `SEED_ADMIN_EMAIL`. It creates the admin account, page content and accounting categories only. Demo partners, enquiries, payments and ledger entries are added only with `SEED_DEMO_DATA="true"`.

## Key API groups

`/api/auth`, `/api/enquiries`, `/api/applications`, `/api/opportunities`, `/api/suppliers`, `/api/factories`, `/api/education`, `/api/healthcare`, `/api/payments`, `/api/admin`, `/api/admin/accounts`.

The payment route uses a mock provider-compatible flow and creates a receipt atomically. Only administrators can record a payment, and a receipt can be opened only by an administrator or the customer it belongs to. Replace the payment service with a real provider adapter without changing receipt or application relationships.

The public enquiry and application endpoints accept 10 submissions per client every 10 minutes, and JSON request bodies are limited to 1 MB.

## CMS media storage

Authenticated administrators can upload images directly from the Homepage, Global Business, Global Education, Global Healthcare, opportunity, supplier and factory editors. Uploads are streamed through Sharp, auto-rotated using their embedded orientation, resized only when larger than the 2400×2400 delivery envelope, converted to WebP, and stored as PostgreSQL `BYTEA` records with dimensions, orientation and byte-size metadata. The raw source file is not retained.

Set `API_PUBLIC_URL` to the externally reachable API origin (without `/api`) so saved CMS image URLs work in production. Media is delivered from `/api/media/:id.webp` with an ETag and immutable one-year browser caching. The application does not impose a small upload-size limit; real deployment limits may still be imposed by the reverse proxy, available memory, PostgreSQL or hosting provider and should be configured for the server's capacity.
