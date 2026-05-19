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
- Production admin seed credentials must not reuse the default `admin123` password.
- After the first login, change the admin password again from the dashboard to rotate away from any temporary bootstrap secret.

## Suggested Deployment Checklist

- Install dependencies.
- Configure all required environment variables.
- Run Prisma generate for the target environment.
- Create or verify the initial admin user with secure credentials.
- Build the app before release.
- Confirm document email sending with a staging mailbox.
- Confirm shared document links open, expire, and reject tampered signatures.

## Suggested Commands

```bash
npm run build
```

```bash
node prisma/seed-admin.cjs
```
