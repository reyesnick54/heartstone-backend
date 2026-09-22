# Civil Identity & Vital Records Service Pack (Template)

## Purpose

Demonstrates how HeartStone **Government Service Packs** can deploy a major civil-registry vertical using declarative configuration, shared workflow primitives, and experience projections—without bespoke standalone registry software.

This pack is **NON_PRODUCTION**. Legal requirements, forms, evidence rules, fees, SLAs, authority mappings, and integrations are **template placeholders** unless separately authenticated against governing sources.

## Pack identity

| Field | Value |
|---|---|
| Pack ID | `template-civil-identity-vital-records` |
| Label | `NON_PRODUCTION` |
| Manifest | `service-packs/templates/civil-identity-vital-records.pack.json` |
| TypeScript source | `src/service-catalog/service-packs/civil-registry-service-pack.manifest.ts` |
| Service family | `TEMPLATE-FAMILY-CIVIL-REGISTRY` |

Validate locally:

```bash
npm run service-pack:validate -- service-packs/templates/civil-identity-vital-records.pack.json
```

## Template services (10)

1. Register Birth
2. Request Birth Certificate / Certified Extract
3. Register Death
4. Request Death Certificate
5. Register Marriage
6. Request Marriage Certificate
7. Register Divorce / Civil Status Change
8. Legal Name Change Application
9. Civil Record Correction
10. Civil Registry Verification Service

Each service declares applicant categories, authority functions, forms, evidence, workflow stages, fees, outputs, redress, communications, dependencies, dashboard indicators, decision stages, issuance configuration, and lifecycle metadata using the standard service-pack schema (`schemaVersion` `1.0.0`).

## Domain module (runtime template)

Authoritative **template** vital-record state lives under `src/civil-registry/`:

- `CivilRegistryVitalRecord` — institutional record shell with sealed/restricted flags
- `CivilRegistryVitalRecordVersion` — immutable version chain for corrections/amendments
- `CivilRegistryEventSubmission` — case-linked submissions that are **not** official until registration decision
- `CivilRegistryRecordEntitlement` — explicit citizen visibility
- `CivilRegistryCertificate` — issuance queue linked to a **specific registry version**
- `CivilRegistryCertificateVerification` — public verification tokens without record disclosure

Prisma migration: `20260922120000_civil_registry_service_pack`.

## Citizen experience projections

Authenticated citizen BFF routes (no direct record download bypass):

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/v1/experience/citizen/civil-status` | Summary counts for entitled actor |
| GET | `/api/v1/experience/citizen/vital-records` | Entitlement-filtered list |
| GET | `/api/v1/experience/citizen/vital-records/:id` | Detail only when entitled |
| GET | `/api/v1/experience/citizen/certificates` | Certificates for entitled records |
| GET | `/api/v1/experience/citizen/civil-registry/actions` | Discover governed `GovernmentService` slugs |

Certificate requests are discovered via service slugs (for example `template-request-birth-certificate`) and flow through standard application intake—not raw registry export endpoints.

## Official workspace projections

`GET /api/v1/experience/official/workspace` includes a `civilRegistry` section with template queue indicators:

- Pending registrations
- Evidence deficiencies
- Correction requests
- Decision-ready registrations
- Certificate issuance queue
- Record amendment requests
- SLA risks (case clocks in scope)
- Restricted/sealed record warnings

Indicators are scoped to the official’s institutional case visibility. **Assignment does not imply authority.**

## Consequential actions

Domain routes under `/api/v1/civil-registry/...` use `ConsequentialActionGuard` for:

- Official vital event registration (`TEMPLATE-AUTH-CIVIL-EVENT-REGISTER`)
- Record correction approval (`TEMPLATE-AUTH-CIVIL-CORRECTION-APPROVE`)
- Authoritative certificate issuance (`TEMPLATE-AUTH-CIVIL-CERTIFICATE-ISSUE`)

Citizens may submit submissions and certificate **requests**; they cannot register, amend, or issue authoritative extracts.

## Public verification

`GET /api/v1/public/civil-registry/verify/:verificationCode`

Returns minimal metadata only:

- Verification reference / document hash / QR token reference (when configured)
- Issuer institution name
- Certificate type and validity status
- Registry version indicator

Does **not** return underlying vital-record fields or source evidence.

## Governance boundaries

- Pack validation ≠ institutional acceptance ≠ deployment ≠ operational activation.
- Template authority function codes are registry placeholders in `SERVICE_PACK_AUTHORITY_FUNCTION_REGISTRY`.
- Production jurisdictions must replace placeholders with authenticated `FunctionAuthorityRecord` mappings before activation.

## Tests

Integration coverage: `test/civil-registry-service-pack.integration-spec.ts`

Schema coherence: `src/civil-registry/civil-registry-schema.spec.ts`
