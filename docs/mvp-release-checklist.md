# MVP Release Checklist

## Functional checks

- Signup/login/logout works.
- `dotlet login` device flow succeeds.
- `dotlet push`, `dotlet pull`, `dotlet history`, `dotlet devices` work.
- Public routes load at `/:username/:device/*path`.
- Private islets return 404 for non-owners.

## Operational checks

- Push and token endpoints are rate limited.
- Structured logs emitted for auth and push events.
- Environment values are present and validated in deployment config.

## Database backup and rollback playbook

1. **Pre-deploy backup**
   - Trigger managed PostgreSQL snapshot before applying migrations.
2. **Migration apply**
   - Run `pnpm --filter web db:migrate` in release job.
3. **Rollback**
   - If migration fails, restore latest pre-deploy snapshot.
   - Redeploy last known-good app build.
4. **Post-rollback verification**
   - Verify `/api/auth/session` and `/api/devices` health checks.
