# Remediation S14 — Tamper-evident audit ledger and governed configuration

## Objective

Provide an authoritative **government audit ledger** separate from application logs, plus a governed configuration change lifecycle with segregation of duties and effective dating.

| Concern                           | Canonical artifact                                                      |
| --------------------------------- | ----------------------------------------------------------------------- |
| Administrative / security audit   | `GovernmentAuditLedgerEntry` (hash-chained per stream)                  |
| Domain-specific operational audit | Existing domain tables (normalized into ledger where high-value)        |
| High-impact configuration         | `GovernedConfigurationChange` + `GovernedConfigurationEffectiveVersion` |

## Module location

```
src/audit-governance/
  audit-governance.module.ts
  ledger/
  configuration/
```

Registered globally from `AppModule` as `AuditGovernanceModule`.

## Hash chain boundary

Chains are **per `ledgerStreamKey`**:

- `institution:<uuid>` — institution-scoped government actions
- `platform` — platform-wide events without an institution scope

Concurrency uses PostgreSQL `pg_advisory_xact_lock(hashtext(stream))` plus monotonic `sequenceNumber` per stream.

## Append-only enforcement

- Service API rejects update/delete on ledger rows
- PostgreSQL trigger `government_audit_ledger_append_only` rejects `UPDATE`/`DELETE`
- Parent entities use `onDelete: Restrict` for ledger foreign keys

## Governed configuration lifecycle

`DRAFT` → `PROPOSED` → `IN_REVIEW` → `APPROVED` / `SCHEDULED` → `EFFECTIVE` → `SUPERSEDED` / `ROLLED_BACK`

- Proposer cannot approve the same change (segregation of duties)
- Future `scheduledEffectiveAt` prevents early activation
- Rollback creates a new governed change; prior history remains

## Integration (normalization)

Canonical ledger events are written for:

- Security audit (`SecurityAuditService`)
- Authority evaluations (`AuthorityEvaluationService`)
- Issuance (`IssuanceService`)
- Governed configuration transitions (`GovernedConfigurationChangeService`)

Domain-specific audit tables remain authoritative for their domains; the ledger records normalized high-value events without duplicating every low-level row.

## Verification API

- `GET /api/v1/audit-governance/ledger/streams/:ledgerStreamKey/verify`
- `GET /api/v1/audit-governance/institutions/:institutionId/ledger/verify`

Requires `audit:read`.
