# Transportation Government Service Pack

HeartStone provides transportation administration (licensing, registration, inspection, operators, fleet, and appeals) through a governed **service pack** plus a dedicated **`src/transportation`** domain. Citizens and businesses consume **experience APIs**; officials use a **transportation workspace**. Public verification exposes **minimal permitted facts** only. All template rules remain **`NON_PRODUCTION`**.

## Separation of concerns

| Concern | Meaning |
|---|---|
| **Driver test completion** | Records examination outcome via `DriverTestRecord`; does **not** issue a license |
| **Vehicle inspection completion** | Records inspection outcome via `VehicleInspectionRecord`; does **not** approve registration |
| **Vehicle transfer** | Requires an explicit decision before ownership change (`VehicleTransferCase`) |
| **License / registration issuance** | Requires licensing authority evaluation and official instrument linkage when configured |
| **Public verification** | Returns status-level facts only; no holder identity or plate disclosure in citizen-facing verification |

## Service pack

- Manifest id: `template-transportation-government`
- On-disk template: `service-packs/templates/12-transportation-government.pack.json`
- Authoring source: `src/service-catalog/service-packs/transportation-government-service-pack.template.ts`
- **15 NON_PRODUCTION template services** covering driver licensing, vehicle registration, inspections, commercial operators, fleet, registry extracts, and appeals
- Jurisdiction-neutral placeholder forms, evidence, workflows, fees, communications, integrations, redress, and dashboard indicators

Validation uses the standard service-pack toolkit (`validateServicePackManifest`).

## Domain module (`src/transportation`)

- **Configuration**: `TransportationConfiguration` (`NON_PRODUCTION` rule environment, public verification mode)
- **Driver licensing**: `DriverLicenseRecord`, renewals (`DriverLicenseRenewalRecord`), tests (`DriverTestRecord`)
- **Vehicles**: `VehicleRecord`, registration applications, inspections, transfers
- **Commercial**: `TransportOperatorProfile`, `FleetVehicleRegistration`, `TransportPermit`
- **Redress**: `TransportationAppeal`
- **Access audit**: `TransportationAccessAudit`

Administrative mutations remain in domain services with boundary guards; experience routes are read-oriented projections unless explicitly extended in later phases.

## Scheduling

`DriverTestRecord` and `VehicleInspectionRecord` optionally link to `ServiceAppointment` for:

- Driver tests (`TEMPLATE-TRANS-APPT-DRIVER-TEST`)
- Vehicle inspections (`TEMPLATE-TRANS-APPT-VEHICLE-INSPECTION`)
- Identity / document verification (`TEMPLATE-TRANS-APPT-IDENTITY-VERIFY`)

Appointment completion does not substitute for licensing or registration decisions.

## Experience APIs

### Citizen

- `GET /experience/citizen/transportation`
- `GET /experience/citizen/driver-licenses`
- `GET /experience/citizen/vehicles`
- `GET /experience/citizen/vehicle-applications`
- `GET /experience/citizen/transportation/actions`

Projections are scoped to the authenticated identity. Vehicle records are filtered by **owner identity**; cross-subject access is denied and audited.

### Business

- `GET /experience/business/organizations/:organizationId/transportation`
- `GET /experience/business/organizations/:organizationId/fleet`
- `GET /experience/business/organizations/:organizationId/transport-permits`
- `GET /experience/business/organizations/:organizationId/transportation/actions`

Requires authorized organization membership (and representative scope when acting as a delegate).

### Official workspace

- `GET /experience/official/transportation/workspace`

Queue counts for driver licensing, testing, registration, transfers, inspections, operator licensing, fleet compliance, suspensions/revocations, appeals, and SLA risk. **Approval / issuance actions** are listed only when authority evaluation returns `ALLOW`.

## Public verification

- `GET /public/transportation/verify/license/:reference`
- `GET /public/transportation/verify/vehicle/:reference`
- `GET /public/transportation/verify/operator/:reference`

Returns minimal status (and license expiry where permitted). Disabled when configuration mode is not `MINIMAL_FACTS`.

## Testing

- Service pack: `src/service-catalog/service-packs/transportation-government-service-pack.template.spec.ts`
- Domain invariants: `src/transportation/transportation-invariants.spec.ts`
- Must-fail gates: `src/transportation/transportation.must-fail.spec.ts`
- Integration: `test/transportation-service-pack.integration-spec.ts`

Mandatory invariants covered: pack validation, NON_PRODUCTION labeling, citizen/business access boundaries, transfer decision requirement, test/inspection completion boundaries, suspended license representation, public verification minimization, representative scope, licensing authority for issuance, and renewal instrument lineage preservation.
