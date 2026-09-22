# Education, Student & Educational Institution Registry Foundation

## Objective

Provide jurisdiction-neutral education administration architecture for students, guardians, institutions, enrollment, academic records, credentials, scholarships, educator licensing, and inspections — without encoding national curriculum, grading rules, admission criteria, or accreditation standards. Substantive policy arrives through **Government Service Packs**, **Authority**, and **GovernmentDecision** / **OfficialInstrument** issuance flows.

## Canonical module

All education foundation logic lives under `src/education/`.

## Conceptual separation

| Concept | Meaning | Does NOT mean |
| ------- | ------- | ------------- |
| **StudentEducationProfile** | Education dossier pointer linked to `Identity` / `Person` | Official enrollment |
| **EducationAdmissionApplicationProfile** | Case-linked admission/enrollment request context | Admission or enrollment |
| **EnrollmentRecord** | Official enrollment lifecycle | Graduation or credential issuance |
| **AcademicRecord** | Versioned academic history with provenance | Government-issued credential |
| **TranscriptRecord** | Institution or authority transcript reference | Public grade disclosure |
| **AcademicCredential** | Government credential lifecycle when configured | School-issued report card |
| **CertificateRecord** | External or institution certificate evidence link | Automatic government verification |
| **ScholarshipApplicationProfile** | Scholarship request context | Scholarship award |
| **EducationInstitutionRegistration** | Provider registration intake | Accreditation or license |
| **EducationInstitutionLicense** | Government licensing linkage | Self-declared operating authority |
| **EducationInstitutionAccreditation** | Accreditation decision linkage | Institution self-accreditation |
| **GuardianEducationRelationship** | Configurable guardian access authority | Parental access to all records |

## Student identity

`StudentEducationProfile.studentIdentityId` references the canonical `Identity` row (and underlying `Person`). HeartStone does not introduce a parallel student identity system.

## Guardians and access

Guardian and representative access is modeled in `GuardianEducationRelationship` with:

- explicit relationship kind (legal guardian, parent, authorized representative, adult student self-access)
- status and effective dates
- JSON `authorizedAccessScopes` interpreted against jurisdiction policy (`EducationConfiguration.guardianAccessPolicyReference`)
- `parentDoesNotImplyFullAccess = true` by default

Enforcement is implemented in `EducationAccessService` (`assertStudentSelfAccess`, `assertGuardianAuthorizedAccess`).

## Privacy classifications

`EducationDataClassification` includes:

- `STUDENT_ACCESS`
- `GUARDIAN_AUTHORIZED`
- `INSTITUTION_ACCESS`
- `GOVERNMENT_AUTHORIZED`
- `RESTRICTED`
- `PUBLIC_VERIFICATION_ONLY`

Public verification (`PublicEducationVerificationService`) strips grades, transcripts, and identity identifiers.

## Institution licensing and accreditation

- **Registration** (`EducationInstitutionRegistration.registrationDoesNotAccredit`) records intake only.
- **Licensing** (`EducationInstitutionLicense`) links to `GovernmentDecision` / `OfficialInstrument` through existing issuance architecture.
- **Accreditation** (`EducationInstitutionAccreditation`) requires external or government authority; institutions cannot self-mark accredited (`EducationInstitution.doesNotSelfAccredit`, boundary guards).

## Academic records and corrections

Transcript changes append `TranscriptRecordCorrectionHistory` entries and increment `TranscriptRecord.versionNumber`. Destructive overwrite of verified transcript history is forbidden (`EducationBoundaryService.assertNoDestructiveTranscriptOverwrite`).

Government credentials integrate with Phase 8 decisions/instruments via optional `AcademicCredential.governmentDecisionId` and `officialInstrumentId`. External institution credentials may remain `CertificateRecord` + `EvidenceRecord` references.

## Core models

- Institution: `EducationInstitution`, `EducationInstitutionRegistration`, `EducationInstitutionLicense`, `EducationInstitutionAccreditation`, `EducationInstitutionStatusHistory`
- Student: `StudentEducationProfile`, `StudentInstitutionRelationship`, `GuardianEducationRelationship`, `EnrollmentRecord`, `EnrollmentHistory`, `EducationAdmissionApplicationProfile`
- Programs: `EducationProgram`, `EducationProgramVersion`, `CourseReference`, `QualificationReference`
- Records: `AcademicRecord`, `TranscriptRecord`, `TranscriptRecordCorrectionHistory`, `CertificateRecord`, `AcademicCredential`
- Support: `ScholarshipProgramReference`, `ScholarshipApplicationProfile`, `EducationGrantReference`, `StudentSupportProgramReference`
- Workforce: `EducatorProfileReference`, `EducatorLicenseRecord`, `ProfessionalEducationQualificationReference`
- Compliance: `EducationInspectionReference`, `EducationComplianceReference`, `EducationExternalDependency`
- Configuration: `EducationConfiguration`

## API surface (foundation)

- `POST /api/v1/education/institutions`
- `POST /api/v1/education/institutions/registrations`
- `POST /api/v1/education/students/profiles`
- `GET /api/v1/education/students/profiles/:id?requesterIdentityId=`
- `POST /api/v1/education/admission-application-profiles`
- `POST /api/v1/education/scholarship-application-profiles`
- `GET /api/v1/public/education/credentials/:credentialReference/verify`

## Non-goals (foundation boundary)

This foundation does **not**:

- encode jurisdiction-specific education law, curriculum, grading, admission, or accreditation standards
- treat applications, payments, or AI recommendations as enrollment, admission, or awards
- allow institutions to self-declare accreditation
- expose grades or full transcripts through public verification endpoints
