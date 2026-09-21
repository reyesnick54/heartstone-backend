# Government Service Packs

## Objective

Deploy an entire government service family, department, or ministry onto HeartStone using governed, versioned configuration rather than custom backend development for every service.

A service pack describes institutional structure and operational configuration as declarative metadata. It does not create legal authority, institutional acceptance, deployment, or operational activation by upload alone.

## Conceptual separation

| Layer | Question answered |
|---|---|
| **ServicePack** | WHAT is the stable pack identity? |
| **ServicePackVersion** | WHAT is the immutable versioned manifest? |
| **ServicePackComponent** | WHAT generic component does the manifest declare? |
| **ServicePackDependency** | WHAT external or existing reference must exist? |
| **ServicePackValidationResult** | DID the manifest pass structural and reference validation? |
| **ServicePackImport** | WHEN was a manifest received for review? |
| **ServicePackDeployment** | WHEN was a validated pack deployed? (future phase) |
| **ServicePackActivationRecord** | WHEN was a deployed pack operationally activated? (future phase) |
| **FunctionAuthorityRecord** | WHAT authenticated authority governs a function? |

Validation does not equal acceptance. Acceptance does not equal deployment. Deployment does not equal activation.

## Canonical module

All service pack logic lives under `src/service-packs/`.

## Status lifecycle

This module adds manifest validation status on top of the canonical deployment lifecycle documented in `service-pack-deployment-lifecycle.md`.

**Manifest validation** (`ServicePackManifestValidationStatus`):

`DRAFT → VALIDATING → INVALID | VALIDATED → PENDING_REVIEW`

**Version acceptance** (`ServicePackVersionStatus` on main):

`COMPILED → ACCEPTED`

**Deployment** (`ServicePackDeploymentStatus` on main):

`DEPLOYMENT_READY → DEPLOYED → OPERATIONALLY_INACTIVE → ACTIVE → SUSPENDED | ROLLED_BACK | SUPERSEDED`

Critical boundaries:

- **VALIDATED != ACCEPTED** — schema/reference validation succeeds; institutional acceptance is a separate governed act.
- **ACCEPTED != DEPLOYED** — acceptance freezes the manifest; deployment materializes configuration into domain models.
- **DEPLOYED != ACTIVE** — deployment creates entities; activation enables operational use under authority evaluation.

Accepted versions are immutable. Changes require a new `version` label.

## Manifest contract

Supported versions: `heartstone.service-pack/v1`

```json
{
  "manifestVersion": "heartstone.service-pack/v1",
  "servicePack": {
    "code": "immigration-services-pack",
    "name": "Immigration Services Pack",
    "versionLabel": "1.0.0"
  },
  "jurisdiction": { "code": "GD", "name": "Grenada" },
  "institution": { "code": "IMM", "name": "Immigration Authority" },
  "department": { "code": "IMM-VISAS", "name": "Visa Services Department" },
  "services": [],
  "authorityMappings": [],
  "forms": [],
  "evidenceRequirements": [],
  "workflows": [],
  "fees": [],
  "outputs": [],
  "slaRules": [],
  "communications": [],
  "integrations": [],
  "renewals": [],
  "compliance": [],
  "redress": [],
  "dashboardDefinitions": [],
  "dependencies": []
}
```

### Safety rules

- No arbitrary JavaScript, executable keys, or uncontrolled schema execution.
- Duplicate `code` / `dependencyCode` values are rejected.
- Manifest authority mappings must reference existing `FunctionAuthorityRecord` codes.
- Governing-source authenticity cannot be declared in the manifest.
- External dependencies (`EXTERNAL_AUTHORITY`, `EXTERNAL_REGISTRY`, `PAYMENT_PROVIDER`, `IDENTITY_PROVIDER`, `INTEGRATION`, `PROFESSIONAL`) cannot be marked `HEARTSTONE_CONTROLLED`.

## Component model

`ServicePackComponent` stores generic references rather than duplicating every domain model:

- `componentKind` — SERVICE, FORM, WORKFLOW, AUTHORITY_MAPPING, etc.
- `componentCode` — manifest-local identifier
- `manifestPath` — JSON pointer-style path
- `targetDomain` / `targetReferenceId` — populated during future deployment into canonical domain models

## Dependency model

`ServicePackDependency` records required references to:

- existing departments
- external authorities
- external registries
- payment providers
- identity providers
- integrations
- professional dependencies

Dependencies are validated against HeartStone records when `referenceId` or known codes are supplied. External dependencies remain externally controlled.

## Validation scope (current phase)

This phase implements schema validation only:

- structural manifest validation
- duplicate code detection
- executable content rejection
- authority trust boundary enforcement
- dependency reference checks against existing records
- persistence of validation results and parsed component/dependency indexes

This phase does **not** implement:

- deployment into government/service-catalog domains
- service activation
- decision creation
- governing-source authentication from manifest content

## Administrative API (`/api/v1/service-packs/...`)

- `GET /service-packs/boundary` — governance disclaimer
- `GET /service-packs/manifest-versions` — supported manifest schema versions
- `POST /service-packs` — create pack identity
- `GET /service-packs/:id` — retrieve pack and versions
- `POST /service-packs/:id/imports` — import manifest as draft version
- `POST /service-packs/versions/:versionId/validate` — validate manifest
- `GET /service-packs/versions/:versionId` — version detail
- `PATCH /service-packs/versions/:versionId` — update draft version only

No deploy or activate routes exist in this phase.

## Security invariants

- Client-supplied `status`, `immutable`, `acceptedAt`, and acceptance fields are rejected.
- Manifest upload does not activate services or create government decisions.
- Authority mappings bind only to existing Phase 4 `FunctionAuthorityRecord` architecture.
- Institutional acceptance requires explicit governed transition from `VALIDATED` to `ACCEPTED`.

## Relationship to ServiceStartPackage

`ServiceStartPackage` (Phase 5) is a runtime public projection for a single service version. Service packs are an administrative configuration bundle spanning institution, department, and multiple services. Deployment will map validated pack components into canonical domain models; it is intentionally not implemented in this foundation phase.
