# HeartStone Core and Platform Configuration

## Layering

```
HeartStone Core
    ↓
Jurisdiction Configuration
    ↓
Institution Configuration
    ↓
Department / Authority Configuration
    ↓
Government Services (catalog, service packs, workflows)
```

HeartStone Core provides institution-neutral primitives: government structure identifiers (`jurisdictionId`, `institutionId`, `governmentBodyId`, `departmentId`, `officeId`), authority evaluation, cases, evidence, decisions, issuance, instruments, institutional scope enforcement, and technical access.

Platform setup and deployment configuration supply country- and institution-specific content. Antigua and Barbuda and the ABSEZ authority are **reference deployments** configured on top of core — not implicit defaults inside core logic.

## What belongs in core

- Canonical models and APIs keyed by explicit government structure identifiers
- Generic enumerations (for example `INSTITUTION_OWNED`, `INSTITUTION_ISSUED`, `OPERATING_JURISDICTION`)
- Authority Engine evaluation, governing sources, and evidence-driven authority outcomes
- Institutional scope and record ownership resolution
- Service catalog mechanics (not institution-specific service names, SLAs, or fee schedules)

## What belongs in setup / configuration

- Jurisdiction and institution seed records (names, codes, types)
- Service pack manifests and institution-specific templates
- Department labels, case categories, escalation labels, retention rules, and fee schedules
- Institution-specific authority source references and workflow defaults
- Reference institutions such as ABSEZ for non-production acceptance fixtures

## Import boundary

- `src/platform-setup/` may depend on core modules.
- Core modules under `src/` **must not** import `platform-setup` implementation data.
- Legacy enum labels (`ABSEZ_OWNED`, `ABSEZ_ISSUED`, …) may remain in the database for history; runtime code normalizes them to institution-neutral values where needed.

## S10 remediation note

Remediation slice S10 introduced institution-neutral enum values, backfilled existing ABSEZ-labelled rows to generic equivalents, renamed `effectOnAbsezAction` to `effectOnInstitutionAction`, and changed default instrument issuer source to `INSTITUTION_ISSUED`. Further setup content (S11+) extends configuration without embedding institution assumptions in core services.
