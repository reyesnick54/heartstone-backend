-- CreateEnum
CREATE TYPE "ComplianceMatterStatus" AS ENUM ('OPEN', 'MONITORING', 'AWAITING_REPORT', 'UNDER_REVIEW', 'INSPECTION_REQUIRED', 'CORRECTIVE_ACTION', 'ESCALATED', 'REFERRED_EXTERNALLY', 'SAFE_HALTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ContinuingObligationSourceType" AS ENUM ('DECISION_CONDITION', 'INSTRUMENT_VERSION', 'GOVERNING_SOURCE', 'AUTHORIZED_REQUIREMENT');

-- CreateEnum
CREATE TYPE "ContinuingObligationType" AS ENUM ('REPORTING', 'FINANCIAL', 'INSURANCE', 'PROFESSIONAL_STATUS', 'ACTIVITY_RESTRICTION', 'OPERATING_CONDITION', 'WORKFORCE', 'ENVIRONMENTAL', 'SAFETY', 'CYBERSECURITY', 'MAINTENANCE', 'MILESTONE', 'INCIDENT_NOTIFICATION', 'INSPECTION', 'RECORDKEEPING', 'GOVERNMENT_CONFIRMATION', 'OTHER_AUTHORIZED');

-- CreateEnum
CREATE TYPE "ContinuingObligationStatus" AS ENUM ('NOT_YET_DUE', 'DUE', 'SUBMITTED', 'UNDER_REVIEW', 'SATISFIED', 'PARTIALLY_SATISFIED', 'OVERDUE', 'DISPUTED', 'EXEMPTED_BY_AUTHORIZED_ACTION', 'SUPERSEDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ObligationScheduleStatus" AS ENUM ('SCHEDULED', 'REMINDER_SENT', 'DUE', 'FULFILLED', 'MISSED', 'SUPERSEDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ObligationStatusChangeActor" AS ENUM ('COMPLIANCE_ADMIN', 'REVIEWER', 'SYSTEM', 'HOLDER', 'AI_ASSISTANCE', 'PAYMENT_SYSTEM');

-- CreateEnum
CREATE TYPE "ComplianceRiskScorePurpose" AS ENUM ('PRIORITIZATION_ONLY');

-- CreateEnum
CREATE TYPE "RedressRouteCategory" AS ENUM ('ADMINISTRATIVE_CORRECTION', 'CLARIFICATION', 'SERVICE_COMPLAINT', 'CONDUCT_COMPLAINT', 'PRIVACY_SECURITY_COMPLAINT', 'AI_AUTOMATION_CHALLENGE', 'RECONSIDERATION', 'INTERNAL_ADMINISTRATIVE_REVIEW', 'STATUTORY_APPEAL', 'PROFESSIONAL_CHALLENGE', 'REGULATORY_REVIEW', 'OMBUDS_OVERSIGHT', 'JUDICIAL_REVIEW_COORDINATION');

-- CreateEnum
CREATE TYPE "RedressRouteVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RedressMatterStatus" AS ENUM ('OPEN', 'INTAKE', 'STANDING_ASSESSMENT', 'TIMELINESS_ASSESSMENT', 'CLASSIFICATION', 'INVESTIGATION', 'REVIEW', 'EXTERNAL_REFERRAL', 'DECISION_PENDING', 'IMPLEMENTATION', 'CLOSED', 'SAFE_HALTED');

-- CreateEnum
CREATE TYPE "RedressFilingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'CLASSIFIED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RedressStandingOutcome" AS ENUM ('NOT_ASSESSED', 'STANDING_ESTABLISHED', 'STANDING_DENIED', 'STANDING_CONDITIONAL', 'REQUIRES_HUMAN_DETERMINATION');

-- CreateEnum
CREATE TYPE "RedressTimelinessOutcome" AS ENUM ('NOT_ASSESSED', 'TIMELY', 'LATE', 'EXTENSION_REQUESTED', 'EXTENSION_GRANTED', 'EXTENSION_DENIED', 'REQUIRES_HUMAN_DETERMINATION');

-- CreateEnum
CREATE TYPE "DeadlineExtensionOutcome" AS ENUM ('PENDING', 'GRANTED', 'DENIED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ComplaintClassificationType" AS ENUM ('SERVICE', 'CONDUCT', 'PRIVACY_SECURITY', 'NOT_A_COMPLAINT');

-- CreateEnum
CREATE TYPE "ComplaintInvestigationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ComplaintClosureReason" AS ENUM ('RESOLVED', 'WITHDRAWN', 'DISMISSED', 'REFERRED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "RedressReviewType" AS ENUM ('RECONSIDERATION', 'INTERNAL_ADMINISTRATIVE_REVIEW', 'STATUTORY_APPEAL', 'PROFESSIONAL_CHALLENGE', 'REGULATORY_REVIEW', 'OMBUDS_OVERSIGHT', 'JUDICIAL_REVIEW_COORDINATION');

-- CreateEnum
CREATE TYPE "ReviewIndependenceOutcome" AS ENUM ('NOT_ASSESSED', 'INDEPENDENCE_ESTABLISHED', 'INDEPENDENCE_BLOCKED', 'REQUIRES_HUMAN_DETERMINATION');

-- CreateEnum
CREATE TYPE "ReviewAuthorityOutcome" AS ENUM ('NOT_ASSESSED', 'AUTHORITY_ESTABLISHED', 'AUTHORITY_DENIED', 'REQUIRES_HUMAN_DETERMINATION');

-- CreateEnum
CREATE TYPE "ExternalReviewReferralStatus" AS ENUM ('PREPARING', 'TRANSMITTED', 'ACKNOWLEDGED', 'DETERMINATION_RECEIVED', 'IMPLEMENTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ExternalDeterminationAuthenticity" AS ENUM ('UNVERIFIED', 'AUTHENTICATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AutomationChallengeDispositionOutcome" AS ENUM ('PENDING', 'UPHELD', 'VARIED', 'DISMISSED', 'REPROCESSING_ORDERED');

-- CreateEnum
CREATE TYPE "RedressDecisionOutcome" AS ENUM ('RECOMMENDATION', 'UPHELD', 'VARIED', 'REVERSED', 'REMANDED', 'DISMISSED', 'CORRECTED_NONSUBSTANTIVE', 'CLARIFIED', 'SERVICE_REMEDY', 'EXTERNAL_REFERRAL');

-- CreateEnum
CREATE TYPE "RedressDecisionStatus" AS ENUM ('DRAFT', 'RECORDED', 'IMPLEMENTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "InterimReliefOutcome" AS ENUM ('PENDING', 'GRANTED', 'DENIED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RedressImplementationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "RedressSafeHaltReason" AS ENUM ('AUTHORITY_UNRESOLVED', 'REVIEWER_APPOINTMENT_INVALID', 'INDEPENDENCE_NOT_ESTABLISHED', 'SNAPSHOT_NOT_RECONSTRUCTABLE', 'EVIDENCE_INTEGRITY_COMPROMISED', 'ROUTE_SUPERSEDED', 'EXTERNAL_AUTHENTICITY_UNRESOLVED', 'NOTICE_CANNOT_BE_PROVIDED', 'IMPLEMENTATION_AUTHORITY_BYPASS', 'LEGAL_HOLD_PREVENTS_HANDLING');

-- CreateEnum
CREATE TYPE "RedressNoticeType" AS ENUM ('ACKNOWLEDGMENT', 'CLASSIFICATION', 'INVESTIGATION_UPDATE', 'DECISION', 'IMPLEMENTATION', 'STAY', 'EXTERNAL_REFERRAL', 'CORRECTION', 'CLARIFICATION');

-- DropForeignKey
ALTER TABLE "_PacketItemAcceptances" DROP CONSTRAINT "_PacketItemAcceptances_A_fkey";

-- DropForeignKey
ALTER TABLE "_PacketItemAcceptances" DROP CONSTRAINT "_PacketItemAcceptances_B_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_authorityEvaluationRecordId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_caseId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_decisionReadinessAssessmentId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_decisionTypeVersionId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_evidencePacketVersionId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_functionAuthorityRecordId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "government_decisions" DROP CONSTRAINT "government_decisions_masterAdministrativeFileId_fkey";

-- DropForeignKey
ALTER TABLE "official_instrument_versions" DROP CONSTRAINT "official_instrument_versions_templateVersionId_fkey";

-- DropForeignKey
ALTER TABLE "official_instruments" DROP CONSTRAINT "official_instruments_caseId_fkey";

-- DropForeignKey
ALTER TABLE "official_instruments" DROP CONSTRAINT "official_instruments_instrumentTypeVersionId_fkey";

-- DropForeignKey
ALTER TABLE "official_instruments" DROP CONSTRAINT "official_instruments_issuerOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "official_instruments" DROP CONSTRAINT "official_instruments_masterAdministrativeFileId_fkey";

-- AlterTable
ALTER TABLE "case_communications" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "case_milestones" ALTER COLUMN "reachedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "case_public_status_projections" ALTER COLUMN "publicStatusLabel" DROP NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "government_decisions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "official_instruments" ALTER COLUMN "scope" DROP DEFAULT;

-- CreateTable
CREATE TABLE "compliance_matters" (
    "id" UUID NOT NULL,
    "complianceMatterNumber" TEXT NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "caseId" UUID,
    "officialInstrumentId" UUID NOT NULL,
    "holderIdentityId" UUID,
    "holderOrganizationId" UUID,
    "responsibleInstitutionId" UUID NOT NULL,
    "responsibleDepartmentId" UUID NOT NULL,
    "status" "ComplianceMatterStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_matters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "continuing_obligations" (
    "id" UUID NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "sourceType" "ContinuingObligationSourceType" NOT NULL,
    "sourceDecisionConditionId" UUID,
    "sourceInstrumentVersionId" UUID NOT NULL,
    "governingSourceId" UUID,
    "obligationCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "approvedConditionText" TEXT,
    "approvedConditionTextHash" TEXT,
    "responsibleParty" TEXT NOT NULL,
    "obligationType" "ContinuingObligationType" NOT NULL,
    "frequency" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "recurrenceConfiguration" JSONB,
    "evidenceStandard" TEXT,
    "reviewingOfficeId" UUID,
    "functionAuthorityRecordId" UUID,
    "noncomplianceConsequenceReference" TEXT,
    "exceptionProcedureReference" TEXT,
    "status" "ContinuingObligationStatus" NOT NULL DEFAULT 'NOT_YET_DUE',
    "supersededByObligationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "continuing_obligations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obligation_schedules" (
    "id" UUID NOT NULL,
    "continuingObligationId" UUID NOT NULL,
    "occurrenceNumber" INTEGER NOT NULL,
    "scheduledDueDate" TIMESTAMP(3) NOT NULL,
    "lawfulDueDate" TIMESTAMP(3) NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    "status" "ObligationScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obligation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obligation_status_history" (
    "id" UUID NOT NULL,
    "continuingObligationId" UUID NOT NULL,
    "fromStatus" "ContinuingObligationStatus",
    "toStatus" "ContinuingObligationStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByIdentityId" UUID,
    "actorClassification" "ObligationStatusChangeActor" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "obligation_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_route_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "RedressRouteCategory" NOT NULL,
    "institutionId" UUID,
    "jurisdictionId" UUID,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redress_route_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_route_versions" (
    "id" UUID NOT NULL,
    "routeDefinitionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "RedressRouteVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "filingDeadlineDays" INTEGER,
    "permitsDeadlineExtension" BOOLEAN NOT NULL DEFAULT false,
    "requiresIndependence" BOOLEAN NOT NULL DEFAULT false,
    "automaticStayOnFiling" BOOLEAN NOT NULL DEFAULT false,
    "permitsSubstantiveChange" BOOLEAN NOT NULL DEFAULT true,
    "permitsNonSubstantiveCorrection" BOOLEAN NOT NULL DEFAULT false,
    "reviewFunctionAuthorityRecordId" UUID,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redress_route_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_route_eligible_matters" (
    "id" UUID NOT NULL,
    "routeVersionId" UUID NOT NULL,
    "matterTypeCode" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_route_eligible_matters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_route_grounds" (
    "id" UUID NOT NULL,
    "routeVersionId" UUID NOT NULL,
    "groundCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_route_grounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_route_remedy_definitions" (
    "id" UUID NOT NULL,
    "routeVersionId" UUID NOT NULL,
    "remedyCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isSubstantive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_route_remedy_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_matters" (
    "id" UUID NOT NULL,
    "matterNumber" TEXT NOT NULL,
    "status" "RedressMatterStatus" NOT NULL DEFAULT 'OPEN',
    "routeVersionId" UUID,
    "caseId" UUID,
    "masterAdministrativeFileId" UUID,
    "challengedDecisionId" UUID,
    "challengedInstrumentId" UUID,
    "filerIdentityId" UUID NOT NULL,
    "representativeAuthorityId" UUID,
    "safeHaltReason" "RedressSafeHaltReason",
    "safeHaltAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redress_matters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_filings" (
    "id" UUID NOT NULL,
    "filingNumber" TEXT NOT NULL,
    "matterId" UUID NOT NULL,
    "routeVersionId" UUID NOT NULL,
    "status" "RedressFilingStatus" NOT NULL DEFAULT 'DRAFT',
    "filerIdentityId" UUID NOT NULL,
    "representativeAuthorityId" UUID,
    "groundsReference" TEXT,
    "summary" TEXT,
    "requestedRouteCategory" "RedressRouteCategory",
    "classifiedRouteCategory" "RedressRouteCategory",
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redress_filings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_filing_versions" (
    "id" UUID NOT NULL,
    "filingId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "contentReference" TEXT,
    "contentHash" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_filing_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_standing_assessments" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "outcome" "RedressStandingOutcome" NOT NULL DEFAULT 'NOT_ASSESSED',
    "assessedByIdentityId" UUID,
    "assessedByOfficeholderId" UUID,
    "authorityEvaluationRecordId" UUID,
    "explanation" TEXT,
    "assessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_standing_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_timeliness_assessments" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "outcome" "RedressTimelinessOutcome" NOT NULL DEFAULT 'NOT_ASSESSED',
    "filingDeadline" TIMESTAMP(3),
    "actualFilingDate" TIMESTAMP(3),
    "assessedByIdentityId" UUID,
    "assessedByOfficeholderId" UUID,
    "authorityEvaluationRecordId" UUID,
    "explanation" TEXT,
    "assessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_timeliness_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deadline_extension_requests" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "requestedByIdentityId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "outcome" "DeadlineExtensionOutcome" NOT NULL DEFAULT 'PENDING',
    "decidedByIdentityId" UUID,
    "decidedByOfficeholderId" UUID,
    "authorityEvaluationRecordId" UUID,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deadline_extension_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_acknowledgments" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "acknowledgmentReference" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "noticeReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_classifications" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "classificationType" "ComplaintClassificationType" NOT NULL,
    "classifiedByIdentityId" UUID,
    "classifiedByOfficeholderId" UUID,
    "isAppealMislabel" BOOLEAN NOT NULL DEFAULT false,
    "explanation" TEXT,
    "classifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_investigations" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "classificationId" UUID NOT NULL,
    "status" "ComplaintInvestigationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "investigatorIdentityId" UUID,
    "investigatorOfficeholderId" UUID,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaint_investigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_findings" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "findingSummary" TEXT NOT NULL,
    "isSubstantive" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_responses" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "responseSummary" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_corrective_actions" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "actionSummary" TEXT NOT NULL,
    "isServiceRemedy" BOOLEAN NOT NULL DEFAULT true,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_corrective_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_closures" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "reason" "ComplaintClosureReason" NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "administrative_correction_matters" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "originalNoticeReference" TEXT NOT NULL,
    "correctedNoticeReference" TEXT,
    "errorDescription" TEXT NOT NULL,
    "isNonSubstantive" BOOLEAN NOT NULL DEFAULT true,
    "altersSubstantiveOutcome" BOOLEAN NOT NULL DEFAULT false,
    "altersMaterialReasons" BOOLEAN NOT NULL DEFAULT false,
    "removesReviewRights" BOOLEAN NOT NULL DEFAULT false,
    "originalPreserved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "administrative_correction_matters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clarification_requests" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "questionSummary" TEXT NOT NULL,
    "altersSubstantiveDecision" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clarification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clarification_responses" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "responseSummary" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clarification_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_challenges" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "challengedOutputReference" TEXT NOT NULL,
    "challengedInputReference" TEXT,
    "explanationDisclosed" BOOLEAN NOT NULL DEFAULT false,
    "faultyOutputExcluded" BOOLEAN NOT NULL DEFAULT false,
    "reprocessingOrdered" BOOLEAN NOT NULL DEFAULT false,
    "aiAdjudicated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_explanation_records" (
    "id" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "approvedUseSummary" TEXT NOT NULL,
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "confidentialityLevel" TEXT NOT NULL DEFAULT 'STANDARD',
    "disclosedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_explanation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_challenge_dispositions" (
    "id" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "outcome" "AutomationChallengeDispositionOutcome" NOT NULL DEFAULT 'PENDING',
    "decidedByIdentityId" UUID,
    "decidedByOfficeholderId" UUID,
    "authorityEvaluationRecordId" UUID,
    "explanation" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_challenge_dispositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_assignments" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "reviewerOfficeholderId" UUID NOT NULL,
    "appointmentId" UUID,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedReason" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviewer_independence_assessments" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "outcome" "ReviewIndependenceOutcome" NOT NULL DEFAULT 'NOT_ASSESSED',
    "originalDecisionMakerBlocked" BOOLEAN NOT NULL DEFAULT false,
    "priorInvolvementBlocked" BOOLEAN NOT NULL DEFAULT false,
    "conflictBlocked" BOOLEAN NOT NULL DEFAULT false,
    "assessedByIdentityId" UUID,
    "explanation" TEXT,
    "assessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviewer_independence_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_authority_assessments" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "outcome" "ReviewAuthorityOutcome" NOT NULL DEFAULT 'NOT_ASSESSED',
    "functionAuthorityRecordId" UUID,
    "authorityEvaluationRecordId" UUID,
    "jurisdictionBlocked" BOOLEAN NOT NULL DEFAULT false,
    "appointmentExpired" BOOLEAN NOT NULL DEFAULT false,
    "delegationRevoked" BOOLEAN NOT NULL DEFAULT false,
    "explanation" TEXT,
    "assessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_authority_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_record_snapshots" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "snapshotReference" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "originalDecisionReference" TEXT,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isImmutable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_record_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconsideration_proceedings" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "snapshotId" UUID,
    "newEvidenceSeparated" BOOLEAN NOT NULL DEFAULT true,
    "originalPreserved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconsideration_proceedings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_administrative_reviews" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "reviewType" "RedressReviewType" NOT NULL DEFAULT 'INTERNAL_ADMINISTRATIVE_REVIEW',
    "independenceRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_administrative_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_issues" (
    "id" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "issueSummary" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_submissions" (
    "id" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "submissionReference" TEXT NOT NULL,
    "isLaterEvidence" BOOLEAN NOT NULL DEFAULT false,
    "attributableToIdentityId" UUID,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_review_referrals" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "externalAuthorityLabel" TEXT NOT NULL,
    "status" "ExternalReviewReferralStatus" NOT NULL DEFAULT 'PREPARING',
    "transmittedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_review_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_review_packages" (
    "id" UUID NOT NULL,
    "referralId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "packageReference" TEXT NOT NULL,
    "packageHash" TEXT NOT NULL,
    "transmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_review_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_review_determinations" (
    "id" UUID NOT NULL,
    "referralId" UUID NOT NULL,
    "determinationReference" TEXT NOT NULL,
    "authenticity" "ExternalDeterminationAuthenticity" NOT NULL DEFAULT 'UNVERIFIED',
    "receivedAt" TIMESTAMP(3),
    "implementedAt" TIMESTAMP(3),
    "authorityEvaluationRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_review_determinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_decisions" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "decisionNumber" TEXT NOT NULL,
    "outcome" "RedressDecisionOutcome" NOT NULL,
    "status" "RedressDecisionStatus" NOT NULL DEFAULT 'DRAFT',
    "isRecommendation" BOOLEAN NOT NULL DEFAULT false,
    "isFinalDisposition" BOOLEAN NOT NULL DEFAULT false,
    "isImplemented" BOOLEAN NOT NULL DEFAULT false,
    "deciderIdentityId" UUID NOT NULL,
    "deciderOfficeholderId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID,
    "originalDecisionPreserved" BOOLEAN NOT NULL DEFAULT true,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redress_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_findings" (
    "id" UUID NOT NULL,
    "decisionId" UUID NOT NULL,
    "findingSummary" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_reasons" (
    "id" UUID NOT NULL,
    "decisionId" UUID NOT NULL,
    "reasonSummary" TEXT NOT NULL,
    "isMaterial" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_remedies" (
    "id" UUID NOT NULL,
    "decisionId" UUID NOT NULL,
    "remedyDefinitionId" UUID,
    "remedySummary" TEXT NOT NULL,
    "isAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "isSubstantive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_remedies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interim_relief_requests" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "requestedByIdentityId" UUID NOT NULL,
    "outcome" "InterimReliefOutcome" NOT NULL DEFAULT 'PENDING',
    "scopeDescription" TEXT,
    "decidedByIdentityId" UUID,
    "decidedByOfficeholderId" UUID,
    "authorityEvaluationRecordId" UUID,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interim_relief_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_stay_records" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "interimReliefRequestId" UUID,
    "challengedInstrumentId" UUID,
    "stayGranted" BOOLEAN NOT NULL DEFAULT false,
    "isReversal" BOOLEAN NOT NULL DEFAULT false,
    "scopeDescription" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "authorityEvaluationRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_stay_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_implementation_plans" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "decisionId" UUID NOT NULL,
    "status" "RedressImplementationStatus" NOT NULL DEFAULT 'PENDING',
    "markedImplementedAt" TIMESTAMP(3),
    "failureVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redress_implementation_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_implementation_actions" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionSummary" TEXT NOT NULL,
    "status" "RedressImplementationStatus" NOT NULL DEFAULT 'PENDING',
    "phase8Controlled" BOOLEAN NOT NULL DEFAULT true,
    "phase9Controlled" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redress_implementation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_implementation_verifications" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "verifiedByIdentityId" UUID,
    "verificationSummary" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_implementation_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redress_notices" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "noticeType" "RedressNoticeType" NOT NULL,
    "noticeReference" TEXT NOT NULL,
    "recipientIdentityId" UUID,
    "isPrivileged" BOOLEAN NOT NULL DEFAULT false,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compliance_matters_complianceMatterNumber_key" ON "compliance_matters"("complianceMatterNumber");

-- CreateIndex
CREATE INDEX "compliance_matters_masterAdministrativeFileId_idx" ON "compliance_matters"("masterAdministrativeFileId");

-- CreateIndex
CREATE INDEX "compliance_matters_caseId_idx" ON "compliance_matters"("caseId");

-- CreateIndex
CREATE INDEX "compliance_matters_officialInstrumentId_idx" ON "compliance_matters"("officialInstrumentId");

-- CreateIndex
CREATE INDEX "compliance_matters_status_idx" ON "compliance_matters"("status");

-- CreateIndex
CREATE UNIQUE INDEX "continuing_obligations_supersededByObligationId_key" ON "continuing_obligations"("supersededByObligationId");

-- CreateIndex
CREATE INDEX "continuing_obligations_complianceMatterId_idx" ON "continuing_obligations"("complianceMatterId");

-- CreateIndex
CREATE INDEX "continuing_obligations_sourceDecisionConditionId_idx" ON "continuing_obligations"("sourceDecisionConditionId");

-- CreateIndex
CREATE INDEX "continuing_obligations_sourceInstrumentVersionId_idx" ON "continuing_obligations"("sourceInstrumentVersionId");

-- CreateIndex
CREATE INDEX "continuing_obligations_status_idx" ON "continuing_obligations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "continuing_obligations_complianceMatterId_obligationCode_key" ON "continuing_obligations"("complianceMatterId", "obligationCode");

-- CreateIndex
CREATE INDEX "obligation_schedules_continuingObligationId_idx" ON "obligation_schedules"("continuingObligationId");

-- CreateIndex
CREATE INDEX "obligation_schedules_scheduledDueDate_idx" ON "obligation_schedules"("scheduledDueDate");

-- CreateIndex
CREATE INDEX "obligation_schedules_status_idx" ON "obligation_schedules"("status");

-- CreateIndex
CREATE UNIQUE INDEX "obligation_schedules_continuingObligationId_occurrenceNumbe_key" ON "obligation_schedules"("continuingObligationId", "occurrenceNumber");

-- CreateIndex
CREATE INDEX "obligation_status_history_continuingObligationId_changedAt_idx" ON "obligation_status_history"("continuingObligationId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "redress_route_definitions_code_key" ON "redress_route_definitions"("code");

-- CreateIndex
CREATE INDEX "redress_route_definitions_category_idx" ON "redress_route_definitions"("category");

-- CreateIndex
CREATE INDEX "redress_route_definitions_institutionId_idx" ON "redress_route_definitions"("institutionId");

-- CreateIndex
CREATE INDEX "redress_route_versions_routeDefinitionId_status_idx" ON "redress_route_versions"("routeDefinitionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "redress_route_versions_routeDefinitionId_versionNumber_key" ON "redress_route_versions"("routeDefinitionId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "redress_route_eligible_matters_routeVersionId_matterTypeCod_key" ON "redress_route_eligible_matters"("routeVersionId", "matterTypeCode");

-- CreateIndex
CREATE UNIQUE INDEX "redress_route_grounds_routeVersionId_groundCode_key" ON "redress_route_grounds"("routeVersionId", "groundCode");

-- CreateIndex
CREATE UNIQUE INDEX "redress_route_remedy_definitions_routeVersionId_remedyCode_key" ON "redress_route_remedy_definitions"("routeVersionId", "remedyCode");

-- CreateIndex
CREATE UNIQUE INDEX "redress_matters_matterNumber_key" ON "redress_matters"("matterNumber");

-- CreateIndex
CREATE INDEX "redress_matters_status_idx" ON "redress_matters"("status");

-- CreateIndex
CREATE INDEX "redress_matters_caseId_idx" ON "redress_matters"("caseId");

-- CreateIndex
CREATE INDEX "redress_matters_filerIdentityId_idx" ON "redress_matters"("filerIdentityId");

-- CreateIndex
CREATE INDEX "redress_matters_challengedDecisionId_idx" ON "redress_matters"("challengedDecisionId");

-- CreateIndex
CREATE UNIQUE INDEX "redress_filings_filingNumber_key" ON "redress_filings"("filingNumber");

-- CreateIndex
CREATE INDEX "redress_filings_matterId_idx" ON "redress_filings"("matterId");

-- CreateIndex
CREATE INDEX "redress_filings_status_idx" ON "redress_filings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "redress_filing_versions_filingId_versionNumber_key" ON "redress_filing_versions"("filingId", "versionNumber");

-- CreateIndex
CREATE INDEX "redress_standing_assessments_matterId_idx" ON "redress_standing_assessments"("matterId");

-- CreateIndex
CREATE INDEX "redress_timeliness_assessments_matterId_idx" ON "redress_timeliness_assessments"("matterId");

-- CreateIndex
CREATE INDEX "deadline_extension_requests_matterId_idx" ON "deadline_extension_requests"("matterId");

-- CreateIndex
CREATE UNIQUE INDEX "redress_acknowledgments_acknowledgmentReference_key" ON "redress_acknowledgments"("acknowledgmentReference");

-- CreateIndex
CREATE INDEX "redress_acknowledgments_matterId_idx" ON "redress_acknowledgments"("matterId");

-- CreateIndex
CREATE INDEX "complaint_classifications_matterId_idx" ON "complaint_classifications"("matterId");

-- CreateIndex
CREATE INDEX "complaint_investigations_matterId_idx" ON "complaint_investigations"("matterId");

-- CreateIndex
CREATE INDEX "complaint_findings_investigationId_idx" ON "complaint_findings"("investigationId");

-- CreateIndex
CREATE INDEX "complaint_responses_investigationId_idx" ON "complaint_responses"("investigationId");

-- CreateIndex
CREATE INDEX "complaint_corrective_actions_investigationId_idx" ON "complaint_corrective_actions"("investigationId");

-- CreateIndex
CREATE UNIQUE INDEX "complaint_closures_investigationId_key" ON "complaint_closures"("investigationId");

-- CreateIndex
CREATE INDEX "administrative_correction_matters_matterId_idx" ON "administrative_correction_matters"("matterId");

-- CreateIndex
CREATE INDEX "clarification_requests_matterId_idx" ON "clarification_requests"("matterId");

-- CreateIndex
CREATE INDEX "clarification_responses_requestId_idx" ON "clarification_responses"("requestId");

-- CreateIndex
CREATE INDEX "automation_challenges_matterId_idx" ON "automation_challenges"("matterId");

-- CreateIndex
CREATE INDEX "automation_explanation_records_challengeId_idx" ON "automation_explanation_records"("challengeId");

-- CreateIndex
CREATE INDEX "automation_challenge_dispositions_challengeId_idx" ON "automation_challenge_dispositions"("challengeId");

-- CreateIndex
CREATE INDEX "review_assignments_matterId_idx" ON "review_assignments"("matterId");

-- CreateIndex
CREATE UNIQUE INDEX "reviewer_independence_assessments_assignmentId_key" ON "reviewer_independence_assessments"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "review_authority_assessments_assignmentId_key" ON "review_authority_assessments"("assignmentId");

-- CreateIndex
CREATE INDEX "review_record_snapshots_matterId_idx" ON "review_record_snapshots"("matterId");

-- CreateIndex
CREATE INDEX "reconsideration_proceedings_matterId_idx" ON "reconsideration_proceedings"("matterId");

-- CreateIndex
CREATE INDEX "internal_administrative_reviews_matterId_idx" ON "internal_administrative_reviews"("matterId");

-- CreateIndex
CREATE INDEX "review_issues_snapshotId_idx" ON "review_issues"("snapshotId");

-- CreateIndex
CREATE INDEX "review_submissions_snapshotId_idx" ON "review_submissions"("snapshotId");

-- CreateIndex
CREATE INDEX "external_review_referrals_matterId_idx" ON "external_review_referrals"("matterId");

-- CreateIndex
CREATE UNIQUE INDEX "external_review_packages_referralId_versionNumber_key" ON "external_review_packages"("referralId", "versionNumber");

-- CreateIndex
CREATE INDEX "external_review_determinations_referralId_idx" ON "external_review_determinations"("referralId");

-- CreateIndex
CREATE UNIQUE INDEX "redress_decisions_decisionNumber_key" ON "redress_decisions"("decisionNumber");

-- CreateIndex
CREATE INDEX "redress_decisions_matterId_idx" ON "redress_decisions"("matterId");

-- CreateIndex
CREATE INDEX "redress_decisions_status_idx" ON "redress_decisions"("status");

-- CreateIndex
CREATE INDEX "redress_findings_decisionId_idx" ON "redress_findings"("decisionId");

-- CreateIndex
CREATE INDEX "redress_reasons_decisionId_idx" ON "redress_reasons"("decisionId");

-- CreateIndex
CREATE INDEX "redress_remedies_decisionId_idx" ON "redress_remedies"("decisionId");

-- CreateIndex
CREATE INDEX "interim_relief_requests_matterId_idx" ON "interim_relief_requests"("matterId");

-- CreateIndex
CREATE INDEX "review_stay_records_matterId_idx" ON "review_stay_records"("matterId");

-- CreateIndex
CREATE INDEX "redress_implementation_plans_matterId_idx" ON "redress_implementation_plans"("matterId");

-- CreateIndex
CREATE INDEX "redress_implementation_plans_decisionId_idx" ON "redress_implementation_plans"("decisionId");

-- CreateIndex
CREATE INDEX "redress_implementation_actions_planId_idx" ON "redress_implementation_actions"("planId");

-- CreateIndex
CREATE INDEX "redress_implementation_verifications_planId_idx" ON "redress_implementation_verifications"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "redress_notices_noticeReference_key" ON "redress_notices"("noticeReference");

-- CreateIndex
CREATE INDEX "redress_notices_matterId_idx" ON "redress_notices"("matterId");

-- CreateIndex
CREATE INDEX "archival_transfer_items_archivalTransferId_idx" ON "archival_transfer_items"("archivalTransferId");

-- CreateIndex
CREATE INDEX "archival_transfers_status_idx" ON "archival_transfers"("status");

-- CreateIndex
CREATE INDEX "archival_transfers_sourceRepositoryId_idx" ON "archival_transfers"("sourceRepositoryId");

-- CreateIndex
CREATE INDEX "archival_transfers_destinationRepositoryId_idx" ON "archival_transfers"("destinationRepositoryId");

-- CreateIndex
CREATE INDEX "decision_conditions_governmentDecisionId_idx" ON "decision_conditions"("governmentDecisionId");

-- CreateIndex
CREATE INDEX "decision_conditions_conditionType_status_idx" ON "decision_conditions"("conditionType", "status");

-- CreateIndex
CREATE INDEX "instrument_number_reservations_numberingRuleId_status_idx" ON "instrument_number_reservations"("numberingRuleId", "status");

-- CreateIndex
CREATE INDEX "instrument_numbering_rules_institutionId_idx" ON "instrument_numbering_rules"("institutionId");

-- CreateIndex
CREATE INDEX "instrument_template_versions_instrumentTemplateId_idx" ON "instrument_template_versions"("instrumentTemplateId");

-- CreateIndex
CREATE INDEX "instrument_templates_instrumentTypeVersionId_idx" ON "instrument_templates"("instrumentTypeVersionId");

-- CreateIndex
CREATE INDEX "instrument_type_eligible_decision_types_decisionTypeVersion_idx" ON "instrument_type_eligible_decision_types"("decisionTypeVersionId");

-- CreateIndex
CREATE INDEX "instrument_type_versions_instrumentTypeDefinitionId_idx" ON "instrument_type_versions"("instrumentTypeDefinitionId");

-- CreateIndex
CREATE INDEX "instrument_type_versions_issuingInstitutionId_idx" ON "instrument_type_versions"("issuingInstitutionId");

-- CreateIndex
CREATE INDEX "instrument_type_versions_numberingRuleId_idx" ON "instrument_type_versions"("numberingRuleId");

-- CreateIndex
CREATE INDEX "issuance_events_officialInstrumentId_idx" ON "issuance_events"("officialInstrumentId");

-- CreateIndex
CREATE INDEX "issuance_events_governmentDecisionId_idx" ON "issuance_events"("governmentDecisionId");

-- CreateIndex
CREATE INDEX "issuance_events_caseId_idx" ON "issuance_events"("caseId");

-- CreateIndex
CREATE INDEX "issuance_events_status_idx" ON "issuance_events"("status");

-- CreateIndex
CREATE INDEX "issuance_readiness_assessments_governmentDecisionId_idx" ON "issuance_readiness_assessments"("governmentDecisionId");

-- CreateIndex
CREATE INDEX "issuance_readiness_assessments_caseId_idx" ON "issuance_readiness_assessments"("caseId");

-- CreateIndex
CREATE INDEX "issuance_readiness_assessments_officialInstrumentId_idx" ON "issuance_readiness_assessments"("officialInstrumentId");

-- CreateIndex
CREATE INDEX "legal_hold_release_records_legalHoldId_idx" ON "legal_hold_release_records"("legalHoldId");

-- CreateIndex
CREATE INDEX "legal_hold_release_records_releasedAt_idx" ON "legal_hold_release_records"("releasedAt");

-- CreateIndex
CREATE INDEX "legal_hold_targets_targetType_targetReference_idx" ON "legal_hold_targets"("targetType", "targetReference");

-- CreateIndex
CREATE INDEX "legal_hold_targets_legalHoldId_idx" ON "legal_hold_targets"("legalHoldId");

-- CreateIndex
CREATE INDEX "legal_holds_status_idx" ON "legal_holds"("status");

-- CreateIndex
CREATE INDEX "legal_holds_effectiveFrom_idx" ON "legal_holds"("effectiveFrom");

-- CreateIndex
CREATE INDEX "official_instrument_versions_officialInstrumentId_idx" ON "official_instrument_versions"("officialInstrumentId");

-- CreateIndex
CREATE INDEX "official_instrument_versions_documentVersionId_idx" ON "official_instrument_versions"("documentVersionId");

-- CreateIndex
CREATE INDEX "official_instruments_caseId_idx" ON "official_instruments"("caseId");

-- CreateIndex
CREATE INDEX "official_instruments_governmentDecisionId_idx" ON "official_instruments"("governmentDecisionId");

-- CreateIndex
CREATE INDEX "official_instruments_instrumentTypeVersionId_idx" ON "official_instruments"("instrumentTypeVersionId");

-- CreateIndex
CREATE INDEX "official_instruments_status_idx" ON "official_instruments"("status");

-- CreateIndex
CREATE INDEX "preservation_collection_items_preservationCollectionId_idx" ON "preservation_collection_items"("preservationCollectionId");

-- CreateIndex
CREATE INDEX "preservation_collections_status_idx" ON "preservation_collections"("status");

-- CreateIndex
CREATE INDEX "preservation_collections_purpose_idx" ON "preservation_collections"("purpose");

-- CreateIndex
CREATE INDEX "record_disposition_records_dispositionRequestId_idx" ON "record_disposition_records"("dispositionRequestId");

-- CreateIndex
CREATE INDEX "record_disposition_records_dispositionDate_idx" ON "record_disposition_records"("dispositionDate");

-- CreateIndex
CREATE INDEX "record_disposition_requests_targetType_targetReference_idx" ON "record_disposition_requests"("targetType", "targetReference");

-- CreateIndex
CREATE INDEX "record_disposition_requests_status_idx" ON "record_disposition_requests"("status");

-- CreateIndex
CREATE INDEX "record_disposition_requests_retentionScheduleId_idx" ON "record_disposition_requests"("retentionScheduleId");

-- CreateIndex
CREATE INDEX "record_retention_assignments_recordsClassificationId_idx" ON "record_retention_assignments"("recordsClassificationId");

-- CreateIndex
CREATE INDEX "record_retention_assignments_retentionScheduleId_idx" ON "record_retention_assignments"("retentionScheduleId");

-- CreateIndex
CREATE INDEX "record_retention_assignments_targetType_targetReference_idx" ON "record_retention_assignments"("targetType", "targetReference");

-- CreateIndex
CREATE INDEX "records_classifications_governingSourceId_idx" ON "records_classifications"("governingSourceId");

-- CreateIndex
CREATE INDEX "records_classifications_status_idx" ON "records_classifications"("status");

-- CreateIndex
CREATE INDEX "retention_rules_retentionScheduleId_idx" ON "retention_rules"("retentionScheduleId");

-- CreateIndex
CREATE INDEX "retention_schedules_recordsClassificationId_idx" ON "retention_schedules"("recordsClassificationId");

-- CreateIndex
CREATE INDEX "retention_schedules_governingSourceId_idx" ON "retention_schedules"("governingSourceId");

-- CreateIndex
CREATE INDEX "retention_schedules_status_idx" ON "retention_schedules"("status");

-- RenameForeignKey
ALTER TABLE "decision_readiness_assessments" RENAME CONSTRAINT "decision_readiness_assessments_proposedDecisionMakerIdentityId_" TO "decision_readiness_assessments_proposedDecisionMakerIdenti_fkey";

-- RenameForeignKey
ALTER TABLE "decision_readiness_assessments" RENAME CONSTRAINT "decision_readiness_assessments_proposedDecisionMakerOfficeholde" TO "decision_readiness_assessments_proposedDecisionMakerOffice_fkey";

-- RenameForeignKey
ALTER TABLE "evidence_packet_item_exclusions" RENAME CONSTRAINT "evidence_packet_item_exclusions_authorityEvaluationRecordId_fke" TO "evidence_packet_item_exclusions_authorityEvaluationRecordI_fkey";

-- RenameForeignKey
ALTER TABLE "government_communication_documents" RENAME CONSTRAINT "government_communication_documents_governmentCommunicationId_fk" TO "government_communication_documents_governmentCommunication_fkey";

-- RenameForeignKey
ALTER TABLE "government_communication_evidence" RENAME CONSTRAINT "government_communication_evidence_governmentCommunicationId_fke" TO "government_communication_evidence_governmentCommunicationI_fkey";

-- RenameForeignKey
ALTER TABLE "government_communication_records" RENAME CONSTRAINT "government_communication_records_retainedDeterminationForExtern" TO "government_communication_records_retainedDeterminationForE_fkey";

-- RenameForeignKey
ALTER TABLE "instrument_receipt_acknowledgments" RENAME CONSTRAINT "instrument_receipt_acknowledgments_instrumentDeliveryAttemptId_" TO "instrument_receipt_acknowledgments_instrumentDeliveryAttem_fkey";

-- RenameForeignKey
ALTER TABLE "instrument_type_eligible_decision_types" RENAME CONSTRAINT "instrument_type_eligible_decision_types_decisionTypeVersionId_f" TO "instrument_type_eligible_decision_types_decisionTypeVersio_fkey";

-- RenameForeignKey
ALTER TABLE "instrument_type_eligible_decision_types" RENAME CONSTRAINT "instrument_type_eligible_decision_types_instrumentTypeVersionId" TO "instrument_type_eligible_decision_types_instrumentTypeVers_fkey";

-- RenameForeignKey
ALTER TABLE "master_administrative_file_sections" RENAME CONSTRAINT "master_administrative_file_sections_masterAdministrativeFileId_" TO "master_administrative_file_sections_masterAdministrativeFi_fkey";

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_decisionTypeVersionId_fkey" FOREIGN KEY ("decisionTypeVersionId") REFERENCES "decision_type_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_decisionReadinessAssessmentId_fkey" FOREIGN KEY ("decisionReadinessAssessmentId") REFERENCES "decision_readiness_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_evidencePacketVersionId_fkey" FOREIGN KEY ("evidencePacketVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_instrumentTypeVersionId_fkey" FOREIGN KEY ("instrumentTypeVersionId") REFERENCES "instrument_type_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_issuerOfficeholderId_fkey" FOREIGN KEY ("issuerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_instrument_versions" ADD CONSTRAINT "official_instrument_versions_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "instrument_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_instrument_versions" ADD CONSTRAINT "official_instrument_versions_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_holderIdentityId_fkey" FOREIGN KEY ("holderIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_holderOrganizationId_fkey" FOREIGN KEY ("holderOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_responsibleInstitutionId_fkey" FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_sourceDecisionConditionId_fkey" FOREIGN KEY ("sourceDecisionConditionId") REFERENCES "decision_conditions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_sourceInstrumentVersionId_fkey" FOREIGN KEY ("sourceInstrumentVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_reviewingOfficeId_fkey" FOREIGN KEY ("reviewingOfficeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_supersededByObligationId_fkey" FOREIGN KEY ("supersededByObligationId") REFERENCES "continuing_obligations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obligation_schedules" ADD CONSTRAINT "obligation_schedules_continuingObligationId_fkey" FOREIGN KEY ("continuingObligationId") REFERENCES "continuing_obligations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obligation_status_history" ADD CONSTRAINT "obligation_status_history_continuingObligationId_fkey" FOREIGN KEY ("continuingObligationId") REFERENCES "continuing_obligations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obligation_status_history" ADD CONSTRAINT "obligation_status_history_changedByIdentityId_fkey" FOREIGN KEY ("changedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_route_definitions" ADD CONSTRAINT "redress_route_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_route_definitions" ADD CONSTRAINT "redress_route_definitions_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_route_versions" ADD CONSTRAINT "redress_route_versions_routeDefinitionId_fkey" FOREIGN KEY ("routeDefinitionId") REFERENCES "redress_route_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_route_versions" ADD CONSTRAINT "redress_route_versions_reviewFunctionAuthorityRecordId_fkey" FOREIGN KEY ("reviewFunctionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_route_eligible_matters" ADD CONSTRAINT "redress_route_eligible_matters_routeVersionId_fkey" FOREIGN KEY ("routeVersionId") REFERENCES "redress_route_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_route_grounds" ADD CONSTRAINT "redress_route_grounds_routeVersionId_fkey" FOREIGN KEY ("routeVersionId") REFERENCES "redress_route_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_route_remedy_definitions" ADD CONSTRAINT "redress_route_remedy_definitions_routeVersionId_fkey" FOREIGN KEY ("routeVersionId") REFERENCES "redress_route_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_matters" ADD CONSTRAINT "redress_matters_routeVersionId_fkey" FOREIGN KEY ("routeVersionId") REFERENCES "redress_route_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_matters" ADD CONSTRAINT "redress_matters_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_matters" ADD CONSTRAINT "redress_matters_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_matters" ADD CONSTRAINT "redress_matters_challengedDecisionId_fkey" FOREIGN KEY ("challengedDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_matters" ADD CONSTRAINT "redress_matters_challengedInstrumentId_fkey" FOREIGN KEY ("challengedInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_matters" ADD CONSTRAINT "redress_matters_filerIdentityId_fkey" FOREIGN KEY ("filerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_matters" ADD CONSTRAINT "redress_matters_representativeAuthorityId_fkey" FOREIGN KEY ("representativeAuthorityId") REFERENCES "representative_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_filings" ADD CONSTRAINT "redress_filings_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_filings" ADD CONSTRAINT "redress_filings_routeVersionId_fkey" FOREIGN KEY ("routeVersionId") REFERENCES "redress_route_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_filings" ADD CONSTRAINT "redress_filings_filerIdentityId_fkey" FOREIGN KEY ("filerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_filings" ADD CONSTRAINT "redress_filings_representativeAuthorityId_fkey" FOREIGN KEY ("representativeAuthorityId") REFERENCES "representative_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_filing_versions" ADD CONSTRAINT "redress_filing_versions_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "redress_filings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_standing_assessments" ADD CONSTRAINT "redress_standing_assessments_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_standing_assessments" ADD CONSTRAINT "redress_standing_assessments_assessedByIdentityId_fkey" FOREIGN KEY ("assessedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_standing_assessments" ADD CONSTRAINT "redress_standing_assessments_assessedByOfficeholderId_fkey" FOREIGN KEY ("assessedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_standing_assessments" ADD CONSTRAINT "redress_standing_assessments_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_timeliness_assessments" ADD CONSTRAINT "redress_timeliness_assessments_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_timeliness_assessments" ADD CONSTRAINT "redress_timeliness_assessments_assessedByIdentityId_fkey" FOREIGN KEY ("assessedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_timeliness_assessments" ADD CONSTRAINT "redress_timeliness_assessments_assessedByOfficeholderId_fkey" FOREIGN KEY ("assessedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_timeliness_assessments" ADD CONSTRAINT "redress_timeliness_assessments_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadline_extension_requests" ADD CONSTRAINT "deadline_extension_requests_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadline_extension_requests" ADD CONSTRAINT "deadline_extension_requests_requestedByIdentityId_fkey" FOREIGN KEY ("requestedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadline_extension_requests" ADD CONSTRAINT "deadline_extension_requests_decidedByIdentityId_fkey" FOREIGN KEY ("decidedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadline_extension_requests" ADD CONSTRAINT "deadline_extension_requests_decidedByOfficeholderId_fkey" FOREIGN KEY ("decidedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadline_extension_requests" ADD CONSTRAINT "deadline_extension_requests_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_acknowledgments" ADD CONSTRAINT "redress_acknowledgments_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_classifications" ADD CONSTRAINT "complaint_classifications_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_classifications" ADD CONSTRAINT "complaint_classifications_classifiedByIdentityId_fkey" FOREIGN KEY ("classifiedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_classifications" ADD CONSTRAINT "complaint_classifications_classifiedByOfficeholderId_fkey" FOREIGN KEY ("classifiedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_investigations" ADD CONSTRAINT "complaint_investigations_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_investigations" ADD CONSTRAINT "complaint_investigations_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "complaint_classifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_investigations" ADD CONSTRAINT "complaint_investigations_investigatorIdentityId_fkey" FOREIGN KEY ("investigatorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_investigations" ADD CONSTRAINT "complaint_investigations_investigatorOfficeholderId_fkey" FOREIGN KEY ("investigatorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_findings" ADD CONSTRAINT "complaint_findings_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "complaint_investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_responses" ADD CONSTRAINT "complaint_responses_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "complaint_investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_corrective_actions" ADD CONSTRAINT "complaint_corrective_actions_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "complaint_investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_closures" ADD CONSTRAINT "complaint_closures_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "complaint_investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administrative_correction_matters" ADD CONSTRAINT "administrative_correction_matters_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarification_requests" ADD CONSTRAINT "clarification_requests_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarification_responses" ADD CONSTRAINT "clarification_responses_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "clarification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_challenges" ADD CONSTRAINT "automation_challenges_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_explanation_records" ADD CONSTRAINT "automation_explanation_records_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "automation_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_challenge_dispositions" ADD CONSTRAINT "automation_challenge_dispositions_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "automation_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_challenge_dispositions" ADD CONSTRAINT "automation_challenge_dispositions_decidedByIdentityId_fkey" FOREIGN KEY ("decidedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_challenge_dispositions" ADD CONSTRAINT "automation_challenge_dispositions_decidedByOfficeholderId_fkey" FOREIGN KEY ("decidedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_challenge_dispositions" ADD CONSTRAINT "automation_challenge_dispositions_authorityEvaluationRecor_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_independence_assessments" ADD CONSTRAINT "reviewer_independence_assessments_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "review_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_independence_assessments" ADD CONSTRAINT "reviewer_independence_assessments_assessedByIdentityId_fkey" FOREIGN KEY ("assessedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_authority_assessments" ADD CONSTRAINT "review_authority_assessments_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "review_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_authority_assessments" ADD CONSTRAINT "review_authority_assessments_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_authority_assessments" ADD CONSTRAINT "review_authority_assessments_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_record_snapshots" ADD CONSTRAINT "review_record_snapshots_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconsideration_proceedings" ADD CONSTRAINT "reconsideration_proceedings_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_administrative_reviews" ADD CONSTRAINT "internal_administrative_reviews_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_issues" ADD CONSTRAINT "review_issues_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "review_record_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "review_record_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_attributableToIdentityId_fkey" FOREIGN KEY ("attributableToIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_review_referrals" ADD CONSTRAINT "external_review_referrals_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_review_packages" ADD CONSTRAINT "external_review_packages_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "external_review_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_review_determinations" ADD CONSTRAINT "external_review_determinations_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "external_review_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_review_determinations" ADD CONSTRAINT "external_review_determinations_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_decisions" ADD CONSTRAINT "redress_decisions_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_decisions" ADD CONSTRAINT "redress_decisions_deciderIdentityId_fkey" FOREIGN KEY ("deciderIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_decisions" ADD CONSTRAINT "redress_decisions_deciderOfficeholderId_fkey" FOREIGN KEY ("deciderOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_decisions" ADD CONSTRAINT "redress_decisions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_findings" ADD CONSTRAINT "redress_findings_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "redress_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_reasons" ADD CONSTRAINT "redress_reasons_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "redress_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_remedies" ADD CONSTRAINT "redress_remedies_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "redress_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_remedies" ADD CONSTRAINT "redress_remedies_remedyDefinitionId_fkey" FOREIGN KEY ("remedyDefinitionId") REFERENCES "redress_route_remedy_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_relief_requests" ADD CONSTRAINT "interim_relief_requests_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_relief_requests" ADD CONSTRAINT "interim_relief_requests_requestedByIdentityId_fkey" FOREIGN KEY ("requestedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_relief_requests" ADD CONSTRAINT "interim_relief_requests_decidedByIdentityId_fkey" FOREIGN KEY ("decidedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_relief_requests" ADD CONSTRAINT "interim_relief_requests_decidedByOfficeholderId_fkey" FOREIGN KEY ("decidedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_relief_requests" ADD CONSTRAINT "interim_relief_requests_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_stay_records" ADD CONSTRAINT "review_stay_records_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_stay_records" ADD CONSTRAINT "review_stay_records_interimReliefRequestId_fkey" FOREIGN KEY ("interimReliefRequestId") REFERENCES "interim_relief_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_stay_records" ADD CONSTRAINT "review_stay_records_challengedInstrumentId_fkey" FOREIGN KEY ("challengedInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_stay_records" ADD CONSTRAINT "review_stay_records_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_implementation_plans" ADD CONSTRAINT "redress_implementation_plans_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_implementation_plans" ADD CONSTRAINT "redress_implementation_plans_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "redress_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_implementation_actions" ADD CONSTRAINT "redress_implementation_actions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "redress_implementation_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_implementation_verifications" ADD CONSTRAINT "redress_implementation_verifications_planId_fkey" FOREIGN KEY ("planId") REFERENCES "redress_implementation_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_implementation_verifications" ADD CONSTRAINT "redress_implementation_verifications_verifiedByIdentityId_fkey" FOREIGN KEY ("verifiedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_notices" ADD CONSTRAINT "redress_notices_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redress_notices" ADD CONSTRAINT "redress_notices_recipientIdentityId_fkey" FOREIGN KEY ("recipientIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PacketItemAcceptances" ADD CONSTRAINT "_PacketItemAcceptances_A_fkey" FOREIGN KEY ("A") REFERENCES "evidence_packet_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PacketItemAcceptances" ADD CONSTRAINT "_PacketItemAcceptances_B_fkey" FOREIGN KEY ("B") REFERENCES "evidence_purpose_acceptances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "archival_transfer_items_archivalTransferId_targetType_targetRef" RENAME TO "archival_transfer_items_archivalTransferId_targetType_targe_key";

-- RenameIndex
ALTER INDEX "departmental_review_evidence_departmentalReviewId_evidenceRecor" RENAME TO "departmental_review_evidence_departmentalReviewId_evidenceR_key";

-- RenameIndex
ALTER INDEX "departmental_review_records_caseId_departmentId_reviewVersion_k" RENAME TO "departmental_review_records_caseId_departmentId_reviewVersi_key";

-- RenameIndex
ALTER INDEX "document_associations_documentVersionId_targetType_targetId_ass" RENAME TO "document_associations_documentVersionId_targetType_targetId_key";

-- RenameIndex
ALTER INDEX "evidence_quality_assessments_evidenceId_criterion_assessmentSou" RENAME TO "evidence_quality_assessments_evidenceId_criterion_assessmen_key";

-- RenameIndex
ALTER INDEX "government_communication_documents_governmentCommunicationId_do" RENAME TO "government_communication_documents_governmentCommunicationI_key";

-- RenameIndex
ALTER INDEX "government_communication_evidence_governmentCommunicationId_evi" RENAME TO "government_communication_evidence_governmentCommunicationId_key";

-- RenameIndex
ALTER INDEX "instrument_delivery_attempts_instrumentDeliveryId_attemptNumber" RENAME TO "instrument_delivery_attempts_instrumentDeliveryId_attemptNu_key";

-- RenameIndex
ALTER INDEX "instrument_lifecycle_decision_links_lifecycleEventId_governme_k" RENAME TO "instrument_lifecycle_decision_links_lifecycleEventId_govern_key";

-- RenameIndex
ALTER INDEX "instrument_number_reservations_numberingRuleId_reservedNumber_k" RENAME TO "instrument_number_reservations_numberingRuleId_reservedNumb_key";

-- RenameIndex
ALTER INDEX "instrument_template_versions_instrumentTemplateId_versionNumber" RENAME TO "instrument_template_versions_instrumentTemplateId_versionNu_key";

-- RenameIndex
ALTER INDEX "instrument_type_eligible_decision_types_instrumentTypeVersionId" RENAME TO "instrument_type_eligible_decision_types_instrumentTypeVersi_key";

-- RenameIndex
ALTER INDEX "instrument_type_versions_instrumentTypeDefinitionId_versionNumb" RENAME TO "instrument_type_versions_instrumentTypeDefinitionId_version_key";

-- RenameIndex
ALTER INDEX "official_instrument_versions_officialInstrumentId_versionNumber" RENAME TO "official_instrument_versions_officialInstrumentId_versionNu_key";

-- RenameIndex
ALTER INDEX "preservation_collection_items_preservationCollectionId_targetTy" RENAME TO "preservation_collection_items_preservationCollectionId_targ_key";

-- RenameIndex
ALTER INDEX "professional_review_evidence_professionalReviewId_evidenceRecor" RENAME TO "professional_review_evidence_professionalReviewId_evidenceR_key";

-- RenameIndex
ALTER INDEX "record_retention_assignments_targetType_targetReference_retenti" RENAME TO "record_retention_assignments_targetType_targetReference_ret_key";

