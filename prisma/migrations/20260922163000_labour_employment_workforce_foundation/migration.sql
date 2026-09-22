-- CreateEnum
CREATE TYPE "LabourDataClassification" AS ENUM ('PUBLIC', 'OFFICIAL', 'EMPLOYER_SCOPED', 'WORKER_SELF', 'PROTECTED_LABOUR', 'PROTECTED_WORKER', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "LabourActorPersona" AS ENUM ('WORKER', 'EMPLOYER', 'EMPLOYER_REPRESENTATIVE', 'AUTHORIZED_REPRESENTATIVE', 'LABOUR_OFFICER', 'SENIOR_DECISION_OFFICER', 'COMPLIANCE_OFFICER', 'EXTERNAL_AUTHORITY_LIAISON', 'TECHNICAL_ADMIN', 'AI_ASSISTANCE', 'PAYMENT_SYSTEM', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EmployerRegistryStatus" AS ENUM ('DRAFT', 'REGISTERED', 'SUSPENDED', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "EmploymentRelationshipStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WorkPermitApplicationProfileStatus" AS ENUM ('LINKED', 'ACTIVE', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "WorkPermitLifecycleStatus" AS ENUM ('NOT_ISSUED', 'PENDING_ISSUANCE', 'ISSUED', 'EFFECTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED', 'SUPERSEDED', 'SURRENDERED');

-- CreateEnum
CREATE TYPE "EmploymentDeclarationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EmploymentSponsorshipStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'LIMITED', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "EmploymentComplaintStatus" AS ENUM ('FILED', 'UNDER_REVIEW', 'REFERRED', 'CLOSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EmploymentDisputeStatus" AS ENUM ('OPEN', 'MEDIATION', 'ADJUDICATION', 'CLOSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "LabourExternalDependencyType" AS ENUM ('IMMIGRATION_RESIDENCY', 'IMMIGRATION_ENTRY', 'PROFESSIONAL_REGULATOR', 'OCCUPATIONAL_SAFETY', 'HEALTH_SCREENING', 'CRIMINAL_RECORD', 'EDUCATION_CREDENTIAL', 'OTHER_AUTHORIZED');

-- CreateEnum
CREATE TYPE "LabourExternalDependencyRecordedBy" AS ENUM ('EXTERNAL_AUTHORITY_LIAISON', 'INTEGRATION_SYSTEM', 'LABOUR_OFFICER', 'SYSTEM');

-- CreateTable
CREATE TABLE "employer_registry_records" (
    "id" UUID NOT NULL,
    "registryNumber" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "jurisdictionId" UUID,
    "institutionId" UUID,
    "masterAdministrativeFileId" UUID,
    "registrationStatus" "EmployerRegistryStatus" NOT NULL DEFAULT 'DRAFT',
    "doesNotSelfAuthorizeWorkers" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" "LabourDataClassification" NOT NULL DEFAULT 'EMPLOYER_SCOPED',
    "registeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employer_registry_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_profile_references" (
    "id" UUID NOT NULL,
    "profileReferenceNumber" TEXT NOT NULL,
    "workerIdentityId" UUID NOT NULL,
    "jurisdictionId" UUID,
    "masterAdministrativeFileId" UUID,
    "dataClassification" "LabourDataClassification" NOT NULL DEFAULT 'PROTECTED_WORKER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_profile_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occupation_classification_references" (
    "id" UUID NOT NULL,
    "classificationCode" TEXT NOT NULL,
    "classificationLabel" TEXT NOT NULL,
    "schemeReference" TEXT,
    "jurisdictionId" UUID,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occupation_classification_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_relationships" (
    "id" UUID NOT NULL,
    "relationshipNumber" TEXT NOT NULL,
    "employerRegistryRecordId" UUID NOT NULL,
    "workerProfileReferenceId" UUID NOT NULL,
    "occupationClassificationId" UUID,
    "roleTitle" TEXT NOT NULL,
    "status" "EmploymentRelationshipStatus" NOT NULL DEFAULT 'PROPOSED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isGovernmentWorkAuthorization" BOOLEAN NOT NULL DEFAULT false,
    "currentWorkPermitRecordId" UUID,
    "dataClassification" "LabourDataClassification" NOT NULL DEFAULT 'PROTECTED_LABOUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_relationship_history" (
    "id" UUID NOT NULL,
    "employmentRelationshipId" UUID NOT NULL,
    "employerRegistryRecordId" UUID NOT NULL,
    "workerProfileReferenceId" UUID NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "workPermitRecordId" UUID,
    "changeReason" TEXT,
    "actorIdentityId" UUID,
    "actorPersona" "LabourActorPersona" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_relationship_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_declarations" (
    "id" UUID NOT NULL,
    "declarationReference" TEXT NOT NULL,
    "employerRegistryRecordId" UUID NOT NULL,
    "employmentRelationshipId" UUID,
    "caseId" UUID,
    "status" "EmploymentDeclarationStatus" NOT NULL DEFAULT 'DRAFT',
    "isVerifiedGovernmentFact" BOOLEAN NOT NULL DEFAULT false,
    "declaredAt" TIMESTAMP(3),
    "payloadSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_contract_references" (
    "id" UUID NOT NULL,
    "contractReferenceToken" TEXT NOT NULL,
    "employmentRelationshipId" UUID NOT NULL,
    "documentRecordId" UUID,
    "doesNotAuthorizeWork" BOOLEAN NOT NULL DEFAULT true,
    "doesNotIssueWorkPermit" BOOLEAN NOT NULL DEFAULT true,
    "referencedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_contract_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_permit_application_profiles" (
    "id" UUID NOT NULL,
    "profileNumber" TEXT NOT NULL,
    "workerProfileReferenceId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "immigrationProfileId" UUID,
    "status" "WorkPermitApplicationProfileStatus" NOT NULL DEFAULT 'LINKED',
    "submissionAcknowledgedAt" TIMESTAMP(3),
    "doesNotIssueWorkPermit" BOOLEAN NOT NULL DEFAULT true,
    "paymentDoesNotApprove" BOOLEAN NOT NULL DEFAULT true,
    "serviceCategoryCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_permit_application_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_permit_records" (
    "id" UUID NOT NULL,
    "permitNumber" TEXT NOT NULL,
    "workerProfileReferenceId" UUID NOT NULL,
    "employerRegistryRecordId" UUID,
    "workPermitApplicationProfileId" UUID,
    "immigrationProfileId" UUID,
    "linkedResidencyPermitRecordId" UUID,
    "governmentDecisionId" UUID,
    "officialInstrumentId" UUID,
    "lifecycleStatus" "WorkPermitLifecycleStatus" NOT NULL DEFAULT 'NOT_ISSUED',
    "doesNotCreateResidency" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "renewalOfPermitId" UUID,
    "dataClassification" "LabourDataClassification" NOT NULL DEFAULT 'PROTECTED_LABOUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_permit_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_permit_conditions" (
    "id" UUID NOT NULL,
    "workPermitRecordId" UUID NOT NULL,
    "conditionCode" TEXT NOT NULL,
    "conditionSummary" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_permit_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_permit_status_history" (
    "id" UUID NOT NULL,
    "workPermitRecordId" UUID NOT NULL,
    "fromStatus" "WorkPermitLifecycleStatus",
    "toStatus" "WorkPermitLifecycleStatus" NOT NULL,
    "actorIdentityId" UUID,
    "actorPersona" "LabourActorPersona" NOT NULL,
    "reason" TEXT,
    "governmentDecisionId" UUID,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_permit_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_sponsorships" (
    "id" UUID NOT NULL,
    "sponsorshipNumber" TEXT NOT NULL,
    "employerRegistryRecordId" UUID NOT NULL,
    "workerProfileReferenceId" UUID NOT NULL,
    "employmentRelationshipId" UUID,
    "caseId" UUID,
    "immigrationProfileId" UUID,
    "status" "EmploymentSponsorshipStatus" NOT NULL DEFAULT 'PROPOSED',
    "doesNotGrantAuthorization" BOOLEAN NOT NULL DEFAULT true,
    "authorizedScope" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_sponsorships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_market_determination_references" (
    "id" UUID NOT NULL,
    "determinationReference" TEXT NOT NULL,
    "caseId" UUID,
    "outcomeCode" TEXT,
    "isLabourDecision" BOOLEAN NOT NULL DEFAULT false,
    "governmentDecisionId" UUID,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labour_market_determination_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_qualification_references" (
    "id" UUID NOT NULL,
    "workerProfileReferenceId" UUID NOT NULL,
    "qualificationCode" TEXT NOT NULL,
    "issuingBodyReference" TEXT,
    "isWorkAuthorization" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_qualification_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employer_workforce_profiles" (
    "id" UUID NOT NULL,
    "employerRegistryRecordId" UUID NOT NULL,
    "configuredQuotaLimit" INTEGER,
    "currentHeadcountReported" INTEGER,
    "quotaConfigured" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employer_workforce_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employer_workforce_declarations" (
    "id" UUID NOT NULL,
    "employerRegistryRecordId" UUID NOT NULL,
    "declarationReference" TEXT NOT NULL,
    "reportingPeriodCode" TEXT,
    "headcountDeclared" INTEGER,
    "isVerifiedGovernmentFact" BOOLEAN NOT NULL DEFAULT false,
    "declaredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employer_workforce_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_inspection_references" (
    "id" UUID NOT NULL,
    "inspectionRecordId" UUID NOT NULL,
    "employerRegistryRecordId" UUID,
    "findingSummary" TEXT,
    "isFinalEnforcementDecision" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labour_inspection_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_compliance_matter_references" (
    "id" UUID NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "employerRegistryRecordId" UUID,
    "workerProfileReferenceId" UUID,
    "linkageRole" TEXT NOT NULL DEFAULT 'RELATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labour_compliance_matter_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_complaints" (
    "id" UUID NOT NULL,
    "complaintReference" TEXT NOT NULL,
    "workerProfileReferenceId" UUID,
    "employerRegistryRecordId" UUID,
    "caseId" UUID,
    "redressMatterId" UUID,
    "status" "EmploymentComplaintStatus" NOT NULL DEFAULT 'FILED',
    "isVerifiedViolation" BOOLEAN NOT NULL DEFAULT false,
    "complaintSummary" TEXT,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_disputes" (
    "id" UUID NOT NULL,
    "disputeReference" TEXT NOT NULL,
    "workerProfileReferenceId" UUID,
    "employerRegistryRecordId" UUID,
    "caseId" UUID,
    "redressMatterId" UUID,
    "status" "EmploymentDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "disputeSummary" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_termination_notifications" (
    "id" UUID NOT NULL,
    "notificationReference" TEXT NOT NULL,
    "workerProfileReferenceId" UUID NOT NULL,
    "employerRegistryRecordId" UUID NOT NULL,
    "employmentRelationshipId" UUID,
    "terminationDate" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_termination_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workplace_requirement_references" (
    "id" UUID NOT NULL,
    "requirementCode" TEXT NOT NULL,
    "requirementSummary" TEXT,
    "jurisdictionId" UUID,
    "occupationalSafetyDependencyRef" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workplace_requirement_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_external_dependencies" (
    "id" UUID NOT NULL,
    "dependencyReference" TEXT NOT NULL,
    "caseId" UUID,
    "workerProfileReferenceId" UUID,
    "externalAuthorityId" UUID NOT NULL,
    "dependencyType" "LabourExternalDependencyType" NOT NULL,
    "determinationStatus" "ExternalDeterminationStatus" NOT NULL DEFAULT 'PENDING',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "blocksDecisionWhenRequired" BOOLEAN NOT NULL DEFAULT false,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "authenticatedPayloadHash" TEXT,
    "recordedBy" "LabourExternalDependencyRecordedBy" NOT NULL,
    "recordedByIdentityId" UUID,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labour_external_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employer_registry_records_registryNumber_key" ON "employer_registry_records"("registryNumber");

-- CreateIndex
CREATE INDEX "employer_registry_records_organizationId_idx" ON "employer_registry_records"("organizationId");

-- CreateIndex
CREATE INDEX "employer_registry_records_jurisdictionId_idx" ON "employer_registry_records"("jurisdictionId");

-- CreateIndex
CREATE INDEX "employer_registry_records_registrationStatus_idx" ON "employer_registry_records"("registrationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "worker_profile_references_profileReferenceNumber_key" ON "worker_profile_references"("profileReferenceNumber");

-- CreateIndex
CREATE INDEX "worker_profile_references_workerIdentityId_idx" ON "worker_profile_references"("workerIdentityId");

-- CreateIndex
CREATE INDEX "worker_profile_references_jurisdictionId_idx" ON "worker_profile_references"("jurisdictionId");

-- CreateIndex
CREATE INDEX "occupation_classification_references_classificationCode_idx" ON "occupation_classification_references"("classificationCode");

-- CreateIndex
CREATE INDEX "occupation_classification_references_jurisdictionId_idx" ON "occupation_classification_references"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "employment_relationships_relationshipNumber_key" ON "employment_relationships"("relationshipNumber");

-- CreateIndex
CREATE INDEX "employment_relationships_employerRegistryRecordId_idx" ON "employment_relationships"("employerRegistryRecordId");

-- CreateIndex
CREATE INDEX "employment_relationships_workerProfileReferenceId_idx" ON "employment_relationships"("workerProfileReferenceId");

-- CreateIndex
CREATE INDEX "employment_relationships_status_idx" ON "employment_relationships"("status");

-- CreateIndex
CREATE INDEX "employment_relationship_history_employmentRelationshipId_idx" ON "employment_relationship_history"("employmentRelationshipId");

-- CreateIndex
CREATE INDEX "employment_relationship_history_recordedAt_idx" ON "employment_relationship_history"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "employment_declarations_declarationReference_key" ON "employment_declarations"("declarationReference");

-- CreateIndex
CREATE INDEX "employment_declarations_employerRegistryRecordId_idx" ON "employment_declarations"("employerRegistryRecordId");

-- CreateIndex
CREATE INDEX "employment_declarations_employmentRelationshipId_idx" ON "employment_declarations"("employmentRelationshipId");

-- CreateIndex
CREATE INDEX "employment_contract_references_employmentRelationshipId_idx" ON "employment_contract_references"("employmentRelationshipId");

-- CreateIndex
CREATE UNIQUE INDEX "work_permit_application_profiles_profileNumber_key" ON "work_permit_application_profiles"("profileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "work_permit_application_profiles_caseId_key" ON "work_permit_application_profiles"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "work_permit_application_profiles_applicationId_key" ON "work_permit_application_profiles"("applicationId");

-- CreateIndex
CREATE INDEX "work_permit_application_profiles_workerProfileReferenceId_idx" ON "work_permit_application_profiles"("workerProfileReferenceId");

-- CreateIndex
CREATE INDEX "work_permit_application_profiles_immigrationProfileId_idx" ON "work_permit_application_profiles"("immigrationProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "work_permit_records_permitNumber_key" ON "work_permit_records"("permitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "work_permit_records_renewalOfPermitId_key" ON "work_permit_records"("renewalOfPermitId");

-- CreateIndex
CREATE INDEX "work_permit_records_workerProfileReferenceId_idx" ON "work_permit_records"("workerProfileReferenceId");

-- CreateIndex
CREATE INDEX "work_permit_records_employerRegistryRecordId_idx" ON "work_permit_records"("employerRegistryRecordId");

-- CreateIndex
CREATE INDEX "work_permit_records_lifecycleStatus_idx" ON "work_permit_records"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "work_permit_records_immigrationProfileId_idx" ON "work_permit_records"("immigrationProfileId");

-- CreateIndex
CREATE INDEX "work_permit_conditions_workPermitRecordId_idx" ON "work_permit_conditions"("workPermitRecordId");

-- CreateIndex
CREATE INDEX "work_permit_status_history_workPermitRecordId_idx" ON "work_permit_status_history"("workPermitRecordId");

-- CreateIndex
CREATE INDEX "work_permit_status_history_recordedAt_idx" ON "work_permit_status_history"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "employment_sponsorships_sponsorshipNumber_key" ON "employment_sponsorships"("sponsorshipNumber");

-- CreateIndex
CREATE INDEX "employment_sponsorships_employerRegistryRecordId_idx" ON "employment_sponsorships"("employerRegistryRecordId");

-- CreateIndex
CREATE INDEX "employment_sponsorships_workerProfileReferenceId_idx" ON "employment_sponsorships"("workerProfileReferenceId");

-- CreateIndex
CREATE INDEX "employment_sponsorships_status_idx" ON "employment_sponsorships"("status");

-- CreateIndex
CREATE UNIQUE INDEX "labour_market_determination_references_determinationReferen_key" ON "labour_market_determination_references"("determinationReference");

-- CreateIndex
CREATE INDEX "labour_market_determination_references_caseId_idx" ON "labour_market_determination_references"("caseId");

-- CreateIndex
CREATE INDEX "professional_qualification_references_workerProfileReferenc_idx" ON "professional_qualification_references"("workerProfileReferenceId");

-- CreateIndex
CREATE INDEX "employer_workforce_profiles_employerRegistryRecordId_idx" ON "employer_workforce_profiles"("employerRegistryRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "employer_workforce_declarations_declarationReference_key" ON "employer_workforce_declarations"("declarationReference");

-- CreateIndex
CREATE INDEX "employer_workforce_declarations_employerRegistryRecordId_idx" ON "employer_workforce_declarations"("employerRegistryRecordId");

-- CreateIndex
CREATE INDEX "labour_inspection_references_inspectionRecordId_idx" ON "labour_inspection_references"("inspectionRecordId");

-- CreateIndex
CREATE INDEX "labour_compliance_matter_references_complianceMatterId_idx" ON "labour_compliance_matter_references"("complianceMatterId");

-- CreateIndex
CREATE UNIQUE INDEX "employment_complaints_complaintReference_key" ON "employment_complaints"("complaintReference");

-- CreateIndex
CREATE INDEX "employment_complaints_workerProfileReferenceId_idx" ON "employment_complaints"("workerProfileReferenceId");

-- CreateIndex
CREATE INDEX "employment_complaints_employerRegistryRecordId_idx" ON "employment_complaints"("employerRegistryRecordId");

-- CreateIndex
CREATE INDEX "employment_complaints_status_idx" ON "employment_complaints"("status");

-- CreateIndex
CREATE UNIQUE INDEX "employment_disputes_disputeReference_key" ON "employment_disputes"("disputeReference");

-- CreateIndex
CREATE INDEX "employment_disputes_status_idx" ON "employment_disputes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "employment_termination_notifications_notificationReference_key" ON "employment_termination_notifications"("notificationReference");

-- CreateIndex
CREATE INDEX "employment_termination_notifications_workerProfileReference_idx" ON "employment_termination_notifications"("workerProfileReferenceId");

-- CreateIndex
CREATE INDEX "employment_termination_notifications_employerRegistryRecord_idx" ON "employment_termination_notifications"("employerRegistryRecordId");

-- CreateIndex
CREATE INDEX "workplace_requirement_references_requirementCode_idx" ON "workplace_requirement_references"("requirementCode");

-- CreateIndex
CREATE UNIQUE INDEX "labour_external_dependencies_dependencyReference_key" ON "labour_external_dependencies"("dependencyReference");

-- CreateIndex
CREATE INDEX "labour_external_dependencies_caseId_idx" ON "labour_external_dependencies"("caseId");

-- CreateIndex
CREATE INDEX "labour_external_dependencies_workerProfileReferenceId_idx" ON "labour_external_dependencies"("workerProfileReferenceId");

-- CreateIndex
CREATE INDEX "labour_external_dependencies_externalAuthorityId_idx" ON "labour_external_dependencies"("externalAuthorityId");

-- AddForeignKey
ALTER TABLE "employer_registry_records" ADD CONSTRAINT "employer_registry_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_registry_records" ADD CONSTRAINT "employer_registry_records_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_registry_records" ADD CONSTRAINT "employer_registry_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_registry_records" ADD CONSTRAINT "employer_registry_records_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_profile_references" ADD CONSTRAINT "worker_profile_references_workerIdentityId_fkey" FOREIGN KEY ("workerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_profile_references" ADD CONSTRAINT "worker_profile_references_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_profile_references" ADD CONSTRAINT "worker_profile_references_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupation_classification_references" ADD CONSTRAINT "occupation_classification_references_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_relationships" ADD CONSTRAINT "employment_relationships_employerRegistryRecordId_fkey" FOREIGN KEY ("employerRegistryRecordId") REFERENCES "employer_registry_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_relationships" ADD CONSTRAINT "employment_relationships_workerProfileReferenceId_fkey" FOREIGN KEY ("workerProfileReferenceId") REFERENCES "worker_profile_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_relationships" ADD CONSTRAINT "employment_relationships_occupationClassificationId_fkey" FOREIGN KEY ("occupationClassificationId") REFERENCES "occupation_classification_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_relationships" ADD CONSTRAINT "employment_relationships_currentWorkPermitRecordId_fkey" FOREIGN KEY ("currentWorkPermitRecordId") REFERENCES "work_permit_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_relationship_history" ADD CONSTRAINT "employment_relationship_history_employmentRelationshipId_fkey" FOREIGN KEY ("employmentRelationshipId") REFERENCES "employment_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_relationship_history" ADD CONSTRAINT "employment_relationship_history_workPermitRecordId_fkey" FOREIGN KEY ("workPermitRecordId") REFERENCES "work_permit_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_relationship_history" ADD CONSTRAINT "employment_relationship_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_declarations" ADD CONSTRAINT "employment_declarations_employerRegistryRecordId_fkey" FOREIGN KEY ("employerRegistryRecordId") REFERENCES "employer_registry_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_declarations" ADD CONSTRAINT "employment_declarations_employmentRelationshipId_fkey" FOREIGN KEY ("employmentRelationshipId") REFERENCES "employment_relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_declarations" ADD CONSTRAINT "employment_declarations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_contract_references" ADD CONSTRAINT "employment_contract_references_employmentRelationshipId_fkey" FOREIGN KEY ("employmentRelationshipId") REFERENCES "employment_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_contract_references" ADD CONSTRAINT "employment_contract_references_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_application_profiles" ADD CONSTRAINT "work_permit_application_profiles_workerProfileReferenceId_fkey" FOREIGN KEY ("workerProfileReferenceId") REFERENCES "worker_profile_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_application_profiles" ADD CONSTRAINT "work_permit_application_profiles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_application_profiles" ADD CONSTRAINT "work_permit_application_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_application_profiles" ADD CONSTRAINT "work_permit_application_profiles_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_records" ADD CONSTRAINT "work_permit_records_workerProfileReferenceId_fkey" FOREIGN KEY ("workerProfileReferenceId") REFERENCES "worker_profile_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_records" ADD CONSTRAINT "work_permit_records_employerRegistryRecordId_fkey" FOREIGN KEY ("employerRegistryRecordId") REFERENCES "employer_registry_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_records" ADD CONSTRAINT "work_permit_records_workPermitApplicationProfileId_fkey" FOREIGN KEY ("workPermitApplicationProfileId") REFERENCES "work_permit_application_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_records" ADD CONSTRAINT "work_permit_records_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_records" ADD CONSTRAINT "work_permit_records_linkedResidencyPermitRecordId_fkey" FOREIGN KEY ("linkedResidencyPermitRecordId") REFERENCES "residency_permit_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_records" ADD CONSTRAINT "work_permit_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_records" ADD CONSTRAINT "work_permit_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_records" ADD CONSTRAINT "work_permit_records_renewalOfPermitId_fkey" FOREIGN KEY ("renewalOfPermitId") REFERENCES "work_permit_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_conditions" ADD CONSTRAINT "work_permit_conditions_workPermitRecordId_fkey" FOREIGN KEY ("workPermitRecordId") REFERENCES "work_permit_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_status_history" ADD CONSTRAINT "work_permit_status_history_workPermitRecordId_fkey" FOREIGN KEY ("workPermitRecordId") REFERENCES "work_permit_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_status_history" ADD CONSTRAINT "work_permit_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_status_history" ADD CONSTRAINT "work_permit_status_history_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_sponsorships" ADD CONSTRAINT "employment_sponsorships_employerRegistryRecordId_fkey" FOREIGN KEY ("employerRegistryRecordId") REFERENCES "employer_registry_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_sponsorships" ADD CONSTRAINT "employment_sponsorships_workerProfileReferenceId_fkey" FOREIGN KEY ("workerProfileReferenceId") REFERENCES "worker_profile_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_sponsorships" ADD CONSTRAINT "employment_sponsorships_employmentRelationshipId_fkey" FOREIGN KEY ("employmentRelationshipId") REFERENCES "employment_relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_sponsorships" ADD CONSTRAINT "employment_sponsorships_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_sponsorships" ADD CONSTRAINT "employment_sponsorships_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_market_determination_references" ADD CONSTRAINT "labour_market_determination_references_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_market_determination_references" ADD CONSTRAINT "labour_market_determination_references_governmentDecisionI_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_qualification_references" ADD CONSTRAINT "professional_qualification_references_workerProfileReferen_fkey" FOREIGN KEY ("workerProfileReferenceId") REFERENCES "worker_profile_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_workforce_profiles" ADD CONSTRAINT "employer_workforce_profiles_employerRegistryRecordId_fkey" FOREIGN KEY ("employerRegistryRecordId") REFERENCES "employer_registry_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_workforce_declarations" ADD CONSTRAINT "employer_workforce_declarations_employerRegistryRecordId_fkey" FOREIGN KEY ("employerRegistryRecordId") REFERENCES "employer_registry_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_inspection_references" ADD CONSTRAINT "labour_inspection_references_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_inspection_references" ADD CONSTRAINT "labour_inspection_references_employerRegistryRecordId_fkey" FOREIGN KEY ("employerRegistryRecordId") REFERENCES "employer_registry_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_compliance_matter_references" ADD CONSTRAINT "labour_compliance_matter_references_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_compliance_matter_references" ADD CONSTRAINT "labour_compliance_matter_references_employerRegistryRecord_fkey" FOREIGN KEY ("employerRegistryRecordId") REFERENCES "employer_registry_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_compliance_matter_references" ADD CONSTRAINT "labour_compliance_matter_references_workerProfileReference_fkey" FOREIGN KEY ("workerProfileReferenceId") REFERENCES "worker_profile_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_complaints" ADD CONSTRAINT "employment_complaints_workerProfileReferenceId_fkey" FOREIGN KEY ("workerProfileReferenceId") REFERENCES "worker_profile_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_complaints" ADD CONSTRAINT "employment_complaints_employerRegistryRecordId_fkey" FOREIGN KEY ("employerRegistryRecordId") REFERENCES "employer_registry_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_complaints" ADD CONSTRAINT "employment_complaints_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_complaints" ADD CONSTRAINT "employment_complaints_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_disputes" ADD CONSTRAINT "employment_disputes_workerProfileReferenceId_fkey" FOREIGN KEY ("workerProfileReferenceId") REFERENCES "worker_profile_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_disputes" ADD CONSTRAINT "employment_disputes_employerRegistryRecordId_fkey" FOREIGN KEY ("employerRegistryRecordId") REFERENCES "employer_registry_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_disputes" ADD CONSTRAINT "employment_disputes_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_disputes" ADD CONSTRAINT "employment_disputes_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_termination_notifications" ADD CONSTRAINT "employment_termination_notifications_workerProfileReferenc_fkey" FOREIGN KEY ("workerProfileReferenceId") REFERENCES "worker_profile_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_termination_notifications" ADD CONSTRAINT "employment_termination_notifications_employerRegistryRecor_fkey" FOREIGN KEY ("employerRegistryRecordId") REFERENCES "employer_registry_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workplace_requirement_references" ADD CONSTRAINT "workplace_requirement_references_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_external_dependencies" ADD CONSTRAINT "labour_external_dependencies_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_external_dependencies" ADD CONSTRAINT "labour_external_dependencies_workerProfileReferenceId_fkey" FOREIGN KEY ("workerProfileReferenceId") REFERENCES "worker_profile_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_external_dependencies" ADD CONSTRAINT "labour_external_dependencies_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_external_dependencies" ADD CONSTRAINT "labour_external_dependencies_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
