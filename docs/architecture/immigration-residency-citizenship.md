# Immigration, Visa, Residency & Citizenship Foundation

## Objective

Provide a jurisdiction-neutral immigration domain that extends HeartStone’s existing application, case, workflow, evidence, authority, decision, issuance, scheduling, communications, payment, redress, and integration layers without embedding country-specific immigration law. Legal substance arrives only through authenticated **Government Service Packs** and **Governing Sources**.

## Canonical module

All immigration foundation logic lives under `src/immigration/`.

## Conceptual separation

| Layer | Question answered |
|---|---|
| **Application / Case** | What is the administrative request and processing matter? (Phase 6) |
| **VisaApplicationProfile / ResidencyApplicationProfile / CitizenshipApplicationProfile** | What immigration-specific context is linked to that case? |
| **ImmigrationRequirementAssessment** | What eligibility or completeness guidance exists? (not approval) |
| **ImmigrationExternalCheck** | What authenticated external authority determination was received? |
| **ImmigrationInterview / BiometricRequirement** | What scheduled immigration steps occurred? (not decisions) |
| **GovernmentDecision** | What authorized institutional decision was recorded? (Phase 8) |
| **VisaPermissionRecord / ResidencyPermitRecord** | What immigration credential was issued and lifecycle-managed? |
| **ImmigrationStatusRecord / CitizenshipStatusRecord / ResidencyStatusRecord** | What authoritative immigration status exists at a point in time? |
| **ImmigrationStatusHistory** | How did status change over time? (append-only) |
| **ImmigrationCaseProjection** | What non-authoritative operational label is shown? |

## Explicit boundaries

- Immigration application ≠ immigration status
- Visa payment ≠ visa approval
- Eligibility guidance ≠ immigration decision
- Entry record ≠ citizenship
- Residency ≠ citizenship
- Work permit ≠ residency unless a configured policy link explicitly says otherwise
- Investment program enrollment ≠ citizenship approval
- AI recommendation ≠ immigration decision
- External authority determination ≠ HeartStone-owned fact unless authenticated

## Core models

- `ImmigrationProfile` — subject dossier with data classification and compartment references
- `TravelDocumentReference` — referenced travel document metadata (not a border entry record)
- `ImmigrationStatusRecord` + `ImmigrationStatusHistory` — authoritative, non-destructive status timeline
- `VisaApplicationProfile`, `ResidencyApplicationProfile`, `CitizenshipApplicationProfile` — case-linked profiles (`doesNotIssueVisa`, `doesNotCreateResidency`, `doesNotGrantCitizenship`)
- `VisaPermissionRecord`, `ResidencyPermitRecord` — issued credentials linked to decisions/instruments when present
- `ResidencyStatusRecord`, `CitizenshipStatusRecord` — status distinct from application profiles
- `ImmigrationSponsorship`, `DependentRelationship` — sponsor and family linkage with scoped access
- `ImmigrationRequirementAssessment` — guidance-only assessments (`isImmigrationDecision = false`)
- `ImmigrationInterview`, `BiometricRequirement` — scheduling integrations (`isDecision = false` on interviews)
- `ImmigrationExternalCheck` — authenticated external dependencies (border, law enforcement, security, health, labour, civil registry, consular, travel document validation)
- `ImmigrationRestriction` — conditions derived from authorized decisions
- `ImmigrationCaseProjection` — applicant/official read model with explicit disclaimer

## External dependencies

`ImmigrationExternalCheck` references `ExternalAuthority` and stores:

- dependency type
- authenticated payload hash (when `isAuthenticated`)
- recorder classification (liaison, integration, officer — never applicant)
- whether unresolved results block decisions (`blocksDecisionWhenRequired`)

HeartStone records receipt and coordination; it does not forge external determinations.

## Sensitive data

Profiles, travel documents, biometrics, and citizenship records carry `ImmigrationDataClassification` and optional compartment codes, aligned with records classification references on the master administrative file.

## Personas

Supported actor personas (see `ImmigrationActorPersona`) include applicant, sponsor, dependent, authorized representative, immigration officer, senior decision officer, and external authority liaison. Technical admin and AI personas are blocked from citizenship status changes and consequential approvals.

## Integrations

| Platform capability | Immigration usage |
|---|---|
| Applications & cases | Profiles link via `caseId` / `applicationId` |
| Workflow | Case workflow continues to orchestrate steps |
| Evidence & records | MAF and classification references on profiles |
| Authority & decisions | Status and credentials reference `GovernmentDecision` when authorized |
| Issuance | Credentials reference `OfficialInstrument` when issued |
| Scheduling | Interviews and biometrics reference `ServiceAppointment` |
| Payments | Fee events do not approve cases |
| Redress | Decisions remain challengeable through existing redress modules |
| Integrations | External checks via liaison/integration channels |

## API surface (foundation)

- `POST /api/v1/immigration/profiles` — create immigration profile
- `GET /api/v1/immigration/profiles/subject/:subjectIdentityId` — subject self-access
- `GET /api/v1/immigration/visa-application-profiles/:id` — read linked visa application profile

Additional orchestration endpoints will be introduced with service-pack-configured workflows.

## Non-goals (foundation boundary)

This foundation does **not**:

- encode nationality-specific visa categories or points tests
- auto-grant status on application submission or payment
- replace border entry systems or civil registry systems of record
- treat AI outputs as decisions or external authentications
