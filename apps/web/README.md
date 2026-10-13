# dotlet web

The dotlet web app and API, built with Next.js. It handles accounts, devices, islets, public profiles, and the documentation site, and serves the API used by the CLI.

## Stack

- Next.js 16 (App Router) and React 19
- Better Auth with email/password and GitHub OAuth
- Drizzle ORM on PostgreSQL
- S3 or Cloudflare R2 for islet file storage
- Cloudflare Email for transactional email
- UI components from `@workspace/ui` (shadcn/ui)

## Setup

Copy the example environment file and fill in the values:

```bash
cp .env.example .env.local
```

| Variable                                                                 | Description                                                |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `DATABASE_URL`                                                           | PostgreSQL connection string                               |
| `BETTER_AUTH_SECRET`                                                     | Auth secret, at least 32 chars (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`                                 | Public URL of the app, e.g. `http://localhost:3000`        |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`                               | GitHub OAuth app credentials                               |
| `CF_EMAIL_API_TOKEN`, `EMAIL_FROM`, `EMAIL_FROM_NAME`                    | Email sending configuration                                |
| `STORAGE_PROVIDER`                                                       | `s3` or `r2`                                               |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`     | S3 settings (when `STORAGE_PROVIDER=s3`)                   |
| `CF_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | R2 settings (when `STORAGE_PROVIDER=r2`)                   |

Apply database migrations, then start the dev server:

```bash
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command            | Description                                 |
| ------------------ | ------------------------------------------- |
| `pnpm dev`         | Start the development server                |
| `pnpm build`       | Build for production                        |
| `pnpm start`       | Start the production server                 |
| `pnpm db:generate` | Generate migrations from the Drizzle schema |
| `pnpm db:migrate`  | Apply migrations to the database            |
| `pnpm typecheck`   | Type check                                  |
| `pnpm lint`        | Lint with oxlint                            |
| `pnpm format`      | Format with oxfmt                           |
| `pnpm test`        | Run tests with Vitest                       |
