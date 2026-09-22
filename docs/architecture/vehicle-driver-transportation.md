# Vehicle, Driver & Transportation Registry Foundation

## Objective

Provide a jurisdiction-neutral transportation registry domain that supports driver licensing, vehicle registration, ownership history, inspections, roadworthiness, commercial permits, operator licensing, fleet registration, transfers, renewals, suspensions, testing, and compliance coordination. Legal substance arrives only through authenticated **Government Service Packs**, **Governing Sources**, and **Government Decisions**.

## Canonical module

All transportation foundation logic lives under `src/transportation/`.

## Conceptual separation

| Layer | Question answered |
|---|---|
| **Application / Case** | What is the administrative request? (Phase 6) |
| **DriverLicenseApplicationProfile** | What driver-licensing context is linked to that case? |
| **DriverTestRecord** | What testing step occurred? (not issuance) |
| **DriverMedicalRequirementReference** | What professional/external determination token exists? (not diagnosis) |
| **GovernmentDecision** | What authorized institutional decision was recorded? (Phase 8) |
| **DriverLicenseRecord** | What government-issued driver license exists? |
| **VehicleRegistration / VehicleOwnershipRecord** | What authoritative registration/ownership state exists? |
| **VehicleOwnershipHistory / VehicleTransfer** | How did ownership change over time? (append-only) |
| **VehicleInspection** | What inspection outcome was recorded? (not automatic registration revocation) |
| **TransportOperatorRecord / FleetRecord** | Who operates commercial or fleet transport under organization scope? |
| **TransportationStatusHistory** | How did lifecycle status change? (auditable) |

## Explicit boundaries

- Driver license application ≠ driver license
- Passing a driving test ≠ license issuance
- Payment ≠ license approval
- Inspection result ≠ registration decision unless configured workflow and governed action say so
- Medical/professional review reference ≠ diagnosis storage in transportation domain
- Technical administration ≠ license issuance
- AI assistance ≠ license approval
- Citizen access ≠ registering another person's vehicle without representative authority
- Fleet access requires organization scope

## Core models

- `DriverProfile` — driver dossier linked to `Identity` (not a duplicate Person)
- `DriverLicenseApplicationProfile` — case-linked profile with `doesNotIssueDriverLicense`
- `DriverLicenseRecord`, `DriverLicenseClass`, `DriverLicenseEndorsement` — issued license artifacts linked to decisions/instruments when present
- `DriverTestRecord` — test outcomes with `doesNotIssueLicense`
- `DriverMedicalRequirementReference` — controlled determination tokens (`storesDiagnosis = false`)
- `VehicleRecord`, `VehicleIdentifier` — configurable identifier schemes (VIN, plate, registration number, engine reference, external registry reference)
- `VehicleRegistration`, `VehicleOwnershipRecord`, `VehicleOwnershipHistory`, `VehicleTransfer` — versioned ownership/registration history
- `VehicleInspection` — links to `InspectionRecord` with `inspectionResultDoesNotRevokeRegistration`
- `VehicleRoadworthinessRecord`, `VehicleRestriction`, `VehicleComplianceRecord`
- `CommercialVehiclePermit`, `TransportPermit`, `TransportOperatorRecord`, `TransportOperatorLicense`
- `FleetRecord`, `FleetVehicle` — organization-scoped fleet linkage
- `TransportationRegistryEntry`, `TransportationStatusHistory` — registry index and lifecycle audit

## Integrations

| Platform capability | Transportation usage |
|---|---|
| Identity | Driver subjects and owners reference `Identity` |
| Organization | Fleet and operator records reference `Organization` |
| Applications & cases | `DriverLicenseApplicationProfile` links via `caseId` / `applicationId` |
| Scheduling | `DriverTestRecord` may reference `ServiceAppointment` |
| Evidence & records | MAF references on profiles and registry entries |
| Inspections & compliance | `VehicleInspection` → `InspectionRecord`; compliance via `VehicleComplianceRecord` |
| Authority & decisions | Licenses, registrations, transfers reference `GovernmentDecision` when authorized |
| Issuance | Credentials reference `OfficialInstrument` when issued |
| Payments | Fee events do not issue licenses (`TransportationActorPersona.PAYMENT_SYSTEM` blocked) |
| Redress | Decisions remain challengeable through existing redress modules |
| Integrations | Medical references may reference `ExternalAuthority` / `ProfessionalReviewRecord` by token |

## API surface (foundation)

- `POST /api/v1/transportation/driver-profiles`
- `GET /api/v1/transportation/driver-profiles/subject/:subjectIdentityId`
- `GET /api/v1/transportation/driver-license-application-profiles/:id`
- `GET /api/v1/transportation/public/vehicles/verify/:publicVerificationToken` — data-minimized verification

## Non-goals (foundation boundary)

This foundation does **not**:

- encode jurisdiction-specific traffic codes, point systems, or vehicle classes as hard-coded law
- auto-issue licenses on application submission, test pass, or payment
- store or infer medical diagnoses in transportation tables
- silently revoke registration from failed inspections without governed workflow
