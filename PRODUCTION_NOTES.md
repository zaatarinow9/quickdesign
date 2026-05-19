# Production Notes

## Required Environment Variables

- `DATABASE_URL`
- `ADMIN_SESSION_SECRET`
- `APP_URL` or `NEXT_PUBLIC_APP_URL`
- `ORDER_DOCUMENT_SHARE_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Supabase + Vercel Database Setup

- Create a Supabase project for this environment.
- Copy the Supabase **Session Pooler** PostgreSQL connection string and set it as `DATABASE_URL`.
- Use the Session Pooler URI exactly as Supabase provides it, including SSL/query parameters.
- Add the same `DATABASE_URL` value in Vercel Project Settings -> Environment Variables for the target environments.
- Do not commit credentials or modify tracked files with live secrets.

## Local Development Note

- This branch now targets PostgreSQL through Prisma.
- For local development, either point `DATABASE_URL` to a Supabase dev/staging database or keep the old SQLite workflow only on a separate branch.

## Security Expectations

- Use a unique `ADMIN_SESSION_SECRET` with at least 32 characters.
- Use a separate `ORDER_DOCUMENT_SHARE_SECRET` with at least 32 characters.
- Set `APP_URL` to the canonical production origin so document emails do not depend on request headers.
- Do not deploy with the default `admin / admin123` credentials.
- Shared document links are signed and expire automatically after 72 hours.
- SMTP credentials must stay server-side only and must never be exposed to client bundles.

## Admin Bootstrap

- For local development, `prisma/seed-admin.cjs` still falls back to `admin / admin123`.
- For production, set `ADMIN_SEED_USERNAME` and `ADMIN_SEED_PASSWORD` before running `node prisma/seed-admin.cjs`.
- `ADMIN_SEED_NAME` and `ADMIN_SEED_EMAIL` are optional overrides for the seeded admin account.
- Production admin seed credentials must not reuse the default `admin123` password.
- After the first login, change the admin password again from the dashboard to rotate away from any temporary bootstrap secret.

## Suggested Deployment Checklist

- Install dependencies.
- Configure all required environment variables in Vercel.
- Confirm `DATABASE_URL` uses the Supabase Session Pooler connection string.
- Run Prisma generate for the target environment.
- Push the Prisma schema to the target database.
- Seed the initial admin user with secure credentials.
- Seed the service catalog.
- Build the app before release.
- Confirm document email sending with a staging mailbox.
- Confirm shared document links open, expire, and reject tampered signatures.

## Vercel Environment Variables Checklist

- `DATABASE_URL`
- `ADMIN_SESSION_SECRET`
- `APP_URL` or `NEXT_PUBLIC_APP_URL`
- `ORDER_DOCUMENT_SHARE_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `ADMIN_SEED_USERNAME` before `seed:admin`
- `ADMIN_SEED_PASSWORD` before `seed:admin`
- `ADMIN_SEED_NAME` optional
- `ADMIN_SEED_EMAIL` optional

## Suggested Commands

```bash
npx prisma generate
```

```bash
npx prisma db push
```

```bash
node prisma/seed-admin.cjs
```

```bash
node prisma/seed-services.cjs
```

```bash
npm run build
```
