# SafeBid

Hyperlocal community feed + verified services marketplace. Neighbors post what’s happening on the block. Service providers verify a government ID. Customers pay into **escrow**; funds release after the job is reviewed. SafeBid keeps **5%**.

This repository is a Phase-1 MVP:

1. Email/password auth (Google/Apple hooks included)
2. Geo-filtered community feed
3. Service listings and bookings
4. Escrow payments with a 5% platform commission
5. Stripe Identity (or demo mock) for provider KYC
6. Admin dashboard

## Architecture

```
frontend/   Next.js 14 App Router, Tailwind
backend/    Express + TypeScript, Prisma, Socket.io
mobile/     Expo (React Native) client
```

PostgreSQL is the source of truth. Wallet mutations use `SELECT … FOR UPDATE` so concurrent withdrawals cannot overdraft.

**Go live (real domain + iOS/Android):** see [LAUNCH.md](./LAUNCH.md).

## Quick start (local)

You need Node 20+ and PostgreSQL 16.

```bash
# database (if you installed Postgres locally)
createdb safebid   # already created in some environments

cp .env.example backend/.env   # or use the committed backend/.env for local demo
cd backend
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev          # http://localhost:4000   docs: /api/docs

cd ../frontend
npm install
npm run dev          # http://localhost:3000
```

Demo accounts (password `Neighborhood1!`):

| Email | Role |
| --- | --- |
| jordan@safebid.local | Neighbor |
| maya@safebid.local | Verified provider |
| luis@safebid.local | Verified provider |
| admin@safebid.local | Admin |

Payments and ID checks run in **mock mode** until you add Stripe keys. Set `MOCK_PAYMENTS=false` and `MOCK_IDENTITY=false` with real `STRIPE_SECRET_KEY` to use Stripe Connect + Stripe Identity.

## Escrow flow

```
CREATED  →  pay  →  funds ESCROWED on provider pending balance
         →  provider CONFIRMED → IN_PROGRESS → COMPLETED
         →  customer REVIEWED  → pending becomes available minus 5%
         →  any earlier state can CANCELLED (escrow refunded)
```

## Stripe (production)

- **Connect Express** for provider payouts (`POST /api/payments/connect/onboard`)
- **PaymentIntents** with `transfer_group` for destination transfers after review
- **Identity VerificationSessions** with matching selfie (`require_matching_selfie`)
- Webhook: `POST /api/payments/webhooks/stripe`

## Docker

```bash
docker compose up --build
```

## Tests

```bash
cd backend
# needs DATABASE_URL pointing at safebid_test
npx prisma migrate deploy
npm test
```

## Deploy

- Frontend: Vercel (`frontend/`, `NEXT_PUBLIC_API_URL` to the API origin)
- API: Render / Railway / Fly (`backend/`, run `prisma migrate deploy` on release)
- Database: managed Postgres
- Images: local `uploads/` volume, or swap the upload module for S3/Cloudinary
