# Medical Treatment Programs

HeartStone coordinates governed access to medical treatment programs without practicing medicine. The platform publishes and administers program metadata, applications, referrals, screenings, professional reviews, enrollments, and appointments while preserving medical-professional responsibility.

## Platform role

HeartStone may coordinate:

Citizen → Program Discovery → Application → Consent → Referral → Clinical Screening → Professional Decision → Enrollment → Appointment → Government/Provider Administration

HeartStone must not autonomously diagnose, prescribe, or determine medical treatment.

## Critical distinctions

| Concept | Does not equal |
| --- | --- |
| Treatment program discovery | Medical recommendation |
| Treatment application | Clinical eligibility or treatment authorization |
| Administrative eligibility | Clinical suitability |
| Referral | Guaranteed acceptance or enrollment |
| Payment | Treatment authorization or clinical eligibility |
| Enrollment | Clinical outcome |
| AI assistance | Medical judgment |

## Domain model (`src/healthcare/treatment`)

- **TreatmentProgram** / **TreatmentProgramVersion** — published program definitions and protocol versions
- **TreatmentProgramProvider** / **TreatmentProgramSite** — delivery network and capacity references
- **TreatmentProgramConditionReference** / **TreatmentProgramEligibilityCriterion** — informational and rule metadata (clinical criteria require professional determination)
- **TreatmentApplication** — case-linked intake (`doesNotAuthorizeTreatment`)
- **TreatmentReferral** / **TreatmentReferralSource** — professional referral workflow (`doesNotEqualEnrollment`)
- **TreatmentScreening** — scheduled clinical screening with patient-safe summaries only
- **TreatmentEligibilityReview** — authoritative clinical suitability record with professional identity, license context, evidence reference, and program version (not a generic authority evaluation)
- **TreatmentEnrollment** / **TreatmentEnrollmentStatusHistory** — governed enrollment lifecycle with append-only status history
- **TreatmentAppointmentReference** — links enrollments to **ServiceAppointment** with healthcare privacy classification
- **TreatmentCareTeamReference** — care team membership for provider scope
- **TreatmentProgramAuthorization** — separate government/administrative authorization (`doesNotAuthorizeClinicalCare`)
- **TreatmentProgramExternalDependency** — authenticated external dependencies
- **PatientTreatmentStatusProjection** — citizen-safe status and consent projection
- **HealthcareDataAccessPolicy** — governs provider access to patient treatment data

## Clinical decisions

Clinical suitability requires an authorized healthcare professional. **TreatmentEligibilityReview** stores:

- professional identity
- license number, authority, and validity
- decision timestamp (`finalizedAt`)
- basis/evidence reference
- treatment program version

Government administrative authority, when required, is recorded separately via `governmentAdministrativeEvaluationId` and must not substitute for professional judgment.

## Experience APIs

Citizen (patient-safe, session-scoped):

- `GET /experience/citizen/healthcare`
- `GET /experience/citizen/healthcare/profile`
- `GET /experience/citizen/healthcare/providers`
- `GET /experience/citizen/healthcare/programs`
- `GET /experience/citizen/healthcare/treatments`
- `GET /experience/citizen/healthcare/referrals`
- `GET /experience/citizen/healthcare/appointments`
- `GET /experience/citizen/healthcare/actions`

Provider (policy-scoped):

- `GET /experience/provider/healthcare/workspace`

Raw internal clinical notes are excluded from citizen projections unless explicit access policy permits.

## Scheduling

Healthcare appointments reuse **ServiceAppointment** through **TreatmentAppointmentReference**, adding **HealthcareAppointmentPrivacyClassification** for sensitive visit metadata.

## Security invariants

Must-fail tests in `treatment.must-fail.spec.ts` enforce cross-patient isolation, non-authorization of applications/referrals/payments, AI and platform-admin clinical boundaries, license validity, program suspension rules, and separation of clinical vs government authority.
