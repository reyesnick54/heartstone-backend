# Labour, Employment & Workforce Regulation Foundation

## Objective

Provide a jurisdiction-neutral labour administration architecture for employer registration, workforce references, employment relationships, work permits, sponsorship, inspections, compliance linkages, complaints, disputes, and workforce reporting — without encoding any particular national labour code. Substantive rules arrive through **Government Service Packs**, **Authority**, and **GovernmentDecision** flows.

## Canonical module

All labour foundation logic lives under `src/labour/`.

## Conceptual separation

| Concept | Meaning | Does NOT mean |
| ------- | ------- | ------------- |
| **EmploymentRelationship** | Declared or registered employment link between employer and worker | Government work authorization |
| **EmploymentContractReference** | Document reference to a contract or declaration | Work permit or residency |
| **EmploymentDeclaration / EmployerWorkforceDeclaration** | Employer-submitted reporting | Verified government fact |
| **WorkPermitApplicationProfile** | Case-linked work permit request context | Issued work permit |
| **WorkPermitRecord** | Labour-domain work authorization credential lifecycle | Immigration residency status |
| **EmploymentSponsorship** | Employer sponsorship coordination | Immigration or labour authorization by itself |
| **EmploymentComplaint** | Filed allegation | Proven violation |
| **LabourInspectionReference** | Inspection finding linkage | Final enforcement decision |
| **LabourMarketDeterminationReference** | Labour-market test / approval reference | Automatic permit issuance |
| **ProfessionalQualificationReference** | Credential reference | Work authorization |

## Immigration coordination

When jurisdictions configure work-linked residency, HeartStone coordinates:

- `WorkPermitRecord.immigrationProfileId` and optional `linkedResidencyPermitRecordId`

Immigration profiles, residency permits, and labour work permits remain separate records with separate decisions. Neither domain auto-creates the other (`doesNotCreateResidency` on work permits; immigration application profiles still do not issue permits).

## Redress and compliance

- **Complaints / disputes** may reference `RedressMatter` for review pathways; filing does not assert violation.
- **LabourComplianceMatterReference** links Phase 9 `ComplianceMatter` rows without merging inspection findings into enforcement outcomes.
- **LabourInspectionReference** links Phase 7 inspection records with `isFinalEnforcementDecision = false` by default.

## Core models

- `EmployerRegistryRecord` — employer registration container (`doesNotSelfAuthorizeWorkers`)
- `WorkerProfileReference` — worker dossier pointer with privacy classification
- `EmploymentRelationship` + `EmploymentRelationshipHistory` — non-destructive employment timeline
- `EmploymentDeclaration`, `EmploymentContractReference`
- `OccupationClassificationReference`, `ProfessionalQualificationReference`
- `WorkPermitApplicationProfile`, `WorkPermitRecord`, `WorkPermitCondition`, `WorkPermitStatusHistory`
- `EmploymentSponsorship` — scoped JSON `authorizedScope`; `doesNotGrantAuthorization`
- `LabourMarketDeterminationReference`, `EmployerWorkforceProfile`, `EmployerWorkforceDeclaration`
- `LabourInspectionReference`, `LabourComplianceMatterReference`
- `EmploymentComplaint`, `EmploymentDispute`, `EmploymentTerminationNotification`
- `WorkplaceRequirementReference`, `LabourExternalDependency`

## Data privacy

`LabourDataClassification` scopes worker, employer, representative, and authority visibilities. Access enforcement is implemented in `LabourAccessService` (worker self-access, employer organization membership, active `RepresentativeAuthority`).

## API surface (foundation)

- `POST /api/v1/labour/employers/registry-records`
- `POST /api/v1/labour/workers/profile-references`
- `GET /api/v1/labour/workers/profile-references/:id?requesterIdentityId=`
- `POST /api/v1/labour/work-permit-application-profiles`
- `POST /api/v1/labour/employment-complaints`

Orchestration endpoints for inspections, disputes, and issuance will expand with service-pack workflows.

## Non-goals (foundation boundary)

This foundation does **not**:

- encode jurisdiction-specific wage floors, quota law, or occupational licensing statutes
- treat employer declarations or contracts as work authorization
- merge immigration residency with labour work permits
- treat payments, AI guidance, or complaints as approvals or violations
