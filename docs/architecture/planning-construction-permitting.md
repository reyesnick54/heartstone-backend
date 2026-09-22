# Planning, Development & Construction Permitting

## Objective

Document the jurisdiction-neutral **permitting foundation** for planning, development, construction, zoning, building approval, inspection, and occupancy workflows. Operational statute, land-use categories, and agency dependencies are supplied through **Government Service Packs** and institutional configuration — not hard-coded global enums.

See also: [Planning, Development & Construction Service Pack](./planning-construction-service-pack.md) for portal and template service coverage.

## Canonical module

Domain logic lives under `src/planning-construction/`. Experience projections live under `src/planning-construction/experience/`.

## Distinction from generic platform records

| Concept | Meaning | Does NOT mean |
| ------- | ------- | ------------- |
| **Application / Case** (Phase 6) | Generic intake and workflow | Permit issuance |
| **DevelopmentApplication** | Planning-specific application row on a project | Approved permit |
| **Professional plan / certification references** | Licensed professional material | Government approval |
| **DevelopmentInspection** | Domain inspection outcome | Occupancy authorization |
| **Completion reporting** | Holder or professional submission | Occupancy certificate |
| **DevelopmentOccupancyCertificate** | Official occupancy artifact | Automatic inspection pass |
| **ComplianceMatter** (Phase 9) | Post-issuance compliance | Duplicate planning application |

Use domain models for planning-specific state only; do not duplicate generic Application, Case, or Compliance roots.

## Development project anchor

`DevelopmentProject` references (via related records):

- **Property / parcel** — `DevelopmentProjectSite.parcelReference` (configured registry token; jurisdiction policy may require it before substantive review)
- **Applicant / organization** — `primaryApplicantIdentityId`, optional `organizationId`
- **Site** — `DevelopmentProjectSite`
- **Applications** — `DevelopmentApplication` (optional `caseId` link to Phase 6)
- **Permits** — versioned `DevelopmentPermit` / `DevelopmentPermitVersion`
- **Evidence** — Phase 7 `EvidenceRecord` via workflow and case linkage
- **Professionals** — `DevelopmentProjectProfessional`
- **Inspections** — `DevelopmentInspection` (Phase 7 `InspectionRecord` may be linked in extended workflows)
- **Fees** — `DevelopmentProjectFee` (payment ≠ approval)
- **Dependencies** — `DevelopmentExternalDependency`
- **Occupancy** — `DevelopmentOccupancyCertificate`
- **Appeals** — `DevelopmentPlanningAppeal`

## Zoning and land use

Zoning and land-use classifications are represented through **service pack configuration**, form answers, and evidence — not a global platform enum of categories. Authoritative determinations flow through review, external dependency resolution, and decisions.

## Permit lifecycle

```text
Application → Case (optional) → DevelopmentApplication → Review → Authority → Decision → DevelopmentPermit (+ versions) → Inspections / corrective actions → Occupancy
```

- Applicants and professionals **cannot** self-issue permits (`PlanningConstructionBoundaryService`).
- Fee payment records **do not** set permit approval (`DevelopmentFeeService`).
- **Amendments** create new `DevelopmentPermitVersion` rows; prior versions remain for audit.

## Inspections and corrective action

- Failed inspections retain outcome until reinspection is explicitly recorded.
- Corrective actions (`DevelopmentCorrectiveAction`) reference inspections but **do not erase** failure history.
- Inspection pass **does not** issue occupancy; occupancy requires governed decision references.

## External dependencies

`DevelopmentExternalDependency` supports configured agencies (fire, environmental, utilities, heritage, transport, property registry, health, and others). Dependencies with `blocksPermitDecision` must be **resolved** before permit issuance.

## Must-fail gates

Enforced in `planning-construction.must-fail.spec.ts` and boundary services:

- Planning / development application ≠ permit issuance
- Professional submission / certification ≠ automatic government approval
- Fee payment ≠ permit approval
- Construction inspection ≠ occupancy certificate
- Project access and restricted plan protection
- Authority evaluation required for official permit issuance
- AI assistance cannot issue permits
- Unresolved mandatory external dependencies block permit decisions
- Permit amendments preserve version history
- Corrective action does not erase inspection failure
- Occupancy certificate requires authorized completion decision

## Phase dependencies

| Phase | Relationship |
| ----- | ------------ |
| Phase 6 | Optional `Case` / `Application` linkage on `DevelopmentApplication` |
| Phase 7 | Evidence and inspection stack |
| Phase 4 | Authority evaluation for permit issuance |
| Phase 8 | `GovernmentDecision` for occupancy and consequential outcomes |
| Phase 9 | Corrective action and compliance handoff where configured |
