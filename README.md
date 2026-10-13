# dotlet

Make your environment portable. dotlet syncs and versions your dotfiles and config directories across devices.

Files you push are stored as **islets**: named, versioned snapshots of a file or directory, attached to a **device**. Islets and devices can be public or private, so you can share your setup or keep it to yourself.

- Web app: [https://dotlet.vercel.app](https://dotlet.vercel.app)
- Docs: [https://dotlet.vercel.app/docs](https://dotlet.vercel.app/docs)
- CLI on npm: [`dotlet`](https://www.npmjs.com/package/dotlet)

## Using the CLI

```bash
pnpm add -g dotlet

dot login
dot push ~/.zshrc
dot pull <islet>
```

See [apps/cli/README.md](apps/cli/README.md) for the full command reference.

## Stack

- `apps/web`: Next.js 16 web app and API, Better Auth, Drizzle ORM on PostgreSQL, S3 or Cloudflare R2 for file storage
- `apps/cli`: Node.js CLI built with Effect
- `packages/ui`: shared shadcn/ui components and styles
- `packages/typescript-config`: shared TypeScript configuration

The monorepo is managed with pnpm workspaces and Turbo.

## Development

Requirements: Node.js 20+, pnpm, and a PostgreSQL database.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # fill in the values
pnpm --filter web db:migrate
pnpm dev
```

The web app runs at [http://localhost:3000](http://localhost:3000). To work on the CLI against the local server, run `pnpm --filter dotlet dev`, which builds the CLI in watch mode with its base URL set to `http://localhost:3000`.

### Scripts

Run from the repository root:

| Command          | Description                      |
| ---------------- | -------------------------------- |
| `pnpm dev`       | Start the web app in development |
| `pnpm build`     | Build all apps and packages      |
| `pnpm typecheck` | Type check all packages          |
| `pnpm lint`      | Lint with oxlint                 |
| `pnpm format`    | Format with oxfmt                |
| `pnpm test`      | Run tests with Vitest            |
