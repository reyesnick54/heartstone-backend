-- CreateEnum
CREATE TYPE "SocialProtectionDataClassification" AS ENUM ('PUBLIC', 'OFFICIAL', 'APPLICANT_SELF', 'HOUSEHOLD_SCOPED', 'CASEWORKER', 'INSTITUTIONAL', 'CROSS_PROGRAM_RESTRICTED', 'HIGHLY_SENSITIVE');

-- CreateEnum
CREATE TYPE "SocialProtectionActorPersona" AS ENUM ('APPLICANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_REPRESENTATIVE', 'CASEWORKER', 'ELIGIBILITY_OFFICER', 'BENEFIT_DECISION_OFFICER', 'SENIOR_DECISION_OFFICER', 'INSTITUTIONAL_REVIEWER', 'EXTERNAL_AUTHORITY_LIAISON', 'TECHNICAL_ADMIN', 'AI_ASSISTANCE', 'PAYMENT_SYSTEM', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BenefitCategoryKind" AS ENUM ('INCOME_SUPPORT', 'UNEMPLOYMENT_SUPPORT', 'DISABILITY_RELATED', 'PENSION_SOCIAL_SECURITY', 'HOUSING_ASSISTANCE', 'FOOD_ASSISTANCE', 'FAMILY_SUPPORT', 'CHILD_SUPPORT', 'ELDERLY_SUPPORT', 'EMERGENCY_ASSISTANCE', 'EDUCATION_BENEFITS', 'HEALTHCARE_SUPPORT', 'VETERAN_SUPPORT', 'DISASTER_RELIEF', 'TARGETED_SUBSIDY', 'MEANS_TESTED', 'CATEGORY_BASED', 'OTHER_CONFIGURED');

-- CreateEnum
CREATE TYPE "BenefitProgramStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "BenefitProgramVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "BenefitApplicantProfileStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "HouseholdRecordStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "HouseholdMemberRole" AS ENUM ('PRIMARY_APPLICANT', 'MEMBER', 'DEPENDENT', 'REPRESENTED', 'OTHER_CONFIGURED');

-- CreateEnum
CREATE TYPE "HouseholdRelationshipStatus" AS ENUM ('ASSERTED', 'EVIDENCE_REQUIRED', 'VERIFIED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "BenefitApplicationProfileStatus" AS ENUM ('LINKED', 'ACTIVE', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "BenefitEligibilityAssessmentStatus" AS ENUM ('DRAFT', 'PRELIMINARY', 'FINAL', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "BenefitEligibilityOutcome" AS ENUM ('UNDETERMINED', 'PRELIMINARILY_ELIGIBLE', 'PRELIMINARILY_INELIGIBLE', 'REQUIRES_HUMAN_DECISION', 'ELIGIBLE', 'INELIGIBLE');

-- CreateEnum
CREATE TYPE "BenefitAwardLifecycleStatus" AS ENUM ('NOT_AWARDED', 'PENDING_DECISION', 'AWARDED', 'EFFECTIVE', 'SUSPENDED', 'TERMINATED', 'SUPERSEDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BenefitReviewKind" AS ENUM ('PERIODIC', 'CHANGE_IN_CIRCUMSTANCE', 'COMPLIANCE', 'QUALITY', 'OTHER_CONFIGURED');

-- CreateEnum
CREATE TYPE "BenefitRenewalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'DECIDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BenefitSuspensionStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'LIFTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BenefitTerminationStatus" AS ENUM ('PROPOSED', 'EFFECTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "BenefitStatusHistorySubjectKind" AS ENUM ('AWARD', 'APPLICATION_PROFILE', 'ELIGIBILITY_ASSESSMENT');

-- CreateEnum
CREATE TYPE "HouseholdDeclarationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ExternalEligibilityDeterminationRecordedBy" AS ENUM ('EXTERNAL_AUTHORITY_LIAISON', 'INTEGRATION_SYSTEM', 'ELIGIBILITY_OFFICER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SocialProtectionAppealReferenceStatus" AS ENUM ('LINKED', 'ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "benefit_categories" (
    "id" UUID NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "categoryKind" "BenefitCategoryKind" NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "jurisdictionId" UUID,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_programs" (
    "id" UUID NOT NULL,
    "programCode" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "benefitCategoryId" UUID NOT NULL,
    "jurisdictionId" UUID,
    "institutionId" UUID,
    "status" "BenefitProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "doesNotEncodeEligibilityLaw" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_program_versions" (
    "id" UUID NOT NULL,
    "benefitProgramId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "BenefitProgramVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "governmentServiceVersionId" UUID,
    "eligibilityRuleVersionReference" TEXT,
    "humanDecisionRequired" BOOLEAN NOT NULL DEFAULT true,
    "workflowPermitsAutoAward" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_program_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_applicant_profiles" (
    "id" UUID NOT NULL,
    "profileReferenceNumber" TEXT NOT NULL,
    "primaryApplicantIdentityId" UUID NOT NULL,
    "jurisdictionId" UUID,
    "masterAdministrativeFileId" UUID,
    "status" "BenefitApplicantProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "dataClassification" "SocialProtectionDataClassification" NOT NULL DEFAULT 'APPLICANT_SELF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_applicant_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_records" (
    "id" UUID NOT NULL,
    "householdReferenceNumber" TEXT NOT NULL,
    "benefitApplicantProfileId" UUID,
    "jurisdictionId" UUID,
    "status" "HouseholdRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "isSameAsFamily" BOOLEAN NOT NULL DEFAULT false,
    "isSameAsAddress" BOOLEAN NOT NULL DEFAULT false,
    "addressReferenceToken" TEXT,
    "dataClassification" "SocialProtectionDataClassification" NOT NULL DEFAULT 'HOUSEHOLD_SCOPED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_members" (
    "id" UUID NOT NULL,
    "householdRecordId" UUID NOT NULL,
    "memberIdentityId" UUID,
    "benefitApplicantProfileId" UUID,
    "memberRole" "HouseholdMemberRole" NOT NULL DEFAULT 'MEMBER',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_relationships" (
    "id" UUID NOT NULL,
    "householdRecordId" UUID NOT NULL,
    "fromHouseholdMemberId" UUID NOT NULL,
    "toHouseholdMemberId" UUID NOT NULL,
    "relationshipTypeCode" TEXT NOT NULL,
    "relationshipLabel" TEXT,
    "status" "HouseholdRelationshipStatus" NOT NULL DEFAULT 'ASSERTED',
    "requiresEvidence" BOOLEAN NOT NULL DEFAULT false,
    "evidenceRecordId" UUID,
    "isSharedFinances" BOOLEAN NOT NULL DEFAULT false,
    "isSpouseAssumption" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_application_profiles" (
    "id" UUID NOT NULL,
    "profileNumber" TEXT NOT NULL,
    "benefitApplicantProfileId" UUID NOT NULL,
    "benefitProgramId" UUID NOT NULL,
    "benefitProgramVersionId" UUID NOT NULL,
    "householdRecordId" UUID,
    "caseId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "status" "BenefitApplicationProfileStatus" NOT NULL DEFAULT 'LINKED',
    "doesNotCreateBenefitAward" BOOLEAN NOT NULL DEFAULT true,
    "doesNotInferEligibility" BOOLEAN NOT NULL DEFAULT true,
    "paymentDoesNotDetermineEligibility" BOOLEAN NOT NULL DEFAULT true,
    "submissionAcknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_application_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_eligibility_assessments" (
    "id" UUID NOT NULL,
    "assessmentReference" TEXT NOT NULL,
    "benefitApplicationProfileId" UUID NOT NULL,
    "benefitProgramId" UUID NOT NULL,
    "benefitProgramVersionId" UUID NOT NULL,
    "eligibilityRuleVersionReference" TEXT NOT NULL,
    "status" "BenefitEligibilityAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "outcome" "BenefitEligibilityOutcome" NOT NULL DEFAULT 'UNDETERMINED',
    "inputFacts" JSONB NOT NULL DEFAULT '{}',
    "assessmentResult" JSONB NOT NULL DEFAULT '{}',
    "requiresHumanDecision" BOOLEAN NOT NULL DEFAULT true,
    "humanDecisionRecorded" BOOLEAN NOT NULL DEFAULT false,
    "humanDecisionGovernmentDecisionId" UUID,
    "doesNotCreateBenefitAward" BOOLEAN NOT NULL DEFAULT true,
    "actorPersona" "SocialProtectionActorPersona",
    "assessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_eligibility_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_factor_references" (
    "id" UUID NOT NULL,
    "benefitEligibilityAssessmentId" UUID NOT NULL,
    "factorCode" TEXT NOT NULL,
    "factorLabel" TEXT,
    "configuredFactReference" TEXT,
    "declaredValueSummary" TEXT,
    "isVerifiedFact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eligibility_factor_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_evidence_references" (
    "id" UUID NOT NULL,
    "benefitEligibilityAssessmentId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "purposeCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eligibility_evidence_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_eligibility_determination_references" (
    "id" UUID NOT NULL,
    "determinationReference" TEXT NOT NULL,
    "benefitEligibilityAssessmentId" UUID,
    "caseId" UUID,
    "externalAuthorityId" UUID NOT NULL,
    "determinationStatus" "ExternalDeterminationStatus" NOT NULL DEFAULT 'PENDING',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "blocksDecisionWhenRequired" BOOLEAN NOT NULL DEFAULT false,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "authenticatedPayloadHash" TEXT,
    "recordedBy" "ExternalEligibilityDeterminationRecordedBy" NOT NULL,
    "recordedByIdentityId" UUID,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_eligibility_determination_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_awards" (
    "id" UUID NOT NULL,
    "awardNumber" TEXT NOT NULL,
    "benefitApplicationProfileId" UUID,
    "benefitProgramId" UUID NOT NULL,
    "benefitProgramVersionId" UUID NOT NULL,
    "governmentDecisionId" UUID,
    "lifecycleStatus" "BenefitAwardLifecycleStatus" NOT NULL DEFAULT 'NOT_AWARDED',
    "currentBenefitAwardVersionId" UUID,
    "doesNotDetermineContinuingEligibility" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_award_versions" (
    "id" UUID NOT NULL,
    "benefitAwardId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "conditionsSummary" TEXT,
    "governmentDecisionId" UUID,
    "supersededAt" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benefit_award_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_entitlement_periods" (
    "id" UUID NOT NULL,
    "benefitAwardId" UUID NOT NULL,
    "benefitAwardVersionId" UUID,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "entitlementCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benefit_entitlement_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_payment_schedule_references" (
    "id" UUID NOT NULL,
    "benefitAwardId" UUID NOT NULL,
    "scheduleReference" TEXT NOT NULL,
    "invoiceId" UUID,
    "authorizesSchedulingOnly" BOOLEAN NOT NULL DEFAULT true,
    "doesNotDetermineEligibility" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benefit_payment_schedule_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_disbursement_references" (
    "id" UUID NOT NULL,
    "benefitAwardId" UUID NOT NULL,
    "disbursementReference" TEXT NOT NULL,
    "paymentTransactionId" UUID,
    "doesNotDetermineEligibility" BOOLEAN NOT NULL DEFAULT true,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benefit_disbursement_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_reviews" (
    "id" UUID NOT NULL,
    "benefitAwardId" UUID NOT NULL,
    "caseId" UUID,
    "reviewKind" "BenefitReviewKind" NOT NULL,
    "reviewReference" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benefit_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_renewals" (
    "id" UUID NOT NULL,
    "benefitAwardId" UUID NOT NULL,
    "renewalReference" TEXT NOT NULL,
    "status" "BenefitRenewalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_renewals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_suspensions" (
    "id" UUID NOT NULL,
    "benefitAwardId" UUID NOT NULL,
    "suspensionReference" TEXT NOT NULL,
    "status" "BenefitSuspensionStatus" NOT NULL DEFAULT 'PROPOSED',
    "reasonSummary" TEXT,
    "functionAuthorityRecordId" UUID,
    "authorityEvaluationRecordId" UUID,
    "governmentDecisionId" UUID,
    "actorPersona" "SocialProtectionActorPersona" NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "liftedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_suspensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_terminations" (
    "id" UUID NOT NULL,
    "benefitAwardId" UUID NOT NULL,
    "terminationReference" TEXT NOT NULL,
    "status" "BenefitTerminationStatus" NOT NULL DEFAULT 'PROPOSED',
    "reasonSummary" TEXT,
    "governmentDecisionId" UUID,
    "actorPersona" "SocialProtectionActorPersona" NOT NULL,
    "effectiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_terminations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_status_history" (
    "id" UUID NOT NULL,
    "subjectKind" "BenefitStatusHistorySubjectKind" NOT NULL,
    "benefitAwardId" UUID,
    "fromStatusCode" TEXT,
    "toStatusCode" TEXT NOT NULL,
    "actorIdentityId" UUID,
    "actorPersona" "SocialProtectionActorPersona" NOT NULL,
    "reasonSummary" TEXT,
    "governmentDecisionId" UUID,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benefit_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_income_declarations" (
    "id" UUID NOT NULL,
    "householdRecordId" UUID NOT NULL,
    "declarationReference" TEXT NOT NULL,
    "status" "HouseholdDeclarationStatus" NOT NULL DEFAULT 'DRAFT',
    "reportingPeriodCode" TEXT,
    "declaredAmountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "isVerifiedGovernmentFact" BOOLEAN NOT NULL DEFAULT false,
    "declaredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_income_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_asset_declarations" (
    "id" UUID NOT NULL,
    "householdRecordId" UUID NOT NULL,
    "declarationReference" TEXT NOT NULL,
    "status" "HouseholdDeclarationStatus" NOT NULL DEFAULT 'DRAFT',
    "assetCategoryCode" TEXT,
    "declaredValueCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "isVerifiedGovernmentFact" BOOLEAN NOT NULL DEFAULT false,
    "declaredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_asset_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_support_case_references" (
    "id" UUID NOT NULL,
    "referenceToken" TEXT NOT NULL,
    "benefitApplicationProfileId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "coordinationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_support_case_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_protection_appeal_references" (
    "id" UUID NOT NULL,
    "appealReference" TEXT NOT NULL,
    "benefitAwardId" UUID NOT NULL,
    "redressMatterId" UUID,
    "originalBenefitAwardVersionId" UUID NOT NULL,
    "challengedGovernmentDecisionId" UUID,
    "preservesOriginalDecision" BOOLEAN NOT NULL DEFAULT true,
    "status" "SocialProtectionAppealReferenceStatus" NOT NULL DEFAULT 'LINKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_protection_appeal_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "benefit_categories_categoryCode_key" ON "benefit_categories"("categoryCode");

-- CreateIndex
CREATE INDEX "benefit_categories_categoryKind_idx" ON "benefit_categories"("categoryKind");

-- CreateIndex
CREATE INDEX "benefit_categories_jurisdictionId_idx" ON "benefit_categories"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_programs_programCode_key" ON "benefit_programs"("programCode");

-- CreateIndex
CREATE INDEX "benefit_programs_benefitCategoryId_idx" ON "benefit_programs"("benefitCategoryId");

-- CreateIndex
CREATE INDEX "benefit_programs_jurisdictionId_idx" ON "benefit_programs"("jurisdictionId");

-- CreateIndex
CREATE INDEX "benefit_programs_status_idx" ON "benefit_programs"("status");

-- CreateIndex
CREATE INDEX "benefit_program_versions_benefitProgramId_idx" ON "benefit_program_versions"("benefitProgramId");

-- CreateIndex
CREATE INDEX "benefit_program_versions_status_idx" ON "benefit_program_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_program_versions_benefitProgramId_versionNumber_key" ON "benefit_program_versions"("benefitProgramId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_applicant_profiles_profileReferenceNumber_key" ON "benefit_applicant_profiles"("profileReferenceNumber");

-- CreateIndex
CREATE INDEX "benefit_applicant_profiles_primaryApplicantIdentityId_idx" ON "benefit_applicant_profiles"("primaryApplicantIdentityId");

-- CreateIndex
CREATE INDEX "benefit_applicant_profiles_jurisdictionId_idx" ON "benefit_applicant_profiles"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "household_records_householdReferenceNumber_key" ON "household_records"("householdReferenceNumber");

-- CreateIndex
CREATE INDEX "household_records_benefitApplicantProfileId_idx" ON "household_records"("benefitApplicantProfileId");

-- CreateIndex
CREATE INDEX "household_records_status_idx" ON "household_records"("status");

-- CreateIndex
CREATE INDEX "household_members_householdRecordId_idx" ON "household_members"("householdRecordId");

-- CreateIndex
CREATE INDEX "household_members_memberIdentityId_idx" ON "household_members"("memberIdentityId");

-- CreateIndex
CREATE INDEX "household_relationships_householdRecordId_idx" ON "household_relationships"("householdRecordId");

-- CreateIndex
CREATE INDEX "household_relationships_fromHouseholdMemberId_idx" ON "household_relationships"("fromHouseholdMemberId");

-- CreateIndex
CREATE INDEX "household_relationships_toHouseholdMemberId_idx" ON "household_relationships"("toHouseholdMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_application_profiles_profileNumber_key" ON "benefit_application_profiles"("profileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_application_profiles_caseId_key" ON "benefit_application_profiles"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_application_profiles_applicationId_key" ON "benefit_application_profiles"("applicationId");

-- CreateIndex
CREATE INDEX "benefit_application_profiles_benefitApplicantProfileId_idx" ON "benefit_application_profiles"("benefitApplicantProfileId");

-- CreateIndex
CREATE INDEX "benefit_application_profiles_benefitProgramId_idx" ON "benefit_application_profiles"("benefitProgramId");

-- CreateIndex
CREATE INDEX "benefit_application_profiles_householdRecordId_idx" ON "benefit_application_profiles"("householdRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_eligibility_assessments_assessmentReference_key" ON "benefit_eligibility_assessments"("assessmentReference");

-- CreateIndex
CREATE INDEX "benefit_eligibility_assessments_benefitApplicationProfileId_idx" ON "benefit_eligibility_assessments"("benefitApplicationProfileId");

-- CreateIndex
CREATE INDEX "benefit_eligibility_assessments_benefitProgramVersionId_idx" ON "benefit_eligibility_assessments"("benefitProgramVersionId");

-- CreateIndex
CREATE INDEX "benefit_eligibility_assessments_status_idx" ON "benefit_eligibility_assessments"("status");

-- CreateIndex
CREATE INDEX "eligibility_factor_references_benefitEligibilityAssessmentI_idx" ON "eligibility_factor_references"("benefitEligibilityAssessmentId");

-- CreateIndex
CREATE INDEX "eligibility_evidence_references_benefitEligibilityAssessmen_idx" ON "eligibility_evidence_references"("benefitEligibilityAssessmentId");

-- CreateIndex
CREATE INDEX "eligibility_evidence_references_evidenceRecordId_idx" ON "eligibility_evidence_references"("evidenceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "external_eligibility_determination_references_determination_key" ON "external_eligibility_determination_references"("determinationReference");

-- CreateIndex
CREATE INDEX "external_eligibility_determination_references_benefitEligib_idx" ON "external_eligibility_determination_references"("benefitEligibilityAssessmentId");

-- CreateIndex
CREATE INDEX "external_eligibility_determination_references_caseId_idx" ON "external_eligibility_determination_references"("caseId");

-- CreateIndex
CREATE INDEX "external_eligibility_determination_references_externalAutho_idx" ON "external_eligibility_determination_references"("externalAuthorityId");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_awards_awardNumber_key" ON "benefit_awards"("awardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_awards_currentBenefitAwardVersionId_key" ON "benefit_awards"("currentBenefitAwardVersionId");

-- CreateIndex
CREATE INDEX "benefit_awards_benefitProgramId_idx" ON "benefit_awards"("benefitProgramId");

-- CreateIndex
CREATE INDEX "benefit_awards_lifecycleStatus_idx" ON "benefit_awards"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "benefit_award_versions_benefitAwardId_idx" ON "benefit_award_versions"("benefitAwardId");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_award_versions_benefitAwardId_versionNumber_key" ON "benefit_award_versions"("benefitAwardId", "versionNumber");

-- CreateIndex
CREATE INDEX "benefit_entitlement_periods_benefitAwardId_idx" ON "benefit_entitlement_periods"("benefitAwardId");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_payment_schedule_references_scheduleReference_key" ON "benefit_payment_schedule_references"("scheduleReference");

-- CreateIndex
CREATE INDEX "benefit_payment_schedule_references_benefitAwardId_idx" ON "benefit_payment_schedule_references"("benefitAwardId");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_disbursement_references_disbursementReference_key" ON "benefit_disbursement_references"("disbursementReference");

-- CreateIndex
CREATE INDEX "benefit_disbursement_references_benefitAwardId_idx" ON "benefit_disbursement_references"("benefitAwardId");

-- CreateIndex
CREATE INDEX "benefit_disbursement_references_paymentTransactionId_idx" ON "benefit_disbursement_references"("paymentTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_reviews_reviewReference_key" ON "benefit_reviews"("reviewReference");

-- CreateIndex
CREATE INDEX "benefit_reviews_benefitAwardId_idx" ON "benefit_reviews"("benefitAwardId");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_renewals_renewalReference_key" ON "benefit_renewals"("renewalReference");

-- CreateIndex
CREATE INDEX "benefit_renewals_benefitAwardId_idx" ON "benefit_renewals"("benefitAwardId");

-- CreateIndex
CREATE INDEX "benefit_renewals_status_idx" ON "benefit_renewals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_suspensions_suspensionReference_key" ON "benefit_suspensions"("suspensionReference");

-- CreateIndex
CREATE INDEX "benefit_suspensions_benefitAwardId_idx" ON "benefit_suspensions"("benefitAwardId");

-- CreateIndex
CREATE INDEX "benefit_suspensions_status_idx" ON "benefit_suspensions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_terminations_terminationReference_key" ON "benefit_terminations"("terminationReference");

-- CreateIndex
CREATE INDEX "benefit_terminations_benefitAwardId_idx" ON "benefit_terminations"("benefitAwardId");

-- CreateIndex
CREATE INDEX "benefit_status_history_benefitAwardId_idx" ON "benefit_status_history"("benefitAwardId");

-- CreateIndex
CREATE INDEX "benefit_status_history_recordedAt_idx" ON "benefit_status_history"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "household_income_declarations_declarationReference_key" ON "household_income_declarations"("declarationReference");

-- CreateIndex
CREATE INDEX "household_income_declarations_householdRecordId_idx" ON "household_income_declarations"("householdRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "household_asset_declarations_declarationReference_key" ON "household_asset_declarations"("declarationReference");

-- CreateIndex
CREATE INDEX "household_asset_declarations_householdRecordId_idx" ON "household_asset_declarations"("householdRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "social_support_case_references_referenceToken_key" ON "social_support_case_references"("referenceToken");

-- CreateIndex
CREATE UNIQUE INDEX "social_support_case_references_benefitApplicationProfileId_key" ON "social_support_case_references"("benefitApplicationProfileId");

-- CreateIndex
CREATE INDEX "social_support_case_references_caseId_idx" ON "social_support_case_references"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "social_protection_appeal_references_appealReference_key" ON "social_protection_appeal_references"("appealReference");

-- CreateIndex
CREATE INDEX "social_protection_appeal_references_benefitAwardId_idx" ON "social_protection_appeal_references"("benefitAwardId");

-- CreateIndex
CREATE INDEX "social_protection_appeal_references_redressMatterId_idx" ON "social_protection_appeal_references"("redressMatterId");

-- AddForeignKey
ALTER TABLE "benefit_categories" ADD CONSTRAINT "benefit_categories_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_programs" ADD CONSTRAINT "benefit_programs_benefitCategoryId_fkey" FOREIGN KEY ("benefitCategoryId") REFERENCES "benefit_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_programs" ADD CONSTRAINT "benefit_programs_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_programs" ADD CONSTRAINT "benefit_programs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_program_versions" ADD CONSTRAINT "benefit_program_versions_benefitProgramId_fkey" FOREIGN KEY ("benefitProgramId") REFERENCES "benefit_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_program_versions" ADD CONSTRAINT "benefit_program_versions_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_applicant_profiles" ADD CONSTRAINT "benefit_applicant_profiles_primaryApplicantIdentityId_fkey" FOREIGN KEY ("primaryApplicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_applicant_profiles" ADD CONSTRAINT "benefit_applicant_profiles_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_applicant_profiles" ADD CONSTRAINT "benefit_applicant_profiles_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_records" ADD CONSTRAINT "household_records_benefitApplicantProfileId_fkey" FOREIGN KEY ("benefitApplicantProfileId") REFERENCES "benefit_applicant_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_records" ADD CONSTRAINT "household_records_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_householdRecordId_fkey" FOREIGN KEY ("householdRecordId") REFERENCES "household_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_memberIdentityId_fkey" FOREIGN KEY ("memberIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_benefitApplicantProfileId_fkey" FOREIGN KEY ("benefitApplicantProfileId") REFERENCES "benefit_applicant_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_relationships" ADD CONSTRAINT "household_relationships_householdRecordId_fkey" FOREIGN KEY ("householdRecordId") REFERENCES "household_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_relationships" ADD CONSTRAINT "household_relationships_fromHouseholdMemberId_fkey" FOREIGN KEY ("fromHouseholdMemberId") REFERENCES "household_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_relationships" ADD CONSTRAINT "household_relationships_toHouseholdMemberId_fkey" FOREIGN KEY ("toHouseholdMemberId") REFERENCES "household_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_relationships" ADD CONSTRAINT "household_relationships_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_application_profiles" ADD CONSTRAINT "benefit_application_profiles_benefitApplicantProfileId_fkey" FOREIGN KEY ("benefitApplicantProfileId") REFERENCES "benefit_applicant_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_application_profiles" ADD CONSTRAINT "benefit_application_profiles_benefitProgramId_fkey" FOREIGN KEY ("benefitProgramId") REFERENCES "benefit_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_application_profiles" ADD CONSTRAINT "benefit_application_profiles_benefitProgramVersionId_fkey" FOREIGN KEY ("benefitProgramVersionId") REFERENCES "benefit_program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_application_profiles" ADD CONSTRAINT "benefit_application_profiles_householdRecordId_fkey" FOREIGN KEY ("householdRecordId") REFERENCES "household_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_application_profiles" ADD CONSTRAINT "benefit_application_profiles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_application_profiles" ADD CONSTRAINT "benefit_application_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_eligibility_assessments" ADD CONSTRAINT "benefit_eligibility_assessments_benefitApplicationProfileI_fkey" FOREIGN KEY ("benefitApplicationProfileId") REFERENCES "benefit_application_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_eligibility_assessments" ADD CONSTRAINT "benefit_eligibility_assessments_benefitProgramId_fkey" FOREIGN KEY ("benefitProgramId") REFERENCES "benefit_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_eligibility_assessments" ADD CONSTRAINT "benefit_eligibility_assessments_benefitProgramVersionId_fkey" FOREIGN KEY ("benefitProgramVersionId") REFERENCES "benefit_program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_eligibility_assessments" ADD CONSTRAINT "benefit_eligibility_assessments_humanDecisionGovernmentDec_fkey" FOREIGN KEY ("humanDecisionGovernmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_factor_references" ADD CONSTRAINT "eligibility_factor_references_benefitEligibilityAssessment_fkey" FOREIGN KEY ("benefitEligibilityAssessmentId") REFERENCES "benefit_eligibility_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_evidence_references" ADD CONSTRAINT "eligibility_evidence_references_benefitEligibilityAssessme_fkey" FOREIGN KEY ("benefitEligibilityAssessmentId") REFERENCES "benefit_eligibility_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_evidence_references" ADD CONSTRAINT "eligibility_evidence_references_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_eligibility_determination_references" ADD CONSTRAINT "external_eligibility_determination_references_benefitEligi_fkey" FOREIGN KEY ("benefitEligibilityAssessmentId") REFERENCES "benefit_eligibility_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_eligibility_determination_references" ADD CONSTRAINT "external_eligibility_determination_references_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_eligibility_determination_references" ADD CONSTRAINT "external_eligibility_determination_references_externalAuth_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_eligibility_determination_references" ADD CONSTRAINT "external_eligibility_determination_references_recordedById_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_awards" ADD CONSTRAINT "benefit_awards_benefitApplicationProfileId_fkey" FOREIGN KEY ("benefitApplicationProfileId") REFERENCES "benefit_application_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_awards" ADD CONSTRAINT "benefit_awards_benefitProgramId_fkey" FOREIGN KEY ("benefitProgramId") REFERENCES "benefit_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_awards" ADD CONSTRAINT "benefit_awards_benefitProgramVersionId_fkey" FOREIGN KEY ("benefitProgramVersionId") REFERENCES "benefit_program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_awards" ADD CONSTRAINT "benefit_awards_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_awards" ADD CONSTRAINT "benefit_awards_currentBenefitAwardVersionId_fkey" FOREIGN KEY ("currentBenefitAwardVersionId") REFERENCES "benefit_award_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_award_versions" ADD CONSTRAINT "benefit_award_versions_benefitAwardId_fkey" FOREIGN KEY ("benefitAwardId") REFERENCES "benefit_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_award_versions" ADD CONSTRAINT "benefit_award_versions_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_entitlement_periods" ADD CONSTRAINT "benefit_entitlement_periods_benefitAwardId_fkey" FOREIGN KEY ("benefitAwardId") REFERENCES "benefit_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_entitlement_periods" ADD CONSTRAINT "benefit_entitlement_periods_benefitAwardVersionId_fkey" FOREIGN KEY ("benefitAwardVersionId") REFERENCES "benefit_award_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_payment_schedule_references" ADD CONSTRAINT "benefit_payment_schedule_references_benefitAwardId_fkey" FOREIGN KEY ("benefitAwardId") REFERENCES "benefit_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_payment_schedule_references" ADD CONSTRAINT "benefit_payment_schedule_references_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_disbursement_references" ADD CONSTRAINT "benefit_disbursement_references_benefitAwardId_fkey" FOREIGN KEY ("benefitAwardId") REFERENCES "benefit_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_disbursement_references" ADD CONSTRAINT "benefit_disbursement_references_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_reviews" ADD CONSTRAINT "benefit_reviews_benefitAwardId_fkey" FOREIGN KEY ("benefitAwardId") REFERENCES "benefit_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_reviews" ADD CONSTRAINT "benefit_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_renewals" ADD CONSTRAINT "benefit_renewals_benefitAwardId_fkey" FOREIGN KEY ("benefitAwardId") REFERENCES "benefit_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_suspensions" ADD CONSTRAINT "benefit_suspensions_benefitAwardId_fkey" FOREIGN KEY ("benefitAwardId") REFERENCES "benefit_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_suspensions" ADD CONSTRAINT "benefit_suspensions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_suspensions" ADD CONSTRAINT "benefit_suspensions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_suspensions" ADD CONSTRAINT "benefit_suspensions_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_terminations" ADD CONSTRAINT "benefit_terminations_benefitAwardId_fkey" FOREIGN KEY ("benefitAwardId") REFERENCES "benefit_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_terminations" ADD CONSTRAINT "benefit_terminations_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_status_history" ADD CONSTRAINT "benefit_status_history_benefitAwardId_fkey" FOREIGN KEY ("benefitAwardId") REFERENCES "benefit_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_status_history" ADD CONSTRAINT "benefit_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_status_history" ADD CONSTRAINT "benefit_status_history_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_income_declarations" ADD CONSTRAINT "household_income_declarations_householdRecordId_fkey" FOREIGN KEY ("householdRecordId") REFERENCES "household_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_asset_declarations" ADD CONSTRAINT "household_asset_declarations_householdRecordId_fkey" FOREIGN KEY ("householdRecordId") REFERENCES "household_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_support_case_references" ADD CONSTRAINT "social_support_case_references_benefitApplicationProfileId_fkey" FOREIGN KEY ("benefitApplicationProfileId") REFERENCES "benefit_application_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_support_case_references" ADD CONSTRAINT "social_support_case_references_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_protection_appeal_references" ADD CONSTRAINT "social_protection_appeal_references_benefitAwardId_fkey" FOREIGN KEY ("benefitAwardId") REFERENCES "benefit_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_protection_appeal_references" ADD CONSTRAINT "social_protection_appeal_references_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_protection_appeal_references" ADD CONSTRAINT "social_protection_appeal_references_originalBenefitAwardVe_fkey" FOREIGN KEY ("originalBenefitAwardVersionId") REFERENCES "benefit_award_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_protection_appeal_references" ADD CONSTRAINT "social_protection_appeal_references_challengedGovernmentDe_fkey" FOREIGN KEY ("challengedGovernmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

