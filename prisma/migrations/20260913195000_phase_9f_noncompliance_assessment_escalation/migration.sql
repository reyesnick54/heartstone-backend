-- Phase 9F: Noncompliance Assessment, Escalation and Enforcement Referral

CREATE TYPE "ComplianceAssessmentStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'SUPERSEDED');
CREATE TYPE "ComplianceRecommendedNextStep" AS ENUM ('MONITOR', 'ESCALATE', 'FINDING_REVIEW', 'REFERRAL_REVIEW', 'PROTECTIVE_ACTION_REVIEW', 'NO_ACTION');
CREATE TYPE "NoncomplianceFindingStatus" AS ENUM ('DRAFT', 'PROPOSED', 'CONFIRMED', 'DISPUTED', 'WITHDRAWN', 'SUPERSEDED');
CREATE TYPE "NoncomplianceSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "NoncomplianceRepetition" AS ENUM ('FIRST_OCCURRENCE', 'REPEAT', 'PATTERN');
CREATE TYPE "NoncomplianceMateriality" AS ENUM ('IMMATERIAL', 'MATERIAL', 'SIGNIFICANT');
CREATE TYPE "ComplianceEscalationType" AS ENUM (
  'INTERNAL_SUPERVISORY',
  'DEPARTMENT_HEAD',
  'ONE_STOP_ADMINISTRATION',
  'MANAGEMENT_COMMITTEE',
  'PROFESSIONAL_REFERRAL',
  'GOVERNMENT_REFERRAL',
  'EMERGENCY_REVIEW',
  'PHASE_8_SUSPENSION_REVIEW',
  'PHASE_8_REVOCATION_REVIEW'
);
CREATE TYPE "ComplianceEscalationStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
CREATE TYPE "EnforcementReferralStatus" AS ENUM ('DRAFT', 'PENDING_SEND', 'SENT', 'ACKNOWLEDGED', 'RESPONDED', 'CLOSED', 'WITHDRAWN');
CREATE TYPE "RetainedEnforcementAuthorityClass" AS ENUM ('CRIMINAL', 'NATIONAL_REGULATORY', 'BORDER_CUSTOMS', 'JUDICIAL', 'OTHER_RETAINED');
CREATE TYPE "ProtectiveActionRecommendationType" AS ENUM (
  'ENHANCED_MONITORING',
  'REINSPECTION',
  'CONDITION_REVIEW',
  'TEMPORARY_OPERATIONAL_RESTRICTION_REVIEW',
  'SUSPENSION_REVIEW',
  'REVOCATION_REVIEW',
  'GOVERNMENT_REFERRAL',
  'EMERGENCY_REVIEW'
);
CREATE TYPE "ProtectiveActionRecommendationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');
CREATE TYPE "EmergencyInterimActionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVIEWED', 'SUPERSEDED');

