# Runtime processes

One container image, three commands. Hosting configuration chooses which to run.

| Process | Command | Scale | Notes |
| --- | --- | --- | --- |
| API | `node dist/main.js` (default) | 2+ instances | Stateless. Health: `GET /api/v1/health` (liveness), `GET /api/v1/ready` (dependencies). |
| Worker | `node dist/worker.js` | 1+ instances | Workflow SLA and escalation jobs (lease-claimed, safe to scale); interval jobs such as renewal reminders run under a PostgreSQL advisory lock. Jobs record and notify only; none decides or issues. |
| Migrations | `node node_modules/prisma/build/index.js migrate deploy` | Once per release | Run as the pre-deploy/release step, never from the API. |

## Environment

All variables are documented in `.env.example`. Hosting-specific notes:

- `DATABASE_URL`: PostgreSQL 16 connection string.
- `REDIS_URL`: a managed Redis-compatible URL (`redis://user:password@host:port/db`). Takes
  precedence over `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`/`REDIS_DB`.
- `WORKER_POLL_INTERVAL_MS`, `WORKER_WORKFLOW_BATCH_SIZE`, `WORKER_RENEWAL_REMINDER_INTERVAL_MS`
  tune the worker.

## API contract

`openapi/openapi.json` is generated from the controllers with `npm run openapi:export`, without
a database. CI fails if it is stale. Frontends generate their typed client from it.
