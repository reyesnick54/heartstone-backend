-- Phase 12A: Performance Claims
CREATE TYPE "PerformanceClaimCategory" AS ENUM ('INVESTMENT', 'EMPLOYMENT', 'EXPORTS', 'REVENUES', 'SECTOR_GROWTH', 'LOCAL_PARTICIPATION', 'ECONOMIC_IMPACT', 'OTHER');

CREATE TYPE "PerformanceClaimReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'PUBLIC');

CREATE TABLE "performance_claims" (
    "id" UUID NOT NULL,
    "claimReference" TEXT NOT NULL,
    "category" "PerformanceClaimCategory" NOT NULL,
    "assertedValue" JSONB NOT NULL DEFAULT '{}',
    "assertedByIdentityId" UUID NOT NULL,
    "reviewStatus" "PerformanceClaimReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "requiresClaimReview" BOOLEAN NOT NULL DEFAULT true,
    "humanReviewedAt" TIMESTAMP(3),
    "humanReviewedByIdentityId" UUID,
    "attributionMetadata" JSONB NOT NULL DEFAULT '{}',
    "externalFactorNotes" TEXT,
    "independentVerificationRefs" JSONB NOT NULL DEFAULT '[]',
    "isApplicantAssertion" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_claims_pkey" PRIMARY KEY ("id")
);

-- Phase 12C: Strategic Project and Economic Development Intelligence
CREATE TYPE "StrategicProjectLifecycleStage" AS ENUM ('INQUIRY', 'QUALIFICATION', 'APPLICATION', 'UNDER_REVIEW', 'CONDITIONALLY_ADVANCING', 'APPROVED', 'PRE_IMPLEMENTATION', 'IMPLEMENTATION', 'PARTIALLY_OPERATIONAL', 'OPERATIONAL', 'SUSPENDED', 'CLOSED');

CREATE TYPE "StrategicProjectMilestoneStatus" AS ENUM ('PLANNED', 'REPORTED', 'SUBMITTED', 'REVIEWED', 'VERIFIED', 'ACCEPTED', 'COMPLETED', 'REVALIDATED', 'DISPUTED', 'SUPERSEDED');

CREATE TYPE "CapitalEvidenceClassification" AS ENUM ('PROPOSED', 'INDICATED', 'COMMITTED', 'CONTRACTED', 'FUNDED', 'AVAILABLE', 'DEPLOYED', 'VERIFIED_DEPLOYED');

CREATE TYPE "EmploymentEvidenceClassification" AS ENUM ('FORECAST', 'PLANNED', 'COMMITTED', 'OFFERED', 'ONBOARDED', 'ACTIVE_VERIFIED', 'ENDED');

CREATE TYPE "InfrastructureDeliveryStage" AS ENUM ('CONCEPT', 'DESIGN', 'PROCUREMENT', 'CONTRACTED', 'CONSTRUCTION_REPORTED', 'CONSTRUCTION_VERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL', 'REVALIDATED');

CREATE TYPE "StrategicProjectDependencyType" AS ENUM ('GOVERNMENT', 'PROFESSIONAL', 'UTILITY', 'FINANCE', 'LAND', 'PLANNING', 'ENVIRONMENTAL', 'CUSTOMS', 'IMMIGRATION', 'LABOUR', 'SECURITY', 'TECHNOLOGY', 'SUPPLIER', 'INFRASTRUCTURE');

CREATE TYPE "StrategicProjectDependencyOwnerType" AS ENUM ('GOVERNMENT', 'APPLICANT', 'THIRD_PARTY', 'UTILITY', 'PROFESSIONAL', 'FINANCIAL_INSTITUTION', 'SUPPLIER', 'OTHER');

CREATE TYPE "StrategicProjectRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "ProjectStatusProjectionAudience" AS ENUM ('OFFICIAL', 'EXECUTIVE', 'PUBLIC', 'SPONSOR');