CREATE TABLE "compliance_assessments" (
  "id" UUID NOT NULL,
  "assessmentNumber" TEXT NOT NULL,
  "caseId" UUID NOT NULL,
  "assessmentStandard" TEXT NOT NULL,
  "reviewerIdentityId" UUID NOT NULL,
  "reviewerOfficeholderId" UUID,
  "functionAuthorityRecordId" UUID,
  "evidencePacketId" UUID,
  "obligationsReviewed" JSONB NOT NULL DEFAULT '[]',
  "submissionsReviewed" JSONB NOT NULL DEFAULT '[]',
  "verifiedEvidenceReviewed" JSONB NOT NULL DEFAULT '[]',
  "inspectionFindingsReviewed" JSONB NOT NULL DEFAULT '[]',
  "correctiveActionHistoryReviewed" JSONB NOT NULL DEFAULT '[]',
  "incidentsReviewed" JSONB NOT NULL DEFAULT '[]',
  "professionalFindingsReviewed" JSONB NOT NULL DEFAULT '[]',
  "governmentInputsReviewed" JSONB NOT NULL DEFAULT '[]',
  "instrumentStatusReviewed" JSONB NOT NULL DEFAULT '[]',
  "priorComplianceHistoryReviewed" JSONB NOT NULL DEFAULT '[]',
  "findings" TEXT,
  "uncertainties" TEXT,
  "status" "ComplianceAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
  "recommendedNextStep" "ComplianceRecommendedNextStep",
  "authorityEvaluationRecordId" UUID,
  "aiRiskFlags" JSONB NOT NULL DEFAULT '[]',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "compliance_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "noncompliance_findings" (
  "id" UUID NOT NULL,
  "findingNumber" TEXT NOT NULL,
  "caseId" UUID NOT NULL,
  "complianceAssessmentId" UUID,
  "requirementSource" TEXT NOT NULL,
  "facts" TEXT NOT NULL,
  "evidencePacketId" UUID,
  "responsibleSubjectType" TEXT NOT NULL,
  "responsibleSubjectReference" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "severity" "NoncomplianceSeverity" NOT NULL,
  "repetition" "NoncomplianceRepetition" NOT NULL DEFAULT 'FIRST_OCCURRENCE',
  "materiality" "NoncomplianceMateriality" NOT NULL,
  "status" "NoncomplianceFindingStatus" NOT NULL DEFAULT 'DRAFT',
  "reasons" TEXT,
  "reviewRights" TEXT,
  "isAiProposed" BOOLEAN NOT NULL DEFAULT false,
  "confirmedByIdentityId" UUID,
  "confirmedByOfficeholderId" UUID,
  "confirmedAt" TIMESTAMP(3),
  "functionAuthorityRecordId" UUID,
  "authorityEvaluationRecordId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "noncompliance_findings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_escalations" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "complianceAssessmentId" UUID,
  "noncomplianceFindingId" UUID,
  "escalationType" "ComplianceEscalationType" NOT NULL,
  "status" "ComplianceEscalationStatus" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "escalatedByIdentityId" UUID NOT NULL,
  "escalatedByOfficeholderId" UUID,
  "escalatedToReference" TEXT,
  "authorityEvaluationRecordId" UUID,
  "phase8InstrumentId" UUID,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "compliance_escalations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enforcement_referrals" (
  "id" UUID NOT NULL,
  "referralNumber" TEXT NOT NULL,
  "caseId" UUID NOT NULL,
  "matter" TEXT NOT NULL,
  "competentAuthority" TEXT NOT NULL,
  "externalAuthorityId" UUID,
  "authorityPurpose" TEXT NOT NULL,
  "facts" TEXT NOT NULL,
  "evidencePacketId" UUID,
  "questionsRequest" TEXT,
  "securityClassification" TEXT,
  "retainedAuthorityClass" "RetainedEnforcementAuthorityClass",
  "retainsNationalAuthority" BOOLEAN NOT NULL DEFAULT false,
  "status" "EnforcementReferralStatus" NOT NULL DEFAULT 'DRAFT',
  "sentAt" TIMESTAMP(3),
  "acknowledgment" JSONB,
  "response" TEXT,
  "outcomeReference" TEXT,
  "referredByIdentityId" UUID NOT NULL,
  "referredByOfficeholderId" UUID,
  "authorityEvaluationRecordId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "enforcement_referrals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "protective_action_recommendations" (
  "id" UUID NOT NULL,
  "recommendationNumber" TEXT NOT NULL,
  "caseId" UUID NOT NULL,
  "complianceAssessmentId" UUID,
  "noncomplianceFindingId" UUID,
  "recommendationType" "ProtectiveActionRecommendationType" NOT NULL,
  "status" "ProtectiveActionRecommendationStatus" NOT NULL DEFAULT 'DRAFT',
  "rationale" TEXT NOT NULL,
  "recommendedByIdentityId" UUID NOT NULL,
  "recommendedByOfficeholderId" UUID,
  "authorityEvaluationRecordId" UUID,
  "phase8InstrumentId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "protective_action_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "emergency_interim_action_records" (
  "id" UUID NOT NULL,
  "recordNumber" TEXT NOT NULL,
  "caseId" UUID NOT NULL,
  "functionAuthorityRecordId" UUID NOT NULL,
  "immediateRisk" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "evidenceAvailable" TEXT NOT NULL,
  "actorIdentityId" UUID NOT NULL,
  "actorOfficeholderId" UUID,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3) NOT NULL,
  "noticeRequirement" TEXT,
  "postActionReviewDeadline" TIMESTAMP(3) NOT NULL,
  "relationshipToFinalDecision" TEXT,
  "status" "EmergencyInterimActionStatus" NOT NULL DEFAULT 'ACTIVE',
  "postActionReviewCompletedAt" TIMESTAMP(3),
  "authorityEvaluationRecordId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "emergency_interim_action_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "compliance_assessments_assessmentNumber_key" ON "compliance_assessments"("assessmentNumber");
CREATE INDEX "compliance_assessments_caseId_idx" ON "compliance_assessments"("caseId");
CREATE INDEX "compliance_assessments_status_idx" ON "compliance_assessments"("status");
CREATE INDEX "compliance_assessments_reviewerIdentityId_idx" ON "compliance_assessments"("reviewerIdentityId");

CREATE UNIQUE INDEX "noncompliance_findings_findingNumber_key" ON "noncompliance_findings"("findingNumber");
CREATE INDEX "noncompliance_findings_caseId_idx" ON "noncompliance_findings"("caseId");
CREATE INDEX "noncompliance_findings_complianceAssessmentId_idx" ON "noncompliance_findings"("complianceAssessmentId");
CREATE INDEX "noncompliance_findings_status_idx" ON "noncompliance_findings"("status");

CREATE INDEX "compliance_escalations_caseId_idx" ON "compliance_escalations"("caseId");
CREATE INDEX "compliance_escalations_complianceAssessmentId_idx" ON "compliance_escalations"("complianceAssessmentId");
CREATE INDEX "compliance_escalations_noncomplianceFindingId_idx" ON "compliance_escalations"("noncomplianceFindingId");
CREATE INDEX "compliance_escalations_escalationType_status_idx" ON "compliance_escalations"("escalationType", "status");

CREATE UNIQUE INDEX "enforcement_referrals_referralNumber_key" ON "enforcement_referrals"("referralNumber");
CREATE INDEX "enforcement_referrals_caseId_idx" ON "enforcement_referrals"("caseId");
CREATE INDEX "enforcement_referrals_status_idx" ON "enforcement_referrals"("status");
CREATE INDEX "enforcement_referrals_externalAuthorityId_idx" ON "enforcement_referrals"("externalAuthorityId");

CREATE UNIQUE INDEX "protective_action_recommendations_recommendationNumber_key" ON "protective_action_recommendations"("recommendationNumber");
CREATE INDEX "protective_action_recommendations_caseId_idx" ON "protective_action_recommendations"("caseId");
CREATE INDEX "protective_action_recommendations_complianceAssessmentId_idx" ON "protective_action_recommendations"("complianceAssessmentId");
CREATE INDEX "protective_action_recommendations_noncomplianceFindingId_idx" ON "protective_action_recommendations"("noncomplianceFindingId");
CREATE INDEX "protective_action_recommendations_recommendationType_status_idx" ON "protective_action_recommendations"("recommendationType", "status");

CREATE UNIQUE INDEX "emergency_interim_action_records_recordNumber_key" ON "emergency_interim_action_records"("recordNumber");
CREATE INDEX "emergency_interim_action_records_caseId_idx" ON "emergency_interim_action_records"("caseId");
CREATE INDEX "emergency_interim_action_records_status_idx" ON "emergency_interim_action_records"("status");
CREATE INDEX "emergency_interim_action_records_effectiveUntil_idx" ON "emergency_interim_action_records"("effectiveUntil");

ALTER TABLE "compliance_assessments" ADD CONSTRAINT "compliance_assessments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_assessments" ADD CONSTRAINT "compliance_assessments_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_assessments" ADD CONSTRAINT "compliance_assessments_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_assessments" ADD CONSTRAINT "compliance_assessments_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_assessments" ADD CONSTRAINT "compliance_assessments_evidencePacketId_fkey" FOREIGN KEY ("evidencePacketId") REFERENCES "evidence_packets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_assessments" ADD CONSTRAINT "compliance_assessments_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "noncompliance_findings" ADD CONSTRAINT "noncompliance_findings_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "noncompliance_findings" ADD CONSTRAINT "noncompliance_findings_complianceAssessmentId_fkey" FOREIGN KEY ("complianceAssessmentId") REFERENCES "compliance_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "noncompliance_findings" ADD CONSTRAINT "noncompliance_findings_evidencePacketId_fkey" FOREIGN KEY ("evidencePacketId") REFERENCES "evidence_packets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "noncompliance_findings" ADD CONSTRAINT "noncompliance_findings_confirmedByIdentityId_fkey" FOREIGN KEY ("confirmedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "noncompliance_findings" ADD CONSTRAINT "noncompliance_findings_confirmedByOfficeholderId_fkey" FOREIGN KEY ("confirmedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "noncompliance_findings" ADD CONSTRAINT "noncompliance_findings_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "noncompliance_findings" ADD CONSTRAINT "noncompliance_findings_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "compliance_escalations" ADD CONSTRAINT "compliance_escalations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_escalations" ADD CONSTRAINT "compliance_escalations_complianceAssessmentId_fkey" FOREIGN KEY ("complianceAssessmentId") REFERENCES "compliance_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_escalations" ADD CONSTRAINT "compliance_escalations_noncomplianceFindingId_fkey" FOREIGN KEY ("noncomplianceFindingId") REFERENCES "noncompliance_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_escalations" ADD CONSTRAINT "compliance_escalations_escalatedByIdentityId_fkey" FOREIGN KEY ("escalatedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_escalations" ADD CONSTRAINT "compliance_escalations_escalatedByOfficeholderId_fkey" FOREIGN KEY ("escalatedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_escalations" ADD CONSTRAINT "compliance_escalations_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_escalations" ADD CONSTRAINT "compliance_escalations_phase8InstrumentId_fkey" FOREIGN KEY ("phase8InstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "enforcement_referrals" ADD CONSTRAINT "enforcement_referrals_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enforcement_referrals" ADD CONSTRAINT "enforcement_referrals_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "enforcement_referrals" ADD CONSTRAINT "enforcement_referrals_evidencePacketId_fkey" FOREIGN KEY ("evidencePacketId") REFERENCES "evidence_packets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "enforcement_referrals" ADD CONSTRAINT "enforcement_referrals_referredByIdentityId_fkey" FOREIGN KEY ("referredByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enforcement_referrals" ADD CONSTRAINT "enforcement_referrals_referredByOfficeholderId_fkey" FOREIGN KEY ("referredByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "enforcement_referrals" ADD CONSTRAINT "enforcement_referrals_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "protective_action_recommendations" ADD CONSTRAINT "protective_action_recommendations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "protective_action_recommendations" ADD CONSTRAINT "protective_action_recommendations_complianceAssessmentId_fkey" FOREIGN KEY ("complianceAssessmentId") REFERENCES "compliance_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "protective_action_recommendations" ADD CONSTRAINT "protective_action_recommendations_noncomplianceFindingId_fkey" FOREIGN KEY ("noncomplianceFindingId") REFERENCES "noncompliance_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "protective_action_recommendations" ADD CONSTRAINT "protective_action_recommendations_recommendedByIdentityId_fkey" FOREIGN KEY ("recommendedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "protective_action_recommendations" ADD CONSTRAINT "protective_action_recommendations_recommendedByOfficeholderId_fkey" FOREIGN KEY ("recommendedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "protective_action_recommendations" ADD CONSTRAINT "protective_action_recommendations_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "protective_action_recommendations" ADD CONSTRAINT "protective_action_recommendations_phase8InstrumentId_fkey" FOREIGN KEY ("phase8InstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "emergency_interim_action_records" ADD CONSTRAINT "emergency_interim_action_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "emergency_interim_action_records" ADD CONSTRAINT "emergency_interim_action_records_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "emergency_interim_action_records" ADD CONSTRAINT "emergency_interim_action_records_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "emergency_interim_action_records" ADD CONSTRAINT "emergency_interim_action_records_actorOfficeholderId_fkey" FOREIGN KEY ("actorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "emergency_interim_action_records" ADD CONSTRAINT "emergency_interim_action_records_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
