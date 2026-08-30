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

Seed admin: `admin@bengalport.com` / `Admin123!` (change immediately outside local development).

## Production

Run `npm run build`, configure production environment variables, apply migrations with `npx prisma migrate deploy -w backend`, and start the backend with `npm start -w backend`. Deploy the SvelteKit build using the adapter appropriate to your hosting provider.

## Key API groups

`/api/auth`, `/api/enquiries`, `/api/applications`, `/api/opportunities`, `/api/suppliers`, `/api/factories`, `/api/education`, `/api/healthcare`, `/api/payments`, `/api/admin`, `/api/admin/accounts`.

The payment route uses a mock provider-compatible flow and creates a receipt atomically. Replace the payment service with a real provider adapter without changing receipt or application relationships.

## CMS media storage

Authenticated administrators can upload images directly from the Homepage, Global Business, Global Education, Global Healthcare, opportunity, supplier and factory editors. Uploads are streamed through Sharp, auto-rotated using their embedded orientation, resized only when larger than the 2400×2400 delivery envelope, converted to WebP, and stored as PostgreSQL `BYTEA` records with dimensions, orientation and byte-size metadata. The raw source file is not retained.

Set `API_PUBLIC_URL` to the externally reachable API origin (without `/api`) so saved CMS image URLs work in production. Media is delivered from `/api/media/:id.webp` with an ETag and immutable one-year browser caching. The application does not impose a small upload-size limit; real deployment limits may still be imposed by the reverse proxy, available memory, PostgreSQL or hosting provider and should be configured for the server's capacity.
