# Riviraa API

Express + TypeScript backend for the Riviraa e-commerce platform. Data is stored in **PostgreSQL** (via Prisma). On startup the API hydrates an in-memory cache from the DB; every write also persists back to PostgreSQL so data survives restarts.

## Database

PostgreSQL is required. Credentials live in `backend/.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=TEST1234
DB_NAME=E-commerce
DATABASE_URL="postgresql://postgres:TEST1234@localhost:5432/E-commerce?schema=public"
```

```bash
cd backend
npm install
npm run db:setup      # migrate schema + seed demo data
npm run dev
```

If this database was previously created with `db push` (tables exist, no migration history):

```bash
npm run db:migrate:resolve   # baseline the init migration
npm run db:seed              # optional re-seed
```

Other DB commands:
- `npm run db:migrate` — apply pending migrations (safe for prod/CI)
- `npm run db:migrate:dev -- <name>` — create a new migration from schema changes
- `npm run db:migrate:status` — show applied / pending migrations
- `npm run db:studio` — browse data in Prisma Studio
- `npm run db:reset` — wipe DB, re-apply migrations, and seed
- `npm run db:push` — push schema without migrations (prototyping only)

The API connects on startup and hydrates from PostgreSQL. Creates, updates, and deletes (users, products, cart, wishlist, orders, addresses, moderation, campaigns, etc.) are written to the database. Health check reports `database: "connected"`.


## Demo accounts

Password for all: `password123`

| Email | Role |
|-------|------|
| priya.sharma@email.com | customer |
| rahul@electronics.in | seller |
| anita.verma@marketplace.com | manager |
| vikram.singh@marketplace.com | admin |
| root@marketplace.com | superadmin |

Quick login by role: `POST /api/auth/demo/:role`  
(e.g. `/api/auth/demo/admin`)

## Auth

Send `Authorization: Bearer <token>` on protected routes.

## Frontend client

Import from `src/api`:

```ts
import { demoLogin, productsApi, moderationApi } from './api'

await demoLogin('admin')
const products = await productsApi.list({ category: 'Electronics' })
const stats = await moderationApi.stats()
```

Set `VITE_API_URL=http://localhost:3001/api` in a frontend `.env` if needed.

## Endpoint map

| Prefix | Domain |
|--------|--------|
| `/api/auth` | Register, login, OTP, OAuth stubs, me |
| `/api/products` | Catalog CRUD, search, reviews, flag |
| `/api/categories` | Categories |
| `/api/cart` | Cart |
| `/api/wishlist` | Wishlist |
| `/api/coupons` | Validate coupons |
| `/api/orders` | Place / track / cancel / return |
| `/api/users` | Profile, addresses, payment methods, admin users |
| `/api/sellers` | Onboarding, seller dashboard, admin seller mgmt |
| `/api/admin/moderation` | Flagged reviews & products |
| `/api/manager` | Escalations, approvals, inventory |
| `/api/admin/campaigns` | Marketing campaigns |
| `/api/analytics` | Dashboards & charts |
| `/api/superadmin` | Team, config, audit, finance, alerts |
| `/api/payments` | Intent, confirm, refund |
| `/api/notifications` | In-app notifications |
| `/api/reviews` | Helpful / flag |