CREATE TABLE "strategic_project_profiles" (
    "id" UUID NOT NULL,
    "projectCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sponsoringInstitutionId" UUID NOT NULL,
    "responsibleDepartmentId" UUID NOT NULL,
    "caseId" UUID,
    "sectorCode" TEXT,
    "currentStage" "StrategicProjectLifecycleStage" NOT NULL DEFAULT 'INQUIRY',
    "adverseStatusPreserved" BOOLEAN NOT NULL DEFAULT false,
    "attributionMetadata" JSONB NOT NULL DEFAULT '{}',
    "externalFactorNotes" TEXT,
    "announcementDate" TIMESTAMP(3),
    "doesNotInferApprovalFromActivity" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_project_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "strategic_project_stages" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "stage" "StrategicProjectLifecycleStage" NOT NULL,
    "institutionalStateReference" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "recordedByIdentityId" UUID NOT NULL,
    "sourceRecordType" TEXT,
    "sourceRecordId" TEXT,
    "doesNotInferApproval" BOOLEAN NOT NULL DEFAULT true,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategic_project_stages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "strategic_project_milestones" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "StrategicProjectMilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedDate" TIMESTAMP(3),
    "reportedDate" TIMESTAMP(3),
    "verifiedDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "reportedByIdentityId" UUID,
    "evidenceRecordRefs" JSONB NOT NULL DEFAULT '[]',
    "independentVerificationRefs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_project_milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "strategic_project_dependencies" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "dependencyType" "StrategicProjectDependencyType" NOT NULL,
    "ownerType" "StrategicProjectDependencyOwnerType" NOT NULL,
    "ownerReference" TEXT NOT NULL,
    "ownerName" TEXT,
    "description" TEXT,
    "statusSummary" TEXT,
    "isGovernmentOwned" BOOLEAN NOT NULL DEFAULT false,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_project_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "strategic_project_risks" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "riskLevel" "StrategicProjectRiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "riskScore" INTEGER,
    "doesNotAffectApproval" BOOLEAN NOT NULL DEFAULT true,
    "methodologyVersion" TEXT,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_project_risks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "strategic_project_economic_claims" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "performanceClaimId" UUID NOT NULL,
    "claimSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategic_project_economic_claims_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capital_evidence_records" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "classification" "CapitalEvidenceClassification" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "evidenceRecordRefs" JSONB NOT NULL DEFAULT '[]',
    "independentVerificationRefs" JSONB NOT NULL DEFAULT '[]',
    "recordedByIdentityId" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capital_evidence_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employment_evidence_records" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "classification" "EmploymentEvidenceClassification" NOT NULL,
    "headcount" INTEGER NOT NULL,
    "evidenceRecordRefs" JSONB NOT NULL DEFAULT '[]',
    "independentVerificationRefs" JSONB NOT NULL DEFAULT '[]',
    "recordedByIdentityId" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_evidence_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "infrastructure_delivery_records" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "stage" "InfrastructureDeliveryStage" NOT NULL,
    "digitalTwinStatus" TEXT,
    "physicalCompletionVerified" BOOLEAN NOT NULL DEFAULT false,
    "dashboardStatus" TEXT,
    "evidenceRecordRefs" JSONB NOT NULL DEFAULT '[]',
    "independentVerificationRefs" JSONB NOT NULL DEFAULT '[]',
    "recordedByIdentityId" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "infrastructure_delivery_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sector_development_observations" (
    "id" UUID NOT NULL,
    "sectorCode" TEXT NOT NULL,
    "observationSummary" TEXT NOT NULL,
    "attributionMetadata" JSONB NOT NULL DEFAULT '{}',
    "externalFactorNotes" TEXT,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "doesNotClaimNationalCausation" BOOLEAN NOT NULL DEFAULT true,
    "recordedByIdentityId" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sector_development_observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_status_projections" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "audience" "ProjectStatusProjectionAudience" NOT NULL,
    "derivedStage" "StrategicProjectLifecycleStage" NOT NULL,
    "projectionDisclaimer" TEXT NOT NULL,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "evidenceCutoffAt" TIMESTAMP(3),
    "adverseStatusPreserved" BOOLEAN NOT NULL DEFAULT false,
    "projectionVersion" INTEGER NOT NULL DEFAULT 1,
    "lastDerivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derivedByIdentityId" UUID,

    CONSTRAINT "project_status_projections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "performance_claims_claimReference_key" ON "performance_claims"("claimReference");
CREATE INDEX "performance_claims_category_idx" ON "performance_claims"("category");
CREATE INDEX "performance_claims_reviewStatus_idx" ON "performance_claims"("reviewStatus");
CREATE INDEX "performance_claims_assertedByIdentityId_idx" ON "performance_claims"("assertedByIdentityId");

CREATE UNIQUE INDEX "strategic_project_profiles_projectCode_key" ON "strategic_project_profiles"("projectCode");
CREATE INDEX "strategic_project_profiles_sponsoringInstitutionId_idx" ON "strategic_project_profiles"("sponsoringInstitutionId");
CREATE INDEX "strategic_project_profiles_responsibleDepartmentId_idx" ON "strategic_project_profiles"("responsibleDepartmentId");
CREATE INDEX "strategic_project_profiles_caseId_idx" ON "strategic_project_profiles"("caseId");
CREATE INDEX "strategic_project_profiles_currentStage_idx" ON "strategic_project_profiles"("currentStage");
CREATE INDEX "strategic_project_profiles_sectorCode_idx" ON "strategic_project_profiles"("sectorCode");

CREATE INDEX "strategic_project_stages_profileId_idx" ON "strategic_project_stages"("profileId");
CREATE INDEX "strategic_project_stages_stage_idx" ON "strategic_project_stages"("stage");
CREATE INDEX "strategic_project_stages_effectiveFrom_idx" ON "strategic_project_stages"("effectiveFrom");

CREATE INDEX "strategic_project_milestones_profileId_idx" ON "strategic_project_milestones"("profileId");
CREATE INDEX "strategic_project_milestones_status_idx" ON "strategic_project_milestones"("status");

CREATE INDEX "strategic_project_dependencies_profileId_idx" ON "strategic_project_dependencies"("profileId");
CREATE INDEX "strategic_project_dependencies_dependencyType_idx" ON "strategic_project_dependencies"("dependencyType");
CREATE INDEX "strategic_project_dependencies_ownerType_idx" ON "strategic_project_dependencies"("ownerType");

CREATE INDEX "strategic_project_risks_profileId_idx" ON "strategic_project_risks"("profileId");
CREATE INDEX "strategic_project_risks_riskLevel_idx" ON "strategic_project_risks"("riskLevel");

CREATE UNIQUE INDEX "strategic_project_economic_claims_profileId_performanceClaimId_key" ON "strategic_project_economic_claims"("profileId", "performanceClaimId");
CREATE INDEX "strategic_project_economic_claims_profileId_idx" ON "strategic_project_economic_claims"("profileId");
CREATE INDEX "strategic_project_economic_claims_performanceClaimId_idx" ON "strategic_project_economic_claims"("performanceClaimId");

CREATE INDEX "capital_evidence_records_profileId_idx" ON "capital_evidence_records"("profileId");
CREATE INDEX "capital_evidence_records_classification_idx" ON "capital_evidence_records"("classification");

CREATE INDEX "employment_evidence_records_profileId_idx" ON "employment_evidence_records"("profileId");
CREATE INDEX "employment_evidence_records_classification_idx" ON "employment_evidence_records"("classification");

CREATE INDEX "infrastructure_delivery_records_profileId_idx" ON "infrastructure_delivery_records"("profileId");
CREATE INDEX "infrastructure_delivery_records_stage_idx" ON "infrastructure_delivery_records"("stage");

CREATE INDEX "sector_development_observations_sectorCode_idx" ON "sector_development_observations"("sectorCode");

CREATE INDEX "project_status_projections_profileId_idx" ON "project_status_projections"("profileId");
CREATE INDEX "project_status_projections_audience_idx" ON "project_status_projections"("audience");

ALTER TABLE "performance_claims" ADD CONSTRAINT "performance_claims_assertedByIdentityId_fkey" FOREIGN KEY ("assertedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "performance_claims" ADD CONSTRAINT "performance_claims_humanReviewedByIdentityId_fkey" FOREIGN KEY ("humanReviewedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "strategic_project_profiles" ADD CONSTRAINT "strategic_project_profiles_sponsoringInstitutionId_fkey" FOREIGN KEY ("sponsoringInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "strategic_project_profiles" ADD CONSTRAINT "strategic_project_profiles_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "strategic_project_profiles" ADD CONSTRAINT "strategic_project_profiles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "strategic_project_stages" ADD CONSTRAINT "strategic_project_stages_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_project_stages" ADD CONSTRAINT "strategic_project_stages_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "strategic_project_milestones" ADD CONSTRAINT "strategic_project_milestones_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_project_milestones" ADD CONSTRAINT "strategic_project_milestones_reportedByIdentityId_fkey" FOREIGN KEY ("reportedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "strategic_project_dependencies" ADD CONSTRAINT "strategic_project_dependencies_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "strategic_project_risks" ADD CONSTRAINT "strategic_project_risks_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "strategic_project_economic_claims" ADD CONSTRAINT "strategic_project_economic_claims_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_project_economic_claims" ADD CONSTRAINT "strategic_project_economic_claims_performanceClaimId_fkey" FOREIGN KEY ("performanceClaimId") REFERENCES "performance_claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "capital_evidence_records" ADD CONSTRAINT "capital_evidence_records_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "capital_evidence_records" ADD CONSTRAINT "capital_evidence_records_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employment_evidence_records" ADD CONSTRAINT "employment_evidence_records_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employment_evidence_records" ADD CONSTRAINT "employment_evidence_records_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "infrastructure_delivery_records" ADD CONSTRAINT "infrastructure_delivery_records_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "infrastructure_delivery_records" ADD CONSTRAINT "infrastructure_delivery_records_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sector_development_observations" ADD CONSTRAINT "sector_development_observations_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_status_projections" ADD CONSTRAINT "project_status_projections_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_status_projections" ADD CONSTRAINT "project_status_projections_derivedByIdentityId_fkey" FOREIGN KEY ("derivedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
