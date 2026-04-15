# dotlet

dotlet is a versioned configuration platform with:

- Next.js web app and API (`apps/web`)
- Node.js CLI (`apps/cli`)
- PostgreSQL via Drizzle
- Pluggable object storage (S3 or R2)

## Quick start

```bash
pnpm install
pnpm --filter web db:generate
pnpm dev
```

## Environment

Create `apps/web/.env.local` from `apps/web/.env.example`.

For CLI, default API URL is `http://localhost:3000` and can be overridden with:

```bash
dotlet login --api http://localhost:3000
```
