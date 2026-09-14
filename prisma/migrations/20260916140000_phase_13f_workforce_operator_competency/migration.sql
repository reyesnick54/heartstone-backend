-- Phase 13F: Workforce, Operator Competency, Support and Departmental Operational Readiness

CREATE TYPE "OperatorQualificationStatus" AS ENUM (
  'QUALIFIED',
  'QUALIFIED_WITH_CONDITIONS',
  'NOT_QUALIFIED',
  'SUSPENDED',
  'EXPIRED',
  'WITHDRAWN'
);

CREATE TYPE "DepartmentReadinessStatus" AS ENUM (
  'NOT_READY',
  'PARTIALLY_READY',
  'READY_WITH_CONDITIONS',
  'READY',
  'SUSPENDED'
);

CREATE TYPE "StaffingReadinessStatus" AS ENUM (
  'NOT_READY',
  'PARTIALLY_READY',
  'READY_WITH_CONDITIONS',
  'READY',
  'SUSPENDED'
);

CREATE TYPE "OperationalRoleRequirementStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'SUSPENDED',
  'RETIRED'
);

CREATE TYPE "CompetencyAssessmentOutcome" AS ENUM (
  'PASSED',
  'PASSED_WITH_CONDITIONS',
  'FAILED',
  'PENDING',
  'EXPIRED'
);

CREATE TYPE "TrainingCompletionStatus" AS ENUM (
  'ENROLLED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'WITHDRAWN',
  'EXPIRED'
);

CREATE TYPE "OperatorAccessReviewTrigger" AS ENUM (
  'APPOINTMENT_EXPIRED',
  'DELEGATION_REVOKED',
  'QUALIFICATION_EXPIRED',
  'OPERATOR_SUSPENDED',
  'DEPARTMENT_ASSIGNMENT_ENDED'
);

CREATE TYPE "OperatorAccessReviewStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "QualificationExpiryEventType" AS ENUM (
  'TRAINING_EXPIRED',
  'PROFESSIONAL_QUALIFICATION_EXPIRED',
  'RECERTIFICATION_OVERDUE',
  'COMPETENCY_ASSESSMENT_EXPIRED'
);

CREATE TYPE "SupportCoveragePlanStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'SUSPENDED',
  'RETIRED'
);

CREATE TYPE "SupportTier" AS ENUM (
  'TIER_1',
  'TIER_2',
  'TIER_3',
  'EXECUTIVE',
  'VENDOR'
);

CREATE TYPE "OnCallAssignmentStatus" AS ENUM (
  'SCHEDULED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "SuccessionAssignmentStatus" AS ENUM (
  'DESIGNATED',
  'ACTIVE',
  'WITHDRAWN',
  'ACTIVATED'
);

CREATE TABLE "training_requirements" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "providerReference" TEXT,
  "isGovernmentAuthority" BOOLEAN NOT NULL DEFAULT false,
  "validityPeriodDays" INTEGER,
  "recertificationRequired" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "training_requirements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "training_requirements_code_key" ON "training_requirements"("code");

CREATE TABLE "operational_role_requirements" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "institutionId" UUID NOT NULL,
  "departmentId" UUID NOT NULL,
  "functionAuthorityRecordId" UUID NOT NULL,
  "appointmentRequired" BOOLEAN NOT NULL DEFAULT true,
  "delegationRequired" BOOLEAN NOT NULL DEFAULT false,
  "professionalQualificationReference" TEXT,
  "trainingRequirementId" UUID,
  "requiresKnowledgeAssessment" BOOLEAN NOT NULL DEFAULT true,
  "requiresPracticalAssessment" BOOLEAN NOT NULL DEFAULT true,
  "requiresAuthorityBoundaryAssessment" BOOLEAN NOT NULL DEFAULT true,
  "requiresSecurityPrivacyAssessment" BOOLEAN NOT NULL DEFAULT true,
  "requiresContinuityAssessment" BOOLEAN NOT NULL DEFAULT true,
  "supervisionRequired" BOOLEAN NOT NULL DEFAULT false,
  "recertificationIntervalDays" INTEGER,
  "expirationPolicy" TEXT,
  "alternateRequirementConfigured" BOOLEAN NOT NULL DEFAULT false,
  "isHighConsequence" BOOLEAN NOT NULL DEFAULT false,
  "status" "OperationalRoleRequirementStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operational_role_requirements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operational_role_requirements_institutionId_code_key" ON "operational_role_requirements"("institutionId", "code");
