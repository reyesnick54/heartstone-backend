# Phase 5 — Government Service Catalog & Dynamic Forms

## Objective

Publish discoverable government services with versioned configuration, preliminary eligibility guidance, dynamic intake forms, requirement checklists, and frontend-ready start packages — without creating applications, cases, decisions, or issued instruments.

## Conceptual separation

| Layer | Question answered |
|---|---|
| **GovernmentService** | WHAT is the stable service identity? |
| **GovernmentServiceVersion** | WHAT is the versioned published configuration? |
| **FunctionAuthorityRecord** | WHAT institutional authority governs the function? |
| **ServiceFunctionMapping** | HOW does the service bind to Phase 4 authority? |
| **Eligibility guidance** | WHAT preliminary outcome might apply? (not approval) |
| **FormDefinition / FormVersion** | WHAT is the exact approved intake structure? |
| **GovernmentServiceChecklistItem** | WHAT must be provided? |
| **Evidence verification** | Future Evidence Engine (Phase 6+) |
| **ServiceStartPackage** | WHAT frontend-ready pre-application configuration applies? |
| **Application + Case** | Phase 6 |
| **Decision + Issuance** | Later phases |

The evaluation result does not create authority. Eligibility guidance does not create approval.

## Canonical module

All Phase 5 service catalog and forms logic lives under `src/service-catalog/`.

Sub-phases delivered on this branch:

| Slice | Scope |
|---|---|
| **5A** | Core catalog models, admin CRUD, function mappings |
| **5G** | Public discovery, eligibility guidance, start packages |
| **5F** | Activation governance, publication governance, readiness |
| **5H** | Integration acceptance, must-fail invariants, representative fixtures |

## Core models

- `ServiceFamily` — catalog grouping
- `GovernmentService` — stable identity (`code`, `slug`, institution/department ownership)
- `GovernmentServiceVersion` — versioned configuration with maturity and public availability
- `ServiceFunctionMapping` — Phase 4 `FunctionAuthorityRecord` linkage
- `FormDefinition` / `FormVersion` — dynamic intake structure
- `GovernmentServiceFeeDefinition` — fee metadata only
- `GovernmentServiceEligibilityRule` — stored, operator-whitelisted rules
- `GovernmentServiceChecklistItem` — requirement checklist with configured basis
- `GovernmentServiceOutputDefinition` — expected output metadata (does not issue)
- `GovernmentServiceRedressRoute` — complaint/review route metadata (does not decide)
- `ServiceActivationRecord` — activation/publication audit trail

## Maturity vs availability

**Maturity** (`GovernmentServiceMaturityStatus`) tracks institutional readiness: DRAFT → … → ACCEPTED → ACTIVE → SUSPENDED/SUPERSEDED/RETIRED.

**Public availability** (`GovernmentServicePublicAvailability`) tracks what the public may see or start: HIDDEN, INFORMATION_ONLY, PRE_APPLICATION, PILOT_ONLY, ACTIVE, SUSPENDED, etc.

Ordinary admin PATCH endpoints cannot mutate maturity or availability. Those transitions require governed activation/publication services.

## Engines and services

| Service | Role |
|---|---|
| `PublicServiceDiscoveryService` | Public listing, detail, eligibility, start package |
| `ServiceReadinessService` | Technical/institutional/operational readiness assessment |
| `ServiceActivationService` | Governed acceptance, operational activation, suspension, supersession |
| `ServicePublicationGovernanceService` | Governed publication without operational activation |
| `ServiceCatalogLifecycleService` | Cache-aware lifecycle helpers |
| `ServiceCatalogCacheService` | Public listing cache with invalidation on suspension |

## Activation governance

- Draft services cannot appear in public ACTIVE listings
- CONFIGURED/TESTED services do not automatically become ACTIVE
- Activation requires authority evaluation through `ServiceActivationService`
- Inactive Phase 4 authority mappings block operational activation
- Suspended services block new start packages
- Superseded versions cannot be used for new starts (fingerprint/version pinning)
- Client-supplied `maturityStatus`, `publicAvailability`, `eligible`, `feeWaived`, etc. are never accepted

## Public API (`/api/v1/public/...`)

- `GET /public/services` — paginated public discovery
- `GET /public/services/:slug` — public detail (fees, dependencies, outputs, redress)
- `POST /public/services/:slug/eligibility` — preliminary non-binding guidance
- `GET /public/services/:slug/start-package` — version-pinned pre-application package
- `POST /public/services/match` — citizen need matching

## Administrative API (`/api/v1/service-catalog/...`)

- `POST/GET/PATCH /service-catalog/services` — service identity management
- `POST/GET/PATCH /service-catalog/service-versions/:id` — version configuration (no lifecycle via PATCH)
- `POST/GET /service-catalog/service-versions/:id/functions` — function authority mappings

Activation and publication are service-layer operations (`ServiceActivationService`, `ServicePublicationGovernanceService`) invoked by institutional workflows — not bypassed through ordinary update endpoints.

## Security invariants

- Stored eligibility rules use operator whitelist only — no arbitrary code execution
- Form definitions are structural metadata — no JavaScript execution
- Published FormVersions are immutable through public mutation paths
- Public mappers strip restricted fields (`internalNotes`, `sensitiveConfig`, governing source material)
- Service suspension invalidates cached active listings
- Expected licence/certificate outputs do not issue instruments
- Payment/fee/SLA metadata does not produce approval
- Technical test completion (`ServiceTestReadinessStatus`) is not institutional acceptance

## Explicit exclusions (Phase 5 boundary)

Phase 5 does NOT create persistent:

- Application
- Case
- CaseWorkflow
- EvidencePacket
- GovernmentDecision
- IssuedLicense
- IssuedPermit
- PaymentTransaction
- InspectionCase

## Sample fixtures

Representative NON_PRODUCTION fixtures live in:

- `src/service-catalog/fixtures/phase-5-representative-catalog.fixture.ts` — eight service families
- `test/helpers/public-service-discovery-fixtures.ts` — public discovery scenarios
- `test/helpers/phase-5f-activation-fixtures.ts` — activation governance scenarios

Every fixture is labeled `NON_PRODUCTION_SERVICE_CATALOG_TEST_ONLY` and demonstrates architecture only — not verified law or policy.

## Acceptance tests

| Suite | Path | Coverage |
|---|---|---|
| Must-fail invariants | `test/service-catalog-phase-5h.must-fail.e2e-spec.ts` | 40 architectural gates |
| E2E scenarios | `test/service-catalog-phase-5h.e2e-spec.ts` | 6 end-to-end flows |
| Phase boundary | `src/service-catalog/service-catalog-schema.spec.ts` | Schema coherence |
| Public discovery | `test/public-service-discovery.e2e-spec.ts` | Public API behavior |
| Activation governance | `test/service-catalog-phase-5f.activation.integration-spec.ts` | 5F integration |
