# Agent Instructions

This document provides instructions for AI agents working on this codebase.

## Package Management

This project uses **pnpm** as its package manager. Always use pnpm for all package operations:

- Installing packages: `pnpm add <package>`
- Running scripts: `pnpm <script-name>`
- **For shadcn/ui components**: Use `pnpm dlx shadcn@latest add <component>` (not `npx`)

Never use npm or yarn for this project.

## Monorepo Structure

This is a **monorepo** managed by Turbo and pnpm workspaces:

- **Apps**: Located in `apps/` directory (e.g., `apps/web/`)
- **Packages**: Shared packages in `packages/` directory (e.g., `packages/ui/`)
- **Turbo**: Used for running tasks across all packages efficiently
- **Workspace**: All packages are managed via `pnpm-workspace.yaml`

When working with packages:

- Use workspace protocol: `@repo/ui` (as defined in package.json)
- Run commands from root: `pnpm <command>` runs across all packages via Turbo
- Package-specific commands: `pnpm --filter <package-name> <command>`

---

When working on this project, always follow these steps before completing your work:

## 1. Type Check

```bash
pnpm typecheck
```

Run TypeScript compiler to check for type errors across all packages in the monorepo. Fix any type errors that appear.

## 2. Format and Lint

```bash
pnpm format
pnpm lint
```

## 3. Fix Issues

If any of the above commands fail or show errors:

- Read the error messages carefully
- Fix the issues in the relevant files
- Re-run the commands to verify fixes
- Repeat until all checks pass

## Important Notes

- Never commit code with type errors or linting issues
- Run `pnpm format` and `pnpm lint` (or `pnpm check`) before making commits to ensure code is properly formatted and linted
- All checks must pass before work is considered complete
- In a monorepo, ensure changes don't break dependencies between packages
- **Development-Only Flexibility**: This is a development project, so backward compatibility is not required; breaking API or database schema changes are acceptable, and database migrations/state can be reset or force-overwritten at any time.

## Documentation Guidelines

- **No Emojis**: Do not use emojis in any code, documentation, or README files
- **No File Structure**: Do not include file/folder structure diagrams in README files
- **No Random Documentation**: Do not create markdown documentation files unless explicitly requested by the user. This includes integration guides, feature documentation, or any other .md files

## Component Guidelines

- **Use shadcn/ui**: Always use shadcn/ui components when available. Do not create custom components that duplicate shadcn functionality
- **Add Components**: Use `pnpm dlx shadcn@latest add <component>` to add new shadcn components as needed
- **No Native Dialogs**: Never use native `alert()` or `confirm()` dialogs. Always use shadcn AlertDialog, Dialog, or Sonner toast components instead

## Code Cleanliness

- **Remove Unused Code**: If a variable, import, or function is unused, remove it entirely. Do not prefix with underscore unless it's intentionally unused but required (e.g., function parameters)