CREATE INDEX "operational_role_requirements_departmentId_idx" ON "operational_role_requirements"("departmentId");
CREATE INDEX "operational_role_requirements_functionAuthorityRecordId_idx" ON "operational_role_requirements"("functionAuthorityRecordId");
CREATE INDEX "operational_role_requirements_status_idx" ON "operational_role_requirements"("status");

CREATE TABLE "operator_readiness_profiles" (
  "id" UUID NOT NULL,
  "identityId" UUID NOT NULL,
  "officeholderId" UUID,
  "departmentId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operator_readiness_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operator_readiness_profiles_identityId_departmentId_key" ON "operator_readiness_profiles"("identityId", "departmentId");
CREATE INDEX "operator_readiness_profiles_officeholderId_idx" ON "operator_readiness_profiles"("officeholderId");
CREATE INDEX "operator_readiness_profiles_departmentId_idx" ON "operator_readiness_profiles"("departmentId");

CREATE TABLE "operator_qualifications" (
  "id" UUID NOT NULL,
  "qualificationNumber" TEXT NOT NULL,
  "operatorReadinessProfileId" UUID NOT NULL,
  "operationalRoleRequirementId" UUID NOT NULL,
  "identityId" UUID NOT NULL,
  "officeholderId" UUID,
  "appointmentId" UUID,
  "delegationId" UUID,
  "functionAuthorityRecordId" UUID NOT NULL,
  "scope" TEXT NOT NULL,
  "status" "OperatorQualificationStatus" NOT NULL DEFAULT 'NOT_QUALIFIED',
  "conditions" TEXT,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "assessmentAuthorityOfficeholderId" UUID,
  "isAiAssessed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operator_qualifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operator_qualifications_qualificationNumber_key" ON "operator_qualifications"("qualificationNumber");
CREATE INDEX "operator_qualifications_operatorReadinessProfileId_idx" ON "operator_qualifications"("operatorReadinessProfileId");
CREATE INDEX "operator_qualifications_operationalRoleRequirementId_idx" ON "operator_qualifications"("operationalRoleRequirementId");
CREATE INDEX "operator_qualifications_identityId_idx" ON "operator_qualifications"("identityId");
CREATE INDEX "operator_qualifications_officeholderId_idx" ON "operator_qualifications"("officeholderId");
CREATE INDEX "operator_qualifications_status_idx" ON "operator_qualifications"("status");
CREATE INDEX "operator_qualifications_effectiveUntil_idx" ON "operator_qualifications"("effectiveUntil");

CREATE TABLE "operator_competency_assessments" (
  "id" UUID NOT NULL,
  "operatorReadinessProfileId" UUID NOT NULL,
  "operatorQualificationId" UUID,
  "assessorIdentityId" UUID NOT NULL,
  "assessorOfficeholderId" UUID,
  "assessmentType" TEXT NOT NULL,
  "score" DECIMAL(5,2),
  "passingScore" DECIMAL(5,2),
  "outcome" "CompetencyAssessmentOutcome" NOT NULL DEFAULT 'PENDING',
  "evidenceReference" TEXT,
  "isAttendanceOnly" BOOLEAN NOT NULL DEFAULT false,
  "isAiAssessed" BOOLEAN NOT NULL DEFAULT false,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operator_competency_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operator_competency_assessments_operatorReadinessProfileId_idx" ON "operator_competency_assessments"("operatorReadinessProfileId");
CREATE INDEX "operator_competency_assessments_operatorQualificationId_idx" ON "operator_competency_assessments"("operatorQualificationId");
CREATE INDEX "operator_competency_assessments_assessorIdentityId_idx" ON "operator_competency_assessments"("assessorIdentityId");
CREATE INDEX "operator_competency_assessments_outcome_idx" ON "operator_competency_assessments"("outcome");

CREATE TABLE "training_completions" (
  "id" UUID NOT NULL,
  "operatorQualificationId" UUID NOT NULL,
  "trainingRequirementId" UUID NOT NULL,
  "recordedByIdentityId" UUID NOT NULL,
  "providerReference" TEXT,
  "status" "TrainingCompletionStatus" NOT NULL DEFAULT 'ENROLLED',
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "score" DECIMAL(5,2),
  "evidenceReference" TEXT,
  "isAttendanceOnly" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "training_completions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "training_completions_operatorQualificationId_idx" ON "training_completions"("operatorQualificationId");
CREATE INDEX "training_completions_trainingRequirementId_idx" ON "training_completions"("trainingRequirementId");
CREATE INDEX "training_completions_status_idx" ON "training_completions"("status");
CREATE INDEX "training_completions_expiresAt_idx" ON "training_completions"("expiresAt");

CREATE TABLE "practical_assessments" (
  "id" UUID NOT NULL,
  "operatorQualificationId" UUID NOT NULL,
  "assessorIdentityId" UUID NOT NULL,
  "assessorOfficeholderId" UUID,
  "outcome" "CompetencyAssessmentOutcome" NOT NULL DEFAULT 'PENDING',
  "practicalEvidenceReference" TEXT,
  "notes" TEXT,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "isAiAssessed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "practical_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "practical_assessments_operatorQualificationId_idx" ON "practical_assessments"("operatorQualificationId");
CREATE INDEX "practical_assessments_assessorIdentityId_idx" ON "practical_assessments"("assessorIdentityId");
CREATE INDEX "practical_assessments_outcome_idx" ON "practical_assessments"("outcome");

CREATE TABLE "authority_boundary_assessments" (
  "id" UUID NOT NULL,
  "operatorQualificationId" UUID NOT NULL,
  "assessorIdentityId" UUID NOT NULL,
  "assessorOfficeholderId" UUID,
  "outcome" "CompetencyAssessmentOutcome" NOT NULL DEFAULT 'PENDING',
  "boundaryScopeVerified" BOOLEAN NOT NULL DEFAULT false,
  "delegationScopeVerified" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "isAiAssessed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "authority_boundary_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "authority_boundary_assessments_operatorQualificationId_idx" ON "authority_boundary_assessments"("operatorQualificationId");
CREATE INDEX "authority_boundary_assessments_assessorIdentityId_idx" ON "authority_boundary_assessments"("assessorIdentityId");
CREATE INDEX "authority_boundary_assessments_outcome_idx" ON "authority_boundary_assessments"("outcome");

CREATE TABLE "security_privacy_assessments" (
  "id" UUID NOT NULL,
  "operatorQualificationId" UUID NOT NULL,
  "assessorIdentityId" UUID NOT NULL,
  "assessorOfficeholderId" UUID,
  "outcome" "CompetencyAssessmentOutcome" NOT NULL DEFAULT 'PENDING',
  "securityCleared" BOOLEAN NOT NULL DEFAULT false,
  "privacyCleared" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "isAiAssessed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "security_privacy_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "security_privacy_assessments_operatorQualificationId_idx" ON "security_privacy_assessments"("operatorQualificationId");
CREATE INDEX "security_privacy_assessments_assessorIdentityId_idx" ON "security_privacy_assessments"("assessorIdentityId");
CREATE INDEX "security_privacy_assessments_outcome_idx" ON "security_privacy_assessments"("outcome");

CREATE TABLE "continuity_competency_assessments" (
  "id" UUID NOT NULL,
  "operatorQualificationId" UUID NOT NULL,
  "assessorIdentityId" UUID NOT NULL,
  "assessorOfficeholderId" UUID,
  "outcome" "CompetencyAssessmentOutcome" NOT NULL DEFAULT 'PENDING',
  "continuityPlanVerified" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "isAiAssessed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "continuity_competency_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "continuity_competency_assessments_operatorQualificationId_idx" ON "continuity_competency_assessments"("operatorQualificationId");
CREATE INDEX "continuity_competency_assessments_assessorIdentityId_idx" ON "continuity_competency_assessments"("assessorIdentityId");
CREATE INDEX "continuity_competency_assessments_outcome_idx" ON "continuity_competency_assessments"("outcome");

CREATE TABLE "support_coverage_plans" (
  "id" UUID NOT NULL,
  "planCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "institutionId" UUID NOT NULL,
  "departmentId" UUID,
  "serviceHours" TEXT,
  "isTwentyFourSeven" BOOLEAN NOT NULL DEFAULT false,
  "supportTiers" JSONB NOT NULL DEFAULT '[]',
  "incidentContacts" JSONB NOT NULL DEFAULT '[]',
  "securityEscalationContacts" JSONB NOT NULL DEFAULT '[]',
  "recordsEscalationContacts" JSONB NOT NULL DEFAULT '[]',
  "integrationSupportContacts" JSONB NOT NULL DEFAULT '[]',
  "paymentSupportContacts" JSONB NOT NULL DEFAULT '[]',
  "aiEscalationContacts" JSONB NOT NULL DEFAULT '[]',
  "continuityResponseContacts" JSONB NOT NULL DEFAULT '[]',
  "vendorContacts" JSONB NOT NULL DEFAULT '[]',
  "contactsRestricted" BOOLEAN NOT NULL DEFAULT true,
  "status" "SupportCoveragePlanStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_coverage_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "support_coverage_plans_institutionId_planCode_key" ON "support_coverage_plans"("institutionId", "planCode");
CREATE INDEX "support_coverage_plans_departmentId_idx" ON "support_coverage_plans"("departmentId");
CREATE INDEX "support_coverage_plans_status_idx" ON "support_coverage_plans"("status");

CREATE TABLE "support_assignments" (
  "id" UUID NOT NULL,
  "supportCoveragePlanId" UUID NOT NULL,
  "identityId" UUID NOT NULL,
  "officeholderId" UUID,
  "supportTier" "SupportTier" NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "isNamedOwner" BOOLEAN NOT NULL DEFAULT false,
  "isOperationalCoverage" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_assignments_supportCoveragePlanId_idx" ON "support_assignments"("supportCoveragePlanId");
CREATE INDEX "support_assignments_identityId_idx" ON "support_assignments"("identityId");
CREATE INDEX "support_assignments_effectiveUntil_idx" ON "support_assignments"("effectiveUntil");

CREATE TABLE "on_call_assignments" (
  "id" UUID NOT NULL,
  "supportCoveragePlanId" UUID NOT NULL,
  "primaryIdentityId" UUID NOT NULL,
  "primaryOfficeholderId" UUID,
  "alternateIdentityId" UUID,
  "alternateOfficeholderId" UUID,
  "coverageStart" TIMESTAMP(3) NOT NULL,
  "coverageEnd" TIMESTAMP(3) NOT NULL,
  "status" "OnCallAssignmentStatus" NOT NULL DEFAULT 'SCHEDULED',
  "contactDataRestricted" BOOLEAN NOT NULL DEFAULT true,
  "restrictedContactRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "on_call_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "on_call_assignments_supportCoveragePlanId_idx" ON "on_call_assignments"("supportCoveragePlanId");
CREATE INDEX "on_call_assignments_primaryIdentityId_idx" ON "on_call_assignments"("primaryIdentityId");
CREATE INDEX "on_call_assignments_coverageStart_coverageEnd_idx" ON "on_call_assignments"("coverageStart", "coverageEnd");
CREATE INDEX "on_call_assignments_status_idx" ON "on_call_assignments"("status");

CREATE TABLE "succession_assignments" (
  "id" UUID NOT NULL,
  "operationalRoleRequirementId" UUID NOT NULL,
  "primaryOfficeholderId" UUID NOT NULL,
  "alternateOfficeholderId" UUID NOT NULL,
  "status" "SuccessionAssignmentStatus" NOT NULL DEFAULT 'DESIGNATED',
  "alternateAppointmentRequired" BOOLEAN NOT NULL DEFAULT true,
  "alternateDelegationRequired" BOOLEAN NOT NULL DEFAULT false,
  "alternateQualificationRequired" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "succession_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "succession_assignments_operationalRoleRequirementId_idx" ON "succession_assignments"("operationalRoleRequirementId");
CREATE INDEX "succession_assignments_primaryOfficeholderId_idx" ON "succession_assignments"("primaryOfficeholderId");
CREATE INDEX "succession_assignments_alternateOfficeholderId_idx" ON "succession_assignments"("alternateOfficeholderId");
CREATE INDEX "succession_assignments_status_idx" ON "succession_assignments"("status");

CREATE TABLE "department_readiness_assessments" (
  "id" UUID NOT NULL,
  "assessmentNumber" TEXT NOT NULL,
  "departmentId" UUID NOT NULL,
  "assessorIdentityId" UUID NOT NULL,
  "assessorOfficeholderId" UUID,
  "status" "DepartmentReadinessStatus" NOT NULL DEFAULT 'NOT_READY',
  "mandateAssessed" BOOLEAN NOT NULL DEFAULT false,
  "headAssessed" BOOLEAN NOT NULL DEFAULT false,
  "officeholdersAssessed" BOOLEAN NOT NULL DEFAULT false,
  "staffingAssessed" BOOLEAN NOT NULL DEFAULT false,
  "qualificationsAssessed" BOOLEAN NOT NULL DEFAULT false,
  "proceduresAssessed" BOOLEAN NOT NULL DEFAULT false,
  "recordsAssessed" BOOLEAN NOT NULL DEFAULT false,
  "technologyAssessed" BOOLEAN NOT NULL DEFAULT false,
  "securityAssessed" BOOLEAN NOT NULL DEFAULT false,
  "trainingAssessed" BOOLEAN NOT NULL DEFAULT false,
  "dependenciesAssessed" BOOLEAN NOT NULL DEFAULT false,
  "supportAssessed" BOOLEAN NOT NULL DEFAULT false,
  "continuityAssessed" BOOLEAN NOT NULL DEFAULT false,
  "testsAssessed" BOOLEAN NOT NULL DEFAULT false,
  "acceptanceAssessed" BOOLEAN NOT NULL DEFAULT false,
  "activationAuthorityAssessed" BOOLEAN NOT NULL DEFAULT false,
  "conditions" TEXT,
  "supportCoverageGapDetected" BOOLEAN NOT NULL DEFAULT false,
  "staffingShortageDetected" BOOLEAN NOT NULL DEFAULT false,
  "isInstitutionalAcceptance" BOOLEAN NOT NULL DEFAULT false,
  "selfActivated" BOOLEAN NOT NULL DEFAULT false,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "department_readiness_assessments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "department_readiness_assessments_assessmentNumber_key" ON "department_readiness_assessments"("assessmentNumber");
CREATE INDEX "department_readiness_assessments_departmentId_idx" ON "department_readiness_assessments"("departmentId");
CREATE INDEX "department_readiness_assessments_assessorIdentityId_idx" ON "department_readiness_assessments"("assessorIdentityId");
CREATE INDEX "department_readiness_assessments_status_idx" ON "department_readiness_assessments"("status");

CREATE TABLE "staffing_readiness_assessments" (
  "id" UUID NOT NULL,
  "departmentReadinessAssessmentId" UUID NOT NULL,
  "departmentId" UUID NOT NULL,
  "assessorIdentityId" UUID NOT NULL,
  "assessorOfficeholderId" UUID,
  "status" "StaffingReadinessStatus" NOT NULL DEFAULT 'NOT_READY',
  "requiredPositions" INTEGER NOT NULL,
  "filledPositions" INTEGER NOT NULL,
  "qualifiedPositions" INTEGER NOT NULL,
  "mandatoryControlOperable" BOOLEAN NOT NULL DEFAULT false,
  "shortageBlocksReadiness" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "staffing_readiness_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "staffing_readiness_assessments_departmentReadinessAssessmentId_idx" ON "staffing_readiness_assessments"("departmentReadinessAssessmentId");
CREATE INDEX "staffing_readiness_assessments_departmentId_idx" ON "staffing_readiness_assessments"("departmentId");
CREATE INDEX "staffing_readiness_assessments_status_idx" ON "staffing_readiness_assessments"("status");

CREATE TABLE "qualification_expiry_events" (
  "id" UUID NOT NULL,
  "operatorQualificationId" UUID NOT NULL,
  "eventType" "QualificationExpiryEventType" NOT NULL,
  "recordedByIdentityId" UUID NOT NULL,
  "expiredAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "accessReviewTriggered" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qualification_expiry_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "qualification_expiry_events_operatorQualificationId_idx" ON "qualification_expiry_events"("operatorQualificationId");
CREATE INDEX "qualification_expiry_events_eventType_idx" ON "qualification_expiry_events"("eventType");
CREATE INDEX "qualification_expiry_events_expiredAt_idx" ON "qualification_expiry_events"("expiredAt");

CREATE TABLE "operator_access_reviews" (
  "id" UUID NOT NULL,
  "operatorQualificationId" UUID NOT NULL,
  "trigger" "OperatorAccessReviewTrigger" NOT NULL,
  "status" "OperatorAccessReviewStatus" NOT NULL DEFAULT 'PENDING',
  "initiatedByIdentityId" UUID NOT NULL,
  "delegationId" UUID,
  "appointmentId" UUID,
  "findings" TEXT,
  "accessRetained" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operator_access_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operator_access_reviews_operatorQualificationId_idx" ON "operator_access_reviews"("operatorQualificationId");
CREATE INDEX "operator_access_reviews_trigger_idx" ON "operator_access_reviews"("trigger");
CREATE INDEX "operator_access_reviews_status_idx" ON "operator_access_reviews"("status");

-- Foreign keys

ALTER TABLE "operational_role_requirements" ADD CONSTRAINT "operational_role_requirements_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operational_role_requirements" ADD CONSTRAINT "operational_role_requirements_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operational_role_requirements" ADD CONSTRAINT "operational_role_requirements_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operational_role_requirements" ADD CONSTRAINT "operational_role_requirements_trainingRequirementId_fkey" FOREIGN KEY ("trainingRequirementId") REFERENCES "training_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operator_readiness_profiles" ADD CONSTRAINT "operator_readiness_profiles_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operator_readiness_profiles" ADD CONSTRAINT "operator_readiness_profiles_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operator_readiness_profiles" ADD CONSTRAINT "operator_readiness_profiles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operator_qualifications" ADD CONSTRAINT "operator_qualifications_operatorReadinessProfileId_fkey" FOREIGN KEY ("operatorReadinessProfileId") REFERENCES "operator_readiness_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operator_qualifications" ADD CONSTRAINT "operator_qualifications_operationalRoleRequirementId_fkey" FOREIGN KEY ("operationalRoleRequirementId") REFERENCES "operational_role_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operator_qualifications" ADD CONSTRAINT "operator_qualifications_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operator_qualifications" ADD CONSTRAINT "operator_qualifications_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operator_qualifications" ADD CONSTRAINT "operator_qualifications_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operator_qualifications" ADD CONSTRAINT "operator_qualifications_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "delegations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operator_qualifications" ADD CONSTRAINT "operator_qualifications_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "operator_competency_assessments" ADD CONSTRAINT "operator_competency_assessments_operatorReadinessProfileId_fkey" FOREIGN KEY ("operatorReadinessProfileId") REFERENCES "operator_readiness_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operator_competency_assessments" ADD CONSTRAINT "operator_competency_assessments_operatorQualificationId_fkey" FOREIGN KEY ("operatorQualificationId") REFERENCES "operator_qualifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operator_competency_assessments" ADD CONSTRAINT "operator_competency_assessments_assessorIdentityId_fkey" FOREIGN KEY ("assessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operator_competency_assessments" ADD CONSTRAINT "operator_competency_assessments_assessorOfficeholderId_fkey" FOREIGN KEY ("assessorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_operatorQualificationId_fkey" FOREIGN KEY ("operatorQualificationId") REFERENCES "operator_qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_trainingRequirementId_fkey" FOREIGN KEY ("trainingRequirementId") REFERENCES "training_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "practical_assessments" ADD CONSTRAINT "practical_assessments_operatorQualificationId_fkey" FOREIGN KEY ("operatorQualificationId") REFERENCES "operator_qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practical_assessments" ADD CONSTRAINT "practical_assessments_assessorIdentityId_fkey" FOREIGN KEY ("assessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "practical_assessments" ADD CONSTRAINT "practical_assessments_assessorOfficeholderId_fkey" FOREIGN KEY ("assessorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "authority_boundary_assessments" ADD CONSTRAINT "authority_boundary_assessments_operatorQualificationId_fkey" FOREIGN KEY ("operatorQualificationId") REFERENCES "operator_qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "authority_boundary_assessments" ADD CONSTRAINT "authority_boundary_assessments_assessorIdentityId_fkey" FOREIGN KEY ("assessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "authority_boundary_assessments" ADD CONSTRAINT "authority_boundary_assessments_assessorOfficeholderId_fkey" FOREIGN KEY ("assessorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "security_privacy_assessments" ADD CONSTRAINT "security_privacy_assessments_operatorQualificationId_fkey" FOREIGN KEY ("operatorQualificationId") REFERENCES "operator_qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "security_privacy_assessments" ADD CONSTRAINT "security_privacy_assessments_assessorIdentityId_fkey" FOREIGN KEY ("assessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_privacy_assessments" ADD CONSTRAINT "security_privacy_assessments_assessorOfficeholderId_fkey" FOREIGN KEY ("assessorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "continuity_competency_assessments" ADD CONSTRAINT "continuity_competency_assessments_operatorQualificationId_fkey" FOREIGN KEY ("operatorQualificationId") REFERENCES "operator_qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "continuity_competency_assessments" ADD CONSTRAINT "continuity_competency_assessments_assessorIdentityId_fkey" FOREIGN KEY ("assessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "continuity_competency_assessments" ADD CONSTRAINT "continuity_competency_assessments_assessorOfficeholderId_fkey" FOREIGN KEY ("assessorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_coverage_plans" ADD CONSTRAINT "support_coverage_plans_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_coverage_plans" ADD CONSTRAINT "support_coverage_plans_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_assignments" ADD CONSTRAINT "support_assignments_supportCoveragePlanId_fkey" FOREIGN KEY ("supportCoveragePlanId") REFERENCES "support_coverage_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_assignments" ADD CONSTRAINT "support_assignments_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_assignments" ADD CONSTRAINT "support_assignments_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "on_call_assignments" ADD CONSTRAINT "on_call_assignments_supportCoveragePlanId_fkey" FOREIGN KEY ("supportCoveragePlanId") REFERENCES "support_coverage_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "on_call_assignments" ADD CONSTRAINT "on_call_assignments_primaryIdentityId_fkey" FOREIGN KEY ("primaryIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "on_call_assignments" ADD CONSTRAINT "on_call_assignments_primaryOfficeholderId_fkey" FOREIGN KEY ("primaryOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "on_call_assignments" ADD CONSTRAINT "on_call_assignments_alternateIdentityId_fkey" FOREIGN KEY ("alternateIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "on_call_assignments" ADD CONSTRAINT "on_call_assignments_alternateOfficeholderId_fkey" FOREIGN KEY ("alternateOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "succession_assignments" ADD CONSTRAINT "succession_assignments_operationalRoleRequirementId_fkey" FOREIGN KEY ("operationalRoleRequirementId") REFERENCES "operational_role_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "succession_assignments" ADD CONSTRAINT "succession_assignments_primaryOfficeholderId_fkey" FOREIGN KEY ("primaryOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "succession_assignments" ADD CONSTRAINT "succession_assignments_alternateOfficeholderId_fkey" FOREIGN KEY ("alternateOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "department_readiness_assessments" ADD CONSTRAINT "department_readiness_assessments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "department_readiness_assessments" ADD CONSTRAINT "department_readiness_assessments_assessorIdentityId_fkey" FOREIGN KEY ("assessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "department_readiness_assessments" ADD CONSTRAINT "department_readiness_assessments_assessorOfficeholderId_fkey" FOREIGN KEY ("assessorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "staffing_readiness_assessments" ADD CONSTRAINT "staffing_readiness_assessments_departmentReadinessAssessmentId_fkey" FOREIGN KEY ("departmentReadinessAssessmentId") REFERENCES "department_readiness_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staffing_readiness_assessments" ADD CONSTRAINT "staffing_readiness_assessments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "staffing_readiness_assessments" ADD CONSTRAINT "staffing_readiness_assessments_assessorIdentityId_fkey" FOREIGN KEY ("assessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "staffing_readiness_assessments" ADD CONSTRAINT "staffing_readiness_assessments_assessorOfficeholderId_fkey" FOREIGN KEY ("assessorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "qualification_expiry_events" ADD CONSTRAINT "qualification_expiry_events_operatorQualificationId_fkey" FOREIGN KEY ("operatorQualificationId") REFERENCES "operator_qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qualification_expiry_events" ADD CONSTRAINT "qualification_expiry_events_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "operator_access_reviews" ADD CONSTRAINT "operator_access_reviews_operatorQualificationId_fkey" FOREIGN KEY ("operatorQualificationId") REFERENCES "operator_qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operator_access_reviews" ADD CONSTRAINT "operator_access_reviews_initiatedByIdentityId_fkey" FOREIGN KEY ("initiatedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operator_access_reviews" ADD CONSTRAINT "operator_access_reviews_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "delegations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
