# Education Government Service Pack

HeartStone provides national education administration through a governed **service pack** plus the **`src/education`** domain. Students and guardians use **citizen education experience** APIs; education providers represented as organizations use **business education** APIs; authorized officials use an **education workspace**. All template rules remain **`NON_PRODUCTION`**.

## Separation of concerns

| Concern | Meaning |
|---|---|
| **Application submission** | Records a request only (`doesNotGrantEnrollment`, `doesNotCreateAward`, `doesNotGrantFunds`) |
| **Official decision** | Enrollment, licensure, accreditation, scholarships, and grants require configured authority functions and decision workflow |
| **Guardian access** | Uses explicit `EducationGuardianRelationship` scope; historical relationships do not bypass student restrictions |
| **Public verification** | Institution license, accreditation, educator license, and government-recognized credentials only — never student records |

Recommendation, eligibility guidance, and AI assistance **do not** equal admission, award, accreditation, or licensure.

## Service pack

- Manifest id: `template-education-government`
- On-disk template: `service-packs/templates/13-education-government.pack.json`
- Authoring source: `src/service-catalog/service-packs/education-service-pack.template.ts`
- **16 NON_PRODUCTION template services** covering student registration, enrollment, transfers, institution registration/licensing, accreditation, educator licensing, scholarships, grants, support programs, transcripts, credential verification, record correction, inspections, and appeals
- Integration dependencies reference the **Integration Gateway** route codes for schools, universities, examination bodies, education registries, and student information systems (no embedded external credentials)

Validation uses the standard service-pack toolkit (`validateServicePackManifest`).

## Domain module (`src/education`)

- **Student profiles & guardian relationships**: `EducationStudentProfile`, `EducationGuardianRelationship`
- **Institution registry & licensing**: `EducationInstitutionRegistryRecord`, `EducationInstitutionLicenseRecord`
- **Accreditation & educator licensing**: `EducationAccreditationRecord`, `EducatorLicenseRecord` (institutions cannot self-accredit)
- **Enrollment & applications**: `EducationEnrollmentRecord`, `EducationEnrollmentApplicationProfile`
- **Scholarships & grants**: `ScholarshipApplicationProfile`, `ScholarshipAwardRecord` (award requires decision workflow), `EducationGrantApplicationProfile`
- **Records & corrections**: `EducationAcademicRecordReference`, `EducationRecordCorrection`, append-only `EducationRecordCorrectionHistory`
- **Inspections & external coordination**: `EducationInstitutionInspectionReference`, `EducationExternalDependency`
- **Public verification**: `/public/education/verify/*` exposes policy-permitted facts only

Administrative boundary markers live under `/api/v1/education/boundary`.

## Citizen / student experience

- `GET /experience/citizen/education`
- `GET /experience/citizen/education/enrollments`
- `GET /experience/citizen/education/credentials`
- `GET /experience/citizen/education/applications`
- `GET /experience/citizen/education/support`
- `GET /experience/citizen/education/actions`

Guardians reuse the citizen routes. Projections include dependent records only when an **active** guardian relationship grants the relevant scope keys (for example `viewDependentEnrollments`).

## Business / institution experience

- `GET /experience/business/organizations/:organizationId/education`
- `GET /experience/business/organizations/:organizationId/education/licensing`
- `GET /experience/business/organizations/:organizationId/education/accreditation`
- `GET /experience/business/organizations/:organizationId/education/inspections`
- `GET /experience/business/organizations/:organizationId/education/actions`

Access requires active organization membership and an `EducationInstitutionRegistryRecord` for the organization.

## Official education workspace

- `GET /experience/official/education/workspace`

Role-aware queue counts include student enrollment matters, institution registrations, licensing, accreditation, educator licensing, scholarships, grants, inspections, record corrections, appeals, and SLA risk.

## Testing

- Service pack: `src/service-catalog/service-packs/education-service-pack.template.spec.ts`
- Schema guard: `src/education/education-schema.spec.ts`
- Domain invariants: `src/education/education-invariants.spec.ts`
- Must-fail gates: `src/education/education.must-fail.spec.ts`
- Integration: `test/education-service-pack.integration-spec.ts`

Mandatory invariants covered: pack validation, NON_PRODUCTION labeling, student isolation, guardian active relationship scope, institution organization representation, self-accreditation block, scholarship application vs award separation, data-minimized public verification, official authority for accreditation, correction history preservation, AI exclusion for consequential education actions, and platform administrator exclusion from creating educational legal status.
