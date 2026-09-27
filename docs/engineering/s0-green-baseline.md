# S0 — Verified Green Backend Baseline

This document records the **S0 remediation gate** for `heartstone-backend`: a reproducible, evidence-backed definition of “green” on `main` before further remediation (S1+).

**Status:** S0 verified green (no application repairs required on this baseline).

## Verified baseline commit

| Field | Value |
| --- | --- |
| Branch | `main` |
| HEAD SHA | `79e4763e0a0fc0849c99019d232b60714d18970d` |
| Verification date (UTC) | 2026-09-25 |
| Last known green CI on this SHA | [GitHub Actions run 35740539587](https://github.com/reyesnick54/heartstone-backend/actions/runs/35740539587) (`success`, 2026-09-22) |

## Runtime and infrastructure

| Component | Version / configuration |
| --- | --- |
| Node.js | `>=22` (engines); verified with **v22.14.0** |
| npm | **10.9.7** (`npm ci` via lockfile) |
| PostgreSQL | **16** (CI: `postgres:16-alpine`; local verification: Ubuntu PostgreSQL 16) |
| Redis | **7** (CI: `redis:7-alpine`; local verification: redis-server 7.x) |
| Test `DATABASE_URL` | `postgresql://heartstone:heartstone@localhost:5432/heartstone?schema=public` (matches `.github/workflows/ci.yml`) |
| Test Redis | `REDIS_HOST=localhost`, `REDIS_PORT=6379`, `REDIS_DB=0` |
| Prisma migrations | **76** SQL migrations under `prisma/migrations/` (`migration_lock.toml` provider: `postgresql`) |

Local Docker Compose (`docker-compose.yml`) uses a **different default Postgres password** (`heartstone_dev_password` in `.env.example`) than CI/tests. S0 verification for database-backed tests used the **CI-equivalent** credentials above.

## Canonical validation commands

### Dependency install (deterministic)

```bash
npm ci
```

`postinstall` runs `prisma generate`. Client output lives under `node_modules/@prisma/client` (not committed).

### Prisma

```bash
npx prisma validate
npx prisma format --check
npm run prisma:generate    # also via postinstall
npm run prisma:migrate:deploy   # requires Postgres; applies all migrations in order
```

### Static analysis and build

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
```

- **Typecheck:** `tsc --noEmit -p tsconfig.json` (`src/**/*`, `test/**/*`; excludes `tests/`, `src/instruments/`).
- **Lint:** ESLint on `{src,test}/**/*.ts` (`eslint.config.mjs`, strict TypeScript rules).
- **Format:** Prettier on `src/**/*.ts`, `test/**/*.ts`.

### Tests (Jest; `--runInBand`)

```bash
export NODE_ENV=test
export DATABASE_URL='postgresql://heartstone:heartstone@localhost:5432/heartstone?schema=public'
export REDIS_HOST=localhost REDIS_PORT=6379 REDIS_DB=0
export NODE_OPTIONS='--max-old-space-size=8192'   # matches CI test job

npm run test:unit
npm run test:integration
npm run test:e2e
```

| Suite | Config / pattern | Result (2026-09-25 local) |
| --- | --- | --- |
| Unit | `package.json` → `jest`; `*.spec.ts`; ignores `/test/`, `src/instruments/` | **199** suites, **3024** tests passed |
| Integration | `test/jest-integration.json` → `*.integration-spec.ts` | **42** suites, **307** tests passed |
| E2E | `test/jest-e2e.json` → `*.e2e-spec.ts` | **30** suites, **295** tests passed |

**Must-fail / security regression:** Included in the suites above (e.g. `*.must-fail.spec.ts`, `*.must-fail.e2e-spec.ts`, `test/security-regression.e2e-spec.ts`, `src/security/protected-route-manifest.spec.ts`). No separate npm script; not disabled for S0.

**Architecture / schema invariant tests:** Implemented as `*.spec.ts` / integration / e2e files under `src/` and `test/` (e.g. `*-schema.spec.ts`, `*-invariants.spec.ts`, phase `must-fail` suites).

### Supplementary scripts (not in CI workflow today)

Run manually for broader checks:

```bash
npm run security:manifest          # regenerates security/protected-route-manifest.json (timestamp only if routes unchanged)
npm run service-pack:validate -- service-packs/examples/*.pack.json
npm run service-pack:validate -- service-packs/templates/*.pack.json
```

### Explicitly out of S0 CI matrix

| Artifact | Notes |
| --- | --- |
| `tests/` (Vitest) | `vitest.e2e.config.ts` + `tests/**/*.test.ts` reference removed modules (e.g. `src/services/readiness`). **Not** wired in `package.json` or CI. Excluded from `tsconfig.json`. |
| `tests/must-fail/` | Placeholder only (`.gitkeep`, README). |
| `npm test` | Runs default Jest `*.spec.ts` only; **CI uses `test:unit` + integration + e2e** instead. |

## GitHub Actions (`.github/workflows/ci.yml`)

Two jobs on push/PR to `main`:

1. **Quality checks:** `npm ci` → `prisma:generate` → `typecheck` → `lint` → `format:check` → `build`
2. **Tests:** Postgres 16 + Redis 7 services → `npm ci` → `prisma:generate` → `prisma:migrate:deploy` → `test:unit` → `test:integration` → `test:e2e`

Concurrency: one run per ref; in-progress runs cancelled.

**Not run in CI (documented gap):** `prisma validate`, `prisma format --check`, `security:manifest` drift check, `service-pack:validate` on all packs.

## S0 execution log (2026-09-25)

Commands executed on clean `npm ci` at HEAD `79e4763…`:

1. `npm ci` — pass  
2. `npx prisma validate` — pass  
3. `npx prisma format --check` — pass  
4. `npm run typecheck` — pass  
5. `npm run lint` — pass  
6. `npm run format:check` — pass  
7. `npm run build` — pass  
8. `npm run prisma:migrate:deploy` — pass (schema up to date after apply)  
9. `npm run test:unit` — pass  
10. `npm run test:integration` — pass  
11. `npm run test:e2e` — pass  
12. `npm run security:manifest` — pass (only `generatedAt` timestamp delta vs committed file)  
13. `npm run service-pack:validate` on example packs — pass  

**Failures discovered:** none on `main` at this SHA.

**Repairs made for S0:** none (baseline already green). This PR adds only this engineering record.

**Generated artifacts:** No committed generated files are required for green status. `security/protected-route-manifest.json` is committed and stable aside from optional `generatedAt` refresh.

## Definition of “S0 green”

A clean checkout at the verified HEAD SHA is **S0 green** when all of the following succeed with the environment variables and infrastructure above:

1. `npm ci`  
2. Prisma schema validates and formats cleanly  
3. Prisma client generates  
4. All migrations apply sequentially (`prisma migrate deploy`)  
5. `npm run typecheck`, `lint`, `format:check`, `build`  
6. `npm run test:unit`, `test:integration`, `test:e2e` (including must-fail and security regression tests)  
7. GitHub Actions **Quality checks** and **Tests** jobs pass on the same commit  
8. No tests disabled, no historical migrations edited, no `--force` bypasses  

S0 green proves **engineering verification** only. It does **not** imply production readiness, institutional acceptance, or operational activation (see `docs/operations/production-readiness.md`).

## Remaining warnings (non-blocking for S0)

- npm audit reports **5 high** severity issues in transitive dev dependencies; not addressed in S0 (no baseline failure).  
- Deprecated transitive packages (`inflight`, old `glob`, pinned ESLint 9.x line) reported during `npm ci`.  
- Prisma CLI suggests upgrade to 8.x; stack remains on Prisma **6.16.x** per lockfile.  
- Root `README.md` still contains generic NestJS starter content alongside HeartStone local dev notes.  
- Orphan `tests/` + Vitest config not integrated into CI.  
- CI does not run explicit Prisma validate/format or service-pack validation on every pack file.

## NestJS module composition (reference)

Application entry: `src/app.module.ts` — global `ConfigModule` (Joi `envValidationSchema`), logging, `SecurityModule`, `DatabaseModule`, `RedisModule`, domain modules (government, identity, authority, service catalog, evidence, compliance, experience layers, domain packs, operational/production readiness, etc.). Controllers remain thin; domain logic in feature modules under `src/`.
