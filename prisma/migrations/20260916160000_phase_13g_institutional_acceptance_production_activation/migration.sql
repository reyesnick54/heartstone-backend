-- Phase 13E/13G: Institutional Acceptance Dossier, Residual-Risk Acceptance, Production Activation

CREATE TYPE "public"."FeatureActivationStatus" AS ENUM ('DEPLOYED', 'OPERATIONALLY_AVAILABLE', 'SUSPENDED', 'ROLLED_BACK');
CREATE TYPE "public"."AcceptanceDossierStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "public"."AcceptanceDossierVersionStatus" AS ENUM ('DRAFT', 'SUBMITTED_FOR_FINAL_ACCEPTANCE', 'FROZEN_ACCEPTED', 'SUPERSEDED');
CREATE TYPE "public"."AcceptanceLevel" AS ENUM ('RECEIPT', 'ADMINISTRATIVE_COMPLETENESS', 'DISCOVERY', 'DESIGN', 'PROTOTYPE', 'TEST', 'PILOT', 'TECHNICAL_PRODUCTION', 'OPERATIONAL', 'DEPARTMENTAL', 'WORKFLOW', 'INTEGRATION', 'AI_AGENT', 'ISSUANCE', 'INSTITUTIONAL', 'OPERATIONAL_ACTIVATION', 'REVALIDATION');
CREATE TYPE "public"."AcceptanceReviewClass" AS ENUM ('INSTITUTIONAL', 'OPERATIONAL', 'TECHNICAL', 'SECURITY', 'PRIVACY', 'RECORDS', 'CONTINUITY', 'LEGAL', 'PROFESSIONAL', 'INTEGRATION', 'AI_GOVERNANCE', 'ACCESSIBILITY', 'FINANCIAL', 'OTHER_CONFIGURED');
CREATE TYPE "public"."AcceptanceReviewStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'SATISFACTORY', 'DEFICIENCY_IDENTIFIED', 'REJECTED');
CREATE TYPE "public"."AcceptanceDecisionOutcome" AS ENUM ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED', 'RETURNED_FOR_CORRECTION', 'DEFERRED', 'SUSPENDED', 'SUPERSEDED', 'WITHDRAWN');
CREATE TYPE "public"."AcceptanceConditionStatus" AS ENUM ('OPEN', 'VERIFIED', 'MISSED', 'WAIVED');
CREATE TYPE "public"."AcceptanceDefectSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "public"."AcceptanceDefectStatus" AS ENUM ('OPEN', 'RESOLVED', 'WAIVED', 'DEFERRED');
CREATE TYPE "public"."ResidualRiskCategory" AS ENUM ('TECHNICAL', 'OPERATIONAL', 'SECURITY', 'PRIVACY', 'LEGAL', 'CONTINUITY', 'INTEGRATION', 'WORKFORCE', 'FINANCIAL', 'REPUTATIONAL', 'OTHER');
CREATE TYPE "public"."ResidualRiskLikelihood" AS ENUM ('RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN');
CREATE TYPE "public"."ResidualRiskImpact" AS ENUM ('NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE');
CREATE TYPE "public"."ResidualRiskStatus" AS ENUM ('OPEN', 'ACCEPTED', 'MITIGATED', 'REJECTED', 'DEFERRED', 'EXPIRED');
CREATE TYPE "public"."ResidualRiskDecision" AS ENUM ('ACCEPT', 'ACCEPT_WITH_CONDITIONS', 'MITIGATE_BEFORE_ACTIVATION', 'TRANSFER_OR_SHARE_IF_AUTHORIZED', 'AVOID', 'DEFER', 'REJECT');
CREATE TYPE "public"."ProductionActivationRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'DECIDED', 'WITHDRAWN');
CREATE TYPE "public"."ProductionActivationDecisionOutcome" AS ENUM ('APPROVED', 'APPROVED_WITH_RESTRICTIONS', 'DEFERRED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "public"."ActivationScopeType" AS ENUM ('DEPARTMENT', 'SERVICE', 'USER', 'USER_POPULATION', 'APPLICANT_POPULATION', 'INTEGRATION', 'ENVIRONMENT', 'LOCATION', 'DATE_RANGE', 'FUNCTION');
CREATE TYPE "public"."ActivationCommunicationAudience" AS ENUM ('USERS', 'STAFF', 'SUPPORT', 'PARTNERS', 'GOVERNMENT_INTERFACE');
CREATE TYPE "public"."ActivationAuditEventType" AS ENUM ('REQUEST_SUBMITTED', 'DECISION_RECORDED', 'SCOPE_VALIDATED', 'FEATURE_TRANSITIONED', 'COMMUNICATION_SENT', 'SUSPENSION_TRIGGERED', 'ROLLBACK_INITIATED');

CREATE TABLE "public"."institutional_acceptance_dossiers" (
    "id" UUID NOT NULL,
    "dossierNumber" TEXT NOT NULL,
    "institutionId" UUID NOT NULL,
    "accountableOwnerOfficeholderId" UUID NOT NULL,
    "acceptanceAuthorityFunctionRecordId" UUID NOT NULL,
    "currentVersionId" UUID,
    "status" "public"."AcceptanceDossierStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "institutional_acceptance_dossiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."acceptance_dossier_versions" (
    "id" UUID NOT NULL,
    "dossierId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "public"."AcceptanceDossierVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "subjectSummary" TEXT NOT NULL,
    "scopeDescription" TEXT NOT NULL,
    "exclusions" JSONB NOT NULL DEFAULT '[]',
    "versionConfiguration" JSONB NOT NULL DEFAULT '{}',
    "environment" TEXT NOT NULL,
    "releaseReference" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "authorityBasis" TEXT NOT NULL,
    "accountableOwnerOfficeholderId" UUID NOT NULL,
    "acceptanceAuthorityFunctionRecordId" UUID NOT NULL,
    "requirementsBaseline" JSONB NOT NULL DEFAULT '[]',
    "evidenceIndex" JSONB NOT NULL DEFAULT '[]',
    "sourceCrosswalk" JSONB NOT NULL DEFAULT '{}',
    "assumptions" JSONB NOT NULL DEFAULT '[]',
    "technicalReadiness" JSONB NOT NULL DEFAULT '{}',
    "operationalReadiness" JSONB NOT NULL DEFAULT '{}',
    "workforceReadiness" JSONB NOT NULL DEFAULT '{}',
    "institutionalReadiness" JSONB NOT NULL DEFAULT '{}',
    "continuityReadiness" JSONB NOT NULL DEFAULT '{}',
    "integrationReadiness" JSONB NOT NULL DEFAULT '{}',
    "supportReadiness" JSONB NOT NULL DEFAULT '{}',
    "trainingQualification" JSONB NOT NULL DEFAULT '{}',
    "limitations" JSONB NOT NULL DEFAULT '[]',
    "suspensionTriggers" JSONB NOT NULL DEFAULT '[]',
    "rollbackPlan" JSONB NOT NULL DEFAULT '{}',
    "revalidationDate" TIMESTAMP(3),
    "contentHash" TEXT NOT NULL,
    "submittedForFinalAcceptanceAt" TIMESTAMP(3),
    "frozenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "acceptance_dossier_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."acceptance_subjects" (
    "id" UUID NOT NULL,
    "dossierVersionId" UUID NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectReference" TEXT NOT NULL,
    "subjectLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "acceptance_subjects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."acceptance_requirements" (
    "id" UUID NOT NULL,
    "dossierVersionId" UUID NOT NULL,
    "requirementCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "acceptance_requirements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."acceptance_evidence_links" (
    "id" UUID NOT NULL,
    "dossierVersionId" UUID NOT NULL,
    "evidenceRecordId" UUID,
    "externalReference" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "acceptance_evidence_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."acceptance_test_results" (
    "id" UUID NOT NULL,
    "dossierVersionId" UUID NOT NULL,
    "testReference" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "acceptance_test_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."acceptance_defects" (
    "id" UUID NOT NULL,
    "dossierVersionId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "public"."AcceptanceDefectSeverity" NOT NULL,
    "status" "public"."AcceptanceDefectStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "acceptance_defects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."acceptance_exceptions" (
    "id" UUID NOT NULL,
    "dossierVersionId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "acceptance_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."acceptance_conditions" (
    "id" UUID NOT NULL,
    "dossierVersionId" UUID,
    "acceptanceDecisionId" UUID,
    "residualRiskAcceptanceId" UUID,
    "conditionText" TEXT NOT NULL,
    "ownerOfficeholderId" UUID NOT NULL,
    "deadline" TIMESTAMP(3),
    "verificationMethod" TEXT,
    "effectIfMissed" TEXT,
    "status" "public"."AcceptanceConditionStatus" NOT NULL DEFAULT 'OPEN',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "acceptance_conditions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."acceptance_dependencies" (
    "id" UUID NOT NULL,
    "dossierVersionId" UUID NOT NULL,
    "dependencyType" TEXT NOT NULL,
    "dependencyReference" TEXT NOT NULL,
    "dependencyLabel" TEXT NOT NULL,
    "satisfied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "acceptance_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."acceptance_level_achievements" (
    "id" UUID NOT NULL,
    "dossierVersionId" UUID NOT NULL,
    "acceptanceLevel" "public"."AcceptanceLevel" NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "achievedByIdentityId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID,
    "basisReference" TEXT,
    "notes" TEXT,
    CONSTRAINT "acceptance_level_achievements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."acceptance_reviews" (
    "id" UUID NOT NULL,
    "dossierVersionId" UUID NOT NULL,
    "reviewClass" "public"."AcceptanceReviewClass" NOT NULL,
    "status" "public"."AcceptanceReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerIdentityId" UUID,
    "findings" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "acceptance_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."acceptance_decisions" (
    "id" UUID NOT NULL,
    "dossierVersionId" UUID NOT NULL,
    "outcome" "public"."AcceptanceDecisionOutcome" NOT NULL,
    "acceptanceLevel" "public"."AcceptanceLevel" NOT NULL,
    "decidedByOfficeholderId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "acceptance_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."acceptance_signatures" (
    "id" UUID NOT NULL,
    "acceptanceDecisionId" UUID NOT NULL,
    "signerOfficeholderId" UUID NOT NULL,
    "signatureReference" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "acceptance_signatures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."residual_risks" (
    "id" UUID NOT NULL,
    "dossierVersionId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "category" "public"."ResidualRiskCategory" NOT NULL,
    "affectedCapability" TEXT NOT NULL,
    "likelihood" "public"."ResidualRiskLikelihood" NOT NULL,
    "impact" "public"."ResidualRiskImpact" NOT NULL,
    "controls" JSONB NOT NULL DEFAULT '[]',
    "remainingExposure" TEXT NOT NULL,
    "limitations" JSONB NOT NULL DEFAULT '[]',
    "ownerOfficeholderId" UUID NOT NULL,
    "riskAcceptanceAuthorityFunctionRecordId" UUID NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."ResidualRiskStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "residual_risks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."residual_risk_acceptances" (
    "id" UUID NOT NULL,
    "residualRiskId" UUID NOT NULL,
    "decision" "public"."ResidualRiskDecision" NOT NULL,
    "decidedByOfficeholderId" UUID NOT NULL,
    "decidedByIdentityId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "residual_risk_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."production_activation_requests" (
    "id" UUID NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "dossierId" UUID NOT NULL,
    "dossierVersionId" UUID NOT NULL,
    "acceptedReleaseReference" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "monitoringPlan" JSONB NOT NULL DEFAULT '{}',
    "supportPlan" JSONB NOT NULL DEFAULT '{}',
    "rollbackPlan" JSONB NOT NULL DEFAULT '{}',
    "safeHaltPlan" JSONB NOT NULL DEFAULT '{}',
    "revalidationDate" TIMESTAMP(3),
    "status" "public"."ProductionActivationRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedByIdentityId" UUID,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "production_activation_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."production_activation_decisions" (
    "id" UUID NOT NULL,
    "activationRequestId" UUID NOT NULL,
    "outcome" "public"."ProductionActivationDecisionOutcome" NOT NULL,
    "decidedByOfficeholderId" UUID NOT NULL,
    "decidedByIdentityId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID,
    "freshAuthorityEvaluationRecordId" UUID,
    "securityPrivacyStatus" TEXT NOT NULL,
    "recordsControlsStatus" TEXT NOT NULL,
    "continuityReadinessVerified" BOOLEAN NOT NULL DEFAULT false,
    "workforceQualified" BOOLEAN NOT NULL DEFAULT false,
    "integrationsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "residualRisksAccepted" BOOLEAN NOT NULL DEFAULT false,
    "monitoringConfigured" BOOLEAN NOT NULL DEFAULT false,
    "rollbackCapable" BOOLEAN NOT NULL DEFAULT false,
    "restrictions" JSONB NOT NULL DEFAULT '[]',
    "replaySnapshot" JSONB NOT NULL DEFAULT '{}',
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "production_activation_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."activation_scopes" (
    "id" UUID NOT NULL,
    "activationRequestId" UUID,
    "activationDecisionId" UUID,
    "scopeType" "public"."ActivationScopeType" NOT NULL,
    "scopeReference" TEXT NOT NULL,
    "scopeLabel" TEXT NOT NULL,
    "constraints" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activation_scopes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."activation_communications" (
    "id" UUID NOT NULL,
    "activationDecisionId" UUID NOT NULL,
    "audienceType" "public"."ActivationCommunicationAudience" NOT NULL,
    "communicationReference" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentByIdentityId" UUID NOT NULL,
    "notes" TEXT,
    CONSTRAINT "activation_communications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."activation_audit_records" (
    "id" UUID NOT NULL,
    "eventType" "public"."ActivationAuditEventType" NOT NULL,
    "activationRequestId" UUID,
    "activationDecisionId" UUID,
    "actorIdentityId" UUID NOT NULL,
    "eventSnapshot" JSONB NOT NULL DEFAULT '{}',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activation_audit_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."feature_activations" (
    "id" UUID NOT NULL,
    "featureCode" TEXT NOT NULL,
    "releaseReference" TEXT NOT NULL,
    "institutionId" UUID NOT NULL,
    "environment" TEXT NOT NULL,
    "status" "public"."FeatureActivationStatus" NOT NULL DEFAULT 'DEPLOYED',
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operationallyAvailableAt" TIMESTAMP(3),
    "productionActivationDecisionId" UUID,
    "activationScopeId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "feature_activations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "institutional_acceptance_dossiers_dossierNumber_key" ON "public"."institutional_acceptance_dossiers"("dossierNumber");
CREATE UNIQUE INDEX "institutional_acceptance_dossiers_currentVersionId_key" ON "public"."institutional_acceptance_dossiers"("currentVersionId");
CREATE UNIQUE INDEX "acceptance_dossier_versions_dossierId_versionNumber_key" ON "public"."acceptance_dossier_versions"("dossierId", "versionNumber");
CREATE UNIQUE INDEX "acceptance_level_achievements_dossierVersionId_acceptanceLevel_key" ON "public"."acceptance_level_achievements"("dossierVersionId", "acceptanceLevel");
CREATE UNIQUE INDEX "acceptance_reviews_dossierVersionId_reviewClass_key" ON "public"."acceptance_reviews"("dossierVersionId", "reviewClass");
CREATE UNIQUE INDEX "production_activation_requests_requestNumber_key" ON "public"."production_activation_requests"("requestNumber");
CREATE UNIQUE INDEX "production_activation_decisions_activationRequestId_key" ON "public"."production_activation_decisions"("activationRequestId");
CREATE UNIQUE INDEX "feature_activations_featureCode_releaseReference_environment_institutionId_key" ON "public"."feature_activations"("featureCode", "releaseReference", "environment", "institutionId");

CREATE INDEX "institutional_acceptance_dossiers_institutionId_idx" ON "public"."institutional_acceptance_dossiers"("institutionId");
CREATE INDEX "institutional_acceptance_dossiers_status_idx" ON "public"."institutional_acceptance_dossiers"("status");
CREATE INDEX "acceptance_dossier_versions_dossierId_idx" ON "public"."acceptance_dossier_versions"("dossierId");
CREATE INDEX "acceptance_dossier_versions_status_idx" ON "public"."acceptance_dossier_versions"("status");
CREATE INDEX "acceptance_subjects_dossierVersionId_idx" ON "public"."acceptance_subjects"("dossierVersionId");
CREATE INDEX "acceptance_requirements_dossierVersionId_idx" ON "public"."acceptance_requirements"("dossierVersionId");
CREATE INDEX "acceptance_evidence_links_dossierVersionId_idx" ON "public"."acceptance_evidence_links"("dossierVersionId");
CREATE INDEX "acceptance_evidence_links_evidenceRecordId_idx" ON "public"."acceptance_evidence_links"("evidenceRecordId");
CREATE INDEX "acceptance_test_results_dossierVersionId_idx" ON "public"."acceptance_test_results"("dossierVersionId");
CREATE INDEX "acceptance_defects_dossierVersionId_idx" ON "public"."acceptance_defects"("dossierVersionId");
CREATE INDEX "acceptance_exceptions_dossierVersionId_idx" ON "public"."acceptance_exceptions"("dossierVersionId");
CREATE INDEX "acceptance_conditions_dossierVersionId_idx" ON "public"."acceptance_conditions"("dossierVersionId");
CREATE INDEX "acceptance_conditions_acceptanceDecisionId_idx" ON "public"."acceptance_conditions"("acceptanceDecisionId");
CREATE INDEX "acceptance_conditions_ownerOfficeholderId_idx" ON "public"."acceptance_conditions"("ownerOfficeholderId");
CREATE INDEX "acceptance_conditions_status_idx" ON "public"."acceptance_conditions"("status");
CREATE INDEX "acceptance_dependencies_dossierVersionId_idx" ON "public"."acceptance_dependencies"("dossierVersionId");
CREATE INDEX "acceptance_level_achievements_dossierVersionId_idx" ON "public"."acceptance_level_achievements"("dossierVersionId");
CREATE INDEX "acceptance_level_achievements_acceptanceLevel_idx" ON "public"."acceptance_level_achievements"("acceptanceLevel");
CREATE INDEX "acceptance_reviews_dossierVersionId_idx" ON "public"."acceptance_reviews"("dossierVersionId");
CREATE INDEX "acceptance_reviews_reviewClass_idx" ON "public"."acceptance_reviews"("reviewClass");
CREATE INDEX "acceptance_decisions_dossierVersionId_idx" ON "public"."acceptance_decisions"("dossierVersionId");
CREATE INDEX "acceptance_decisions_outcome_idx" ON "public"."acceptance_decisions"("outcome");
CREATE INDEX "acceptance_signatures_acceptanceDecisionId_idx" ON "public"."acceptance_signatures"("acceptanceDecisionId");
CREATE INDEX "residual_risks_dossierVersionId_idx" ON "public"."residual_risks"("dossierVersionId");
CREATE INDEX "residual_risks_status_idx" ON "public"."residual_risks"("status");
CREATE INDEX "residual_risks_isCritical_idx" ON "public"."residual_risks"("isCritical");
CREATE INDEX "residual_risk_acceptances_residualRiskId_idx" ON "public"."residual_risk_acceptances"("residualRiskId");
CREATE INDEX "residual_risk_acceptances_decision_idx" ON "public"."residual_risk_acceptances"("decision");
CREATE INDEX "production_activation_requests_dossierId_idx" ON "public"."production_activation_requests"("dossierId");
CREATE INDEX "production_activation_requests_dossierVersionId_idx" ON "public"."production_activation_requests"("dossierVersionId");
CREATE INDEX "production_activation_requests_status_idx" ON "public"."production_activation_requests"("status");
CREATE INDEX "production_activation_decisions_outcome_idx" ON "public"."production_activation_decisions"("outcome");
CREATE INDEX "activation_scopes_activationRequestId_idx" ON "public"."activation_scopes"("activationRequestId");
CREATE INDEX "activation_scopes_activationDecisionId_idx" ON "public"."activation_scopes"("activationDecisionId");
CREATE INDEX "activation_scopes_scopeType_idx" ON "public"."activation_scopes"("scopeType");
CREATE INDEX "activation_communications_activationDecisionId_idx" ON "public"."activation_communications"("activationDecisionId");
CREATE INDEX "activation_audit_records_activationRequestId_idx" ON "public"."activation_audit_records"("activationRequestId");
CREATE INDEX "activation_audit_records_activationDecisionId_idx" ON "public"."activation_audit_records"("activationDecisionId");
CREATE INDEX "activation_audit_records_eventType_idx" ON "public"."activation_audit_records"("eventType");
CREATE INDEX "feature_activations_institutionId_idx" ON "public"."feature_activations"("institutionId");
CREATE INDEX "feature_activations_status_idx" ON "public"."feature_activations"("status");

ALTER TABLE "public"."institutional_acceptance_dossiers" ADD CONSTRAINT "institutional_acceptance_dossiers_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "public"."institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."institutional_acceptance_dossiers" ADD CONSTRAINT "institutional_acceptance_dossiers_accountableOwnerOfficeholderId_fkey" FOREIGN KEY ("accountableOwnerOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."institutional_acceptance_dossiers" ADD CONSTRAINT "institutional_acceptance_dossiers_acceptanceAuthorityFunctionRecordId_fkey" FOREIGN KEY ("acceptanceAuthorityFunctionRecordId") REFERENCES "public"."function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."institutional_acceptance_dossiers" ADD CONSTRAINT "institutional_acceptance_dossiers_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."acceptance_dossier_versions" ADD CONSTRAINT "acceptance_dossier_versions_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "public"."institutional_acceptance_dossiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_dossier_versions" ADD CONSTRAINT "acceptance_dossier_versions_accountableOwnerOfficeholderId_fkey" FOREIGN KEY ("accountableOwnerOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_dossier_versions" ADD CONSTRAINT "acceptance_dossier_versions_acceptanceAuthorityFunctionRecordId_fkey" FOREIGN KEY ("acceptanceAuthorityFunctionRecordId") REFERENCES "public"."function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."acceptance_subjects" ADD CONSTRAINT "acceptance_subjects_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_requirements" ADD CONSTRAINT "acceptance_requirements_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_evidence_links" ADD CONSTRAINT "acceptance_evidence_links_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_evidence_links" ADD CONSTRAINT "acceptance_evidence_links_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "public"."evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_test_results" ADD CONSTRAINT "acceptance_test_results_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_defects" ADD CONSTRAINT "acceptance_defects_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_exceptions" ADD CONSTRAINT "acceptance_exceptions_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_conditions" ADD CONSTRAINT "acceptance_conditions_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_conditions" ADD CONSTRAINT "acceptance_conditions_acceptanceDecisionId_fkey" FOREIGN KEY ("acceptanceDecisionId") REFERENCES "public"."acceptance_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_conditions" ADD CONSTRAINT "acceptance_conditions_residualRiskAcceptanceId_fkey" FOREIGN KEY ("residualRiskAcceptanceId") REFERENCES "public"."residual_risk_acceptances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_conditions" ADD CONSTRAINT "acceptance_conditions_ownerOfficeholderId_fkey" FOREIGN KEY ("ownerOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_dependencies" ADD CONSTRAINT "acceptance_dependencies_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_level_achievements" ADD CONSTRAINT "acceptance_level_achievements_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_level_achievements" ADD CONSTRAINT "acceptance_level_achievements_achievedByIdentityId_fkey" FOREIGN KEY ("achievedByIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_level_achievements" ADD CONSTRAINT "acceptance_level_achievements_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "public"."authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_reviews" ADD CONSTRAINT "acceptance_reviews_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_reviews" ADD CONSTRAINT "acceptance_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "public"."identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_decisions" ADD CONSTRAINT "acceptance_decisions_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_decisions" ADD CONSTRAINT "acceptance_decisions_decidedByOfficeholderId_fkey" FOREIGN KEY ("decidedByOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_decisions" ADD CONSTRAINT "acceptance_decisions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "public"."authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_signatures" ADD CONSTRAINT "acceptance_signatures_acceptanceDecisionId_fkey" FOREIGN KEY ("acceptanceDecisionId") REFERENCES "public"."acceptance_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."acceptance_signatures" ADD CONSTRAINT "acceptance_signatures_signerOfficeholderId_fkey" FOREIGN KEY ("signerOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."residual_risks" ADD CONSTRAINT "residual_risks_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."residual_risks" ADD CONSTRAINT "residual_risks_ownerOfficeholderId_fkey" FOREIGN KEY ("ownerOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."residual_risks" ADD CONSTRAINT "residual_risks_riskAcceptanceAuthorityFunctionRecordId_fkey" FOREIGN KEY ("riskAcceptanceAuthorityFunctionRecordId") REFERENCES "public"."function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."residual_risk_acceptances" ADD CONSTRAINT "residual_risk_acceptances_residualRiskId_fkey" FOREIGN KEY ("residualRiskId") REFERENCES "public"."residual_risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."residual_risk_acceptances" ADD CONSTRAINT "residual_risk_acceptances_decidedByOfficeholderId_fkey" FOREIGN KEY ("decidedByOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."residual_risk_acceptances" ADD CONSTRAINT "residual_risk_acceptances_decidedByIdentityId_fkey" FOREIGN KEY ("decidedByIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."residual_risk_acceptances" ADD CONSTRAINT "residual_risk_acceptances_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "public"."authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."production_activation_requests" ADD CONSTRAINT "production_activation_requests_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "public"."institutional_acceptance_dossiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."production_activation_requests" ADD CONSTRAINT "production_activation_requests_dossierVersionId_fkey" FOREIGN KEY ("dossierVersionId") REFERENCES "public"."acceptance_dossier_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."production_activation_requests" ADD CONSTRAINT "production_activation_requests_submittedByIdentityId_fkey" FOREIGN KEY ("submittedByIdentityId") REFERENCES "public"."identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."production_activation_decisions" ADD CONSTRAINT "production_activation_decisions_activationRequestId_fkey" FOREIGN KEY ("activationRequestId") REFERENCES "public"."production_activation_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."production_activation_decisions" ADD CONSTRAINT "production_activation_decisions_decidedByOfficeholderId_fkey" FOREIGN KEY ("decidedByOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."production_activation_decisions" ADD CONSTRAINT "production_activation_decisions_decidedByIdentityId_fkey" FOREIGN KEY ("decidedByIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."production_activation_decisions" ADD CONSTRAINT "production_activation_decisions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "public"."authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."production_activation_decisions" ADD CONSTRAINT "production_activation_decisions_freshAuthorityEvaluationRecordId_fkey" FOREIGN KEY ("freshAuthorityEvaluationRecordId") REFERENCES "public"."authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."activation_scopes" ADD CONSTRAINT "activation_scopes_activationRequestId_fkey" FOREIGN KEY ("activationRequestId") REFERENCES "public"."production_activation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."activation_scopes" ADD CONSTRAINT "activation_scopes_activationDecisionId_fkey" FOREIGN KEY ("activationDecisionId") REFERENCES "public"."production_activation_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."activation_communications" ADD CONSTRAINT "activation_communications_activationDecisionId_fkey" FOREIGN KEY ("activationDecisionId") REFERENCES "public"."production_activation_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."activation_communications" ADD CONSTRAINT "activation_communications_sentByIdentityId_fkey" FOREIGN KEY ("sentByIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."activation_audit_records" ADD CONSTRAINT "activation_audit_records_activationRequestId_fkey" FOREIGN KEY ("activationRequestId") REFERENCES "public"."production_activation_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."activation_audit_records" ADD CONSTRAINT "activation_audit_records_activationDecisionId_fkey" FOREIGN KEY ("activationDecisionId") REFERENCES "public"."production_activation_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."activation_audit_records" ADD CONSTRAINT "activation_audit_records_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."feature_activations" ADD CONSTRAINT "feature_activations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "public"."institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."feature_activations" ADD CONSTRAINT "feature_activations_productionActivationDecisionId_fkey" FOREIGN KEY ("productionActivationDecisionId") REFERENCES "public"."production_activation_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."feature_activations" ADD CONSTRAINT "feature_activations_activationScopeId_fkey" FOREIGN KEY ("activationScopeId") REFERENCES "public"."activation_scopes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
