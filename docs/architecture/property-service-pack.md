# Land & Property Registry Service Pack

HeartStone exposes land and property registry administration through a governed **service pack** and a dedicated **`src/property-registry`** domain. Citizens and businesses use **experience APIs**; officials and departments use **registry workspaces**. All template rules remain **`NON_PRODUCTION`** and jurisdiction-bound.

## Separation of concerns

| Concern | Meaning |
|---|---|
| **Registry application** | Intake and review record; does not mutate title |
| **Transfer decision** | Authoritative disposition required before registry change |
| **Survey submission** | Evidentiary intake; does not alter parcel geometry by default |
| **Encumbrance registration** | Legal interest record with preserved history on release |
| **Certificate / extract** | Issued output referencing a specific registry version |

Applications, surveys, and payments must not imply title change without an authorized decision.

## Service pack

- Manifest id: `template-land-property-registry`
- On-disk template: `service-packs/templates/12-land-property-registry.pack.json`
- Authoring source: `src/service-catalog/service-packs/property-land-registry.template.ts`
- **14 NON_PRODUCTION template services** covering search, extracts, transfers, parcel lifecycle, encumbrances, surveys, corrections, valuation, and appeals
- Configures placeholder forms, parcel identifier schemes, applicant categories, evidence, professional/surveyor dependencies, title verification, external registry hooks, workflows, fees, tax/transfer dependencies, decision functions, issuance, communications, SLAs, redress, and dashboard indicators

Validation uses `validateServicePackManifest`.

## Domain module (`src/property-registry`)

- **Configuration**: `PropertyRegistryConfiguration` (jurisdiction-bound rules and public verification mode)
- **Parcels & interests**: `PropertyParcel`, `PropertyInterest`, preserved `PropertyOwnershipHistory`
- **Applications & decisions**: `PropertyRegistryApplication` with `mayMutateTitle = false`; `PropertyTransferDecision` gates registry updates
- **Encumbrances**: active records plus `PropertyEncumbranceHistory`
- **Surveys**: `PropertySurveySubmission` with `altersParcelGeometry = false` at intake
- **Certificates**: `PropertyRegistryCertificate.registryVersionNumber` references authoritative parcel version
- **Access**: `PropertyRegistryAccessService` with entitlement and representative scope enforcement

Administrative behavior is enforced in domain services; experience routes are read/projections plus official queue discovery.

## Experience APIs

### Citizen

- `GET /experience/citizen/property`
- `GET /experience/citizen/property/interests`
- `GET /experience/citizen/property/applications`
- `GET /experience/citizen/property/documents`
- `GET /experience/citizen/property/actions`

### Business

- `GET /experience/business/organizations/:organizationId/property`
- `GET /experience/business/organizations/:organizationId/property/interests`
- `GET /experience/business/organizations/:organizationId/property/transactions`
- `GET /experience/business/organizations/:organizationId/property/actions`

### Official workspace

- `GET /experience/official/property-registry/workspace`

Queues: transfers, surveys, corrections, encumbrances, releases, subdivisions, consolidations, title issuance, verification discrepancies, external dependency checks, SLA risk.

### Department

- `GET /experience/department/:departmentId/property-registry`

Department leadership view of registry queues and available official actions.

## Public verification

- `GET /public/property-registry/verify/:reference`
- Enabled only when jurisdiction configuration sets `publicVerificationMode = MINIMAL_FACTS`
- Returns minimized facts; excludes internal identifiers and sealed data

## Testing

- Service pack: `src/service-catalog/service-packs/property-land-registry.template.spec.ts`
- Domain invariants: `src/property-registry/property-registry-invariants.spec.ts`
- Must-fail gates: `src/property-registry/property-registry.must-fail.spec.ts`
- Integration: `test/property-service-pack.integration-spec.ts`

Mandatory invariants: pack validation, NON_PRODUCTION labeling, access boundaries, transfer decision gating, historical ownership and encumbrance preservation, survey non-mutation, platform admin exclusion from title mutation, and certificate registry version references.
