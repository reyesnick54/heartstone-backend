# Citizen Experience — Unified Government Services Discovery & Guided Start

## Objective

Provide a citizen-facing API surface where applicants can express what they need, discover the correct active government services, review eligibility guidance and requirements, and begin applications — without knowing which ministry or department provides the service.

The citizen experience layer is a **facade** over existing engines. It does not recreate catalog, form, eligibility, or application domain logic.

## Conceptual separation

| Layer | Question answered |
|---|---|
| **Citizen Experience API** | HOW does a citizen discover and start a service without institutional knowledge? |
| **PublicServiceDiscoveryService** | WHAT published services are discoverable and startable? |
| **Service Catalog** | WHAT is the versioned published configuration? |
| **ApplicationsService** | HOW is a canonical Application draft created and submitted? |

Citizen experience routes delegate to these engines. Preliminary eligibility guidance does not create approval. Fee metadata does not create approval. Service availability does not create entitlement.

## Canonical module

All citizen experience logic lives under `src/experience/`.

| Module | Scope |
|---|---|
| `ExperienceModule` | Top-level experience namespace |
| `CitizenExperienceModule` | Citizen-facing service discovery and guided start |

## Public API (`/api/v1/experience/citizen/...`)

| Method | Route | Auth | Delegates to |
|---|---|---|---|
| `GET` | `/experience/citizen/services` | Public | `PublicServiceDiscoveryService.listServices()` |
| `POST` | `/experience/citizen/services/match` | Public | `PublicServiceDiscoveryService.matchServices()` |
| `GET` | `/experience/citizen/services/:slug` | Public | `PublicServiceDiscoveryService.getServiceBySlug()` |
| `POST` | `/experience/citizen/services/:slug/eligibility` | Public | `PublicServiceDiscoveryService.evaluateEligibility()` |
| `GET` | `/experience/citizen/services/:slug/start` | Public | `PublicServiceDiscoveryService.getStartPackage()` + `FormRenderService.renderFormSchema()` |
| `POST` | `/experience/citizen/services/:slug/applications` | Session | `ApplicationsService.createDraft()` via slug-resolved start package |

The legacy public catalog routes under `/api/v1/public/services/...` remain available. Citizen experience routes provide the unified frontend namespace.

## Citizen service detail

`GET /experience/citizen/services/:slug` returns the same public detail projection as the catalog:

- plain-language service name and purpose
- service family
- responsible government institution/department
- applicant categories
- status/availability
- expected processing stages
- fees
- evidence/documents required (checklist metadata in start package)
- eligibility guidance metadata
- expected outputs
- validity/renewal metadata where available
- complaints/redress route
- dependencies
- whether the service can currently be started online

Restricted governing-source and internal configuration fields are stripped by the public mapper.

## Start experience

`GET /experience/citizen/services/:slug/start` returns a version-pinned start package enriched for frontend intake:

- service version and form version identifiers
- rendered form schema (`FormRenderService`)
- required field keys
- conditional checklist
- current fee metadata
- known dependencies
- declarations extracted from form schema
- expected next step guidance
- configuration fingerprint for pinning

Version pinning uses the same rules as the catalog start package:

- stale `configurationFingerprint` → `409 VERSION_SUPERSEDED`
- superseded version → `409 VERSION_SUPERSEDED`
- information-only services → `422` not startable
- suspended or non-startable availability → `404`

## Application creation

`POST /experience/citizen/services/:slug/applications` resolves the service slug to the current startable version via `getStartPackage()`, then creates a draft through the canonical `ApplicationsService`.

The client supplies:

- `configurationFingerprint` (from start package)
- `applicantCategory`
- optional `serviceVersionId` for explicit pinning
- optional `draftAnswers`
- optional representative authority fields

The service resolves `governmentServiceVersionId`, `formDefinitionId`, and `formVersionId` internally. Application ownership, submission immutability, and case creation remain governed by Phase 6 application-processing rules.

## Security and governance invariants

- Hidden services (`publicAvailability: HIDDEN`) are not listed or detailed
- Suspended services cannot be started or receive new applications
- Superseded versions cannot start new applications
- Preliminary eligibility is explicitly nonbinding
- Fee payment metadata does not produce approval
- Service availability does not create entitlement
- Public mappers strip restricted governing-source content
- Citizen experience cannot bypass service activation governance
- Cross-user application access remains blocked by ownership checks in `ApplicationsService`

## Relationship to Phase 5 and Phase 6

| Phase | Role in citizen experience |
|---|---|
| **Phase 5 — Service Catalog** | Discovery, eligibility guidance, start package, form rendering |
| **Phase 6 — Applications** | Draft creation, submission, case workflow |

Citizen experience is the unified public entry point that composes Phase 5 discovery with Phase 6 application intake.

## Tests

| File | Coverage |
|---|---|
| `src/experience/citizen/citizen-services.service.spec.ts` | Delegation, start enrichment, slug-based draft creation |
| `test/experience-citizen.e2e-spec.ts` | Discovery, matching, hidden/suspended guards, version pinning, eligibility disclaimers, slug applications, ownership, submission immutability |
