# Blue Economy & Maritime Administration (S18D)

Bounded HeartStone service family for maritime and blue-economy administrative capability. This domain composes canonical platform systems—it does not duplicate organizations, persons, customs release, or generic inspection engines.

## Reusable platform composition

| Concern | Canonical HeartStone component |
|--------|---------------------------------|
| Vessel identity | `VesselRecord` (+ official registration references, provenance) |
| Owner / operator | `Identity`, `Organization`, `RepresentativeAuthority` via `VesselPartyRelationship` |
| Service delivery | Service pack `template-blue-economy-maritime` |
| Applications & cases | `MaritimeApplicationReference` → `Application` / `Case` |
| Inspections | `MaritimeVesselInspectionReference` → `InspectionRecord` |
| External / national determinations | `MaritimeExternalDependency` + `ExternalAuthority` |
| ABSEZ issuance (when configured) | `MaritimeAdministrativeInstrument` + authority evaluation + `OfficialInstrument` |
| Customs / port boundary | `MaritimeCustomsCaseReference` (reference only; no release) |
| Compliance | `MaritimeComplianceReference` → `ComplianceMatter` |
| Access control | `MaritimeAccessService` + `MaritimeDataAccessAudit` |

## Legal control

- No Antigua and Barbuda–specific maritime law, vessel categories, or port powers are embedded in core enums.
- Vessel type and service taxonomies live in `MaritimeConfiguration` JSON per jurisdiction.
- Competent external registration or port determinations are recorded—not manufactured—through `MaritimeExternalDependency`.

## Service pack

Template pack: `MARITIME_SERVICE_PACK_TEMPLATE` (`template-blue-economy-maritime`).

## Module layout

- `src/maritime/` — domain services, controllers, boundary and access gates
- `src/service-catalog/service-packs/maritime-service-pack.template.ts` — NON_PRODUCTION deployable manifest

## Invariants

See `MARITIME_INVARIANTS` in `src/maritime/maritime.constants.ts`.
