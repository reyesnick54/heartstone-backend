-- Planning, Development & Construction service pack domain

CREATE TYPE "DevelopmentProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "DevelopmentApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DECIDED', 'WITHDRAWN');
CREATE TYPE "DevelopmentPermitStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ISSUED', 'DENIED', 'SUSPENDED', 'EXPIRED', 'AMENDED');
CREATE TYPE "DevelopmentInspectionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DevelopmentInspectionOutcome" AS ENUM ('PASS', 'FAIL', 'CONDITIONAL', 'CANCELLED');
CREATE TYPE "DevelopmentExternalDependencyStatus" AS ENUM ('PENDING', 'REFERRED', 'RESOLVED', 'BLOCKED');
CREATE TYPE "DevelopmentCorrectiveActionStatus" AS ENUM ('OPEN', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CLOSED');
CREATE TYPE "DevelopmentFeeStatus" AS ENUM ('OUTSTANDING', 'PAID', 'WAIVED', 'CANCELLED');
CREATE TYPE "DevelopmentOccupancyCertificateStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'ISSUED', 'DENIED');
CREATE TYPE "DevelopmentPlanningAppealStatus" AS ENUM ('FILED', 'UNDER_REVIEW', 'DECIDED', 'WITHDRAWN');
CREATE TYPE "DevelopmentProfessionalRole" AS ENUM ('ARCHITECT', 'ENGINEER', 'SURVEYOR', 'CONTRACTOR', 'OTHER');
CREATE TYPE "DevelopmentAccessActorKind" AS ENUM ('APPLICANT', 'PROFESSIONAL', 'PLANNING_OFFICER', 'INSPECTOR', 'REPRESENTATIVE', 'PAYMENT_SYSTEM', 'AI_ASSISTANCE');

CREATE TABLE "development_projects" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "projectReference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "DevelopmentProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "primaryApplicantIdentityId" UUID,
    "organizationId" UUID,
    "responsibleDepartmentId" UUID,
    "ruleEnvironment" TEXT NOT NULL DEFAULT 'NON_PRODUCTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_project_sites" (
    "id" UUID NOT NULL,
    "developmentProjectId" UUID NOT NULL,
    "siteLabel" TEXT NOT NULL,
    "addressLine" TEXT,
    "parcelReference" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_project_sites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_applications" (
    "id" UUID NOT NULL,
    "developmentProjectId" UUID NOT NULL,
    "applicationReference" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "status" "DevelopmentApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "caseId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_permits" (
    "id" UUID NOT NULL,
    "developmentProjectId" UUID NOT NULL,
    "permitNumber" TEXT NOT NULL,
    "permitType" TEXT NOT NULL,
    "status" "DevelopmentPermitStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" UUID,
    "issuedByOfficeholderId" UUID,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_permits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_permit_versions" (
    "id" UUID NOT NULL,
    "developmentPermitId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "isAmendment" BOOLEAN NOT NULL DEFAULT false,
    "amendmentSummary" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_permit_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_inspections" (
    "id" UUID NOT NULL,
    "developmentProjectId" UUID NOT NULL,
    "inspectionReference" TEXT NOT NULL,
    "inspectionType" TEXT NOT NULL,
    "status" "DevelopmentInspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "outcome" "DevelopmentInspectionOutcome",
    "failureNotes" TEXT,
    "outcomeLockedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_inspections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_corrective_actions" (
    "id" UUID NOT NULL,
    "developmentProjectId" UUID NOT NULL,
    "developmentInspectionId" UUID,
    "actionReference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DevelopmentCorrectiveActionStatus" NOT NULL DEFAULT 'OPEN',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_corrective_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_external_dependencies" (
    "id" UUID NOT NULL,
    "developmentProjectId" UUID NOT NULL,
    "dependencyCode" TEXT NOT NULL,
    "dependencyLabel" TEXT NOT NULL,
    "status" "DevelopmentExternalDependencyStatus" NOT NULL DEFAULT 'PENDING',
    "blocksPermitDecision" BOOLEAN NOT NULL DEFAULT true,
    "externalAuthorityReference" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_external_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_project_professionals" (
    "id" UUID NOT NULL,
    "developmentProjectId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "role" "DevelopmentProfessionalRole" NOT NULL,
    "registrationReference" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_project_professionals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_project_fees" (
    "id" UUID NOT NULL,
    "developmentProjectId" UUID NOT NULL,
    "feeCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "status" "DevelopmentFeeStatus" NOT NULL DEFAULT 'OUTSTANDING',
    "paidAt" TIMESTAMP(3),
    "paymentTransactionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_project_fees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_occupancy_certificates" (
    "id" UUID NOT NULL,
    "developmentProjectId" UUID NOT NULL,
    "certificateReference" TEXT NOT NULL,
    "status" "DevelopmentOccupancyCertificateStatus" NOT NULL DEFAULT 'REQUESTED',
    "governmentDecisionId" UUID,
    "issuedByOfficeholderId" UUID,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_occupancy_certificates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_planning_appeals" (
    "id" UUID NOT NULL,
    "developmentProjectId" UUID NOT NULL,
    "appealReference" TEXT NOT NULL,
    "status" "DevelopmentPlanningAppealStatus" NOT NULL DEFAULT 'FILED',
    "groundsSummary" TEXT NOT NULL,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_planning_appeals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_access_audits" (
    "id" UUID NOT NULL,
    "developmentProjectId" UUID NOT NULL,
    "accessorIdentityId" UUID NOT NULL,
    "actorKind" "DevelopmentAccessActorKind" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "denialReason" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "development_access_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "development_projects_projectReference_key" ON "development_projects"("projectReference");
CREATE INDEX "development_projects_jurisdictionId_idx" ON "development_projects"("jurisdictionId");
CREATE INDEX "development_projects_primaryApplicantIdentityId_idx" ON "development_projects"("primaryApplicantIdentityId");
CREATE INDEX "development_projects_organizationId_idx" ON "development_projects"("organizationId");
CREATE INDEX "development_projects_responsibleDepartmentId_idx" ON "development_projects"("responsibleDepartmentId");
CREATE INDEX "development_projects_status_idx" ON "development_projects"("status");

CREATE UNIQUE INDEX "development_project_sites_developmentProjectId_key" ON "development_project_sites"("developmentProjectId");

CREATE UNIQUE INDEX "development_applications_applicationReference_key" ON "development_applications"("applicationReference");
CREATE INDEX "development_applications_developmentProjectId_idx" ON "development_applications"("developmentProjectId");
CREATE INDEX "development_applications_status_idx" ON "development_applications"("status");

CREATE UNIQUE INDEX "development_permits_permitNumber_key" ON "development_permits"("permitNumber");
CREATE UNIQUE INDEX "development_permits_currentVersionId_key" ON "development_permits"("currentVersionId");
CREATE INDEX "development_permits_developmentProjectId_idx" ON "development_permits"("developmentProjectId");
CREATE INDEX "development_permits_status_idx" ON "development_permits"("status");

CREATE UNIQUE INDEX "development_permit_versions_developmentPermitId_versionNumber_key" ON "development_permit_versions"("developmentPermitId", "versionNumber");
CREATE INDEX "development_permit_versions_developmentPermitId_idx" ON "development_permit_versions"("developmentPermitId");

CREATE UNIQUE INDEX "development_inspections_inspectionReference_key" ON "development_inspections"("inspectionReference");
CREATE INDEX "development_inspections_developmentProjectId_idx" ON "development_inspections"("developmentProjectId");
CREATE INDEX "development_inspections_status_idx" ON "development_inspections"("status");

CREATE UNIQUE INDEX "development_corrective_actions_actionReference_key" ON "development_corrective_actions"("actionReference");
CREATE INDEX "development_corrective_actions_developmentProjectId_idx" ON "development_corrective_actions"("developmentProjectId");

CREATE INDEX "development_external_dependencies_developmentProjectId_idx" ON "development_external_dependencies"("developmentProjectId");
CREATE INDEX "development_external_dependencies_status_idx" ON "development_external_dependencies"("status");

CREATE INDEX "development_project_professionals_developmentProjectId_idx" ON "development_project_professionals"("developmentProjectId");
CREATE INDEX "development_project_professionals_identityId_idx" ON "development_project_professionals"("identityId");

CREATE INDEX "development_project_fees_developmentProjectId_idx" ON "development_project_fees"("developmentProjectId");
CREATE INDEX "development_project_fees_status_idx" ON "development_project_fees"("status");

CREATE UNIQUE INDEX "development_occupancy_certificates_certificateReference_key" ON "development_occupancy_certificates"("certificateReference");
CREATE INDEX "development_occupancy_certificates_developmentProjectId_idx" ON "development_occupancy_certificates"("developmentProjectId");
CREATE INDEX "development_occupancy_certificates_status_idx" ON "development_occupancy_certificates"("status");

CREATE UNIQUE INDEX "development_planning_appeals_appealReference_key" ON "development_planning_appeals"("appealReference");
CREATE INDEX "development_planning_appeals_developmentProjectId_idx" ON "development_planning_appeals"("developmentProjectId");
CREATE INDEX "development_planning_appeals_status_idx" ON "development_planning_appeals"("status");

CREATE INDEX "development_access_audits_developmentProjectId_idx" ON "development_access_audits"("developmentProjectId");
CREATE INDEX "development_access_audits_accessorIdentityId_idx" ON "development_access_audits"("accessorIdentityId");

ALTER TABLE "development_projects" ADD CONSTRAINT "development_projects_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "development_projects" ADD CONSTRAINT "development_projects_primaryApplicantIdentityId_fkey" FOREIGN KEY ("primaryApplicantIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "development_projects" ADD CONSTRAINT "development_projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "development_projects" ADD CONSTRAINT "development_projects_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "development_project_sites" ADD CONSTRAINT "development_project_sites_developmentProjectId_fkey" FOREIGN KEY ("developmentProjectId") REFERENCES "development_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "development_applications" ADD CONSTRAINT "development_applications_developmentProjectId_fkey" FOREIGN KEY ("developmentProjectId") REFERENCES "development_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "development_permits" ADD CONSTRAINT "development_permits_developmentProjectId_fkey" FOREIGN KEY ("developmentProjectId") REFERENCES "development_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "development_permits" ADD CONSTRAINT "development_permits_issuedByOfficeholderId_fkey" FOREIGN KEY ("issuedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "development_permit_versions" ADD CONSTRAINT "development_permit_versions_developmentPermitId_fkey" FOREIGN KEY ("developmentPermitId") REFERENCES "development_permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "development_permits" ADD CONSTRAINT "development_permits_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "development_permit_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "development_inspections" ADD CONSTRAINT "development_inspections_developmentProjectId_fkey" FOREIGN KEY ("developmentProjectId") REFERENCES "development_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "development_corrective_actions" ADD CONSTRAINT "development_corrective_actions_developmentProjectId_fkey" FOREIGN KEY ("developmentProjectId") REFERENCES "development_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "development_corrective_actions" ADD CONSTRAINT "development_corrective_actions_developmentInspectionId_fkey" FOREIGN KEY ("developmentInspectionId") REFERENCES "development_inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "development_external_dependencies" ADD CONSTRAINT "development_external_dependencies_developmentProjectId_fkey" FOREIGN KEY ("developmentProjectId") REFERENCES "development_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "development_project_professionals" ADD CONSTRAINT "development_project_professionals_developmentProjectId_fkey" FOREIGN KEY ("developmentProjectId") REFERENCES "development_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "development_project_professionals" ADD CONSTRAINT "development_project_professionals_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "development_project_fees" ADD CONSTRAINT "development_project_fees_developmentProjectId_fkey" FOREIGN KEY ("developmentProjectId") REFERENCES "development_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "development_occupancy_certificates" ADD CONSTRAINT "development_occupancy_certificates_developmentProjectId_fkey" FOREIGN KEY ("developmentProjectId") REFERENCES "development_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "development_occupancy_certificates" ADD CONSTRAINT "development_occupancy_certificates_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "development_occupancy_certificates" ADD CONSTRAINT "development_occupancy_certificates_issuedByOfficeholderId_fkey" FOREIGN KEY ("issuedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "development_planning_appeals" ADD CONSTRAINT "development_planning_appeals_developmentProjectId_fkey" FOREIGN KEY ("developmentProjectId") REFERENCES "development_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "development_access_audits" ADD CONSTRAINT "development_access_audits_developmentProjectId_fkey" FOREIGN KEY ("developmentProjectId") REFERENCES "development_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "development_access_audits" ADD CONSTRAINT "development_access_audits_accessorIdentityId_fkey" FOREIGN KEY ("accessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
