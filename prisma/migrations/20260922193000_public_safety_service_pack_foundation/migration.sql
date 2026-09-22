-- CreateEnum
CREATE TYPE "PublicSafetyEngagementStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "PublicSafetyVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PublicSafetyServiceRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "PublicSafetyServiceRequestKind" AS ENUM ('SUBMIT_INCIDENT_REPORT', 'REQUEST_EMERGENCY_ASSISTANCE', 'DISASTER_IMPACT_REPORT', 'DISASTER_RELIEF_INTAKE', 'PUBLIC_SAFETY_PERMIT_APPLICATION', 'FIRE_SAFETY_INSPECTION_REQUEST', 'EMERGENCY_INSPECTION_REQUEST', 'EMERGENCY_DOCUMENT_REPLACEMENT', 'INFRASTRUCTURE_DISRUPTION_REPORT', 'EMERGENCY_SHELTER_ASSISTANCE_INFO', 'RECOVERY_ASSISTANCE_APPLICATION', 'PUBLIC_SAFETY_DECISION_REVIEW_APPEAL');

-- CreateEnum
CREATE TYPE "PublicSafetyEmergencyEventStatus" AS ENUM ('INFORMATIONAL', 'ACTIVE_MONITORING', 'RESPONSE_COORDINATION', 'RECOVERY', 'CLOSED');

-- CreateEnum
CREATE TYPE "PublicSafetyOfficialNoticeStatus" AS ENUM ('DRAFT', 'APPROVED', 'PUBLISHED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PublicSafetyInspectionRequestStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PublicSafetyExternalDependencyStatus" AS ENUM ('PENDING', 'REFERRED', 'SATISFIED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PublicSafetyCommunicationDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "public_safety_engagements" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "engagementReference" TEXT NOT NULL,
    "reporterIdentityId" UUID,
    "organizationId" UUID,
    "responsibleDepartmentId" UUID,
    "status" "PublicSafetyEngagementStatus" NOT NULL DEFAULT 'ACTIVE',
    "ruleEnvironment" TEXT NOT NULL DEFAULT 'NON_PRODUCTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_safety_engagements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_safety_service_requests" (
    "id" UUID NOT NULL,
    "engagementId" UUID NOT NULL,
    "requestReference" TEXT NOT NULL,
    "serviceTemplateCode" TEXT NOT NULL,
    "requestKind" "PublicSafetyServiceRequestKind" NOT NULL,
    "status" "PublicSafetyServiceRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_safety_service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_safety_incident_reports" (
    "id" UUID NOT NULL,
    "engagementId" UUID NOT NULL,
    "serviceRequestId" UUID,
    "incidentReference" TEXT NOT NULL,
    "verificationStatus" "PublicSafetyVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "reporterIdentityId" UUID,
    "summaryLabel" TEXT NOT NULL,
    "locationDescription" TEXT,
    "protectsReporterIdentity" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_safety_incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_safety_recovery_assistance_applications" (
    "id" UUID NOT NULL,
    "engagementId" UUID NOT NULL,
    "serviceRequestId" UUID,
    "applicationReference" TEXT NOT NULL,
    "programCode" TEXT NOT NULL,
    "status" "PublicSafetyServiceRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_safety_recovery_assistance_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_safety_emergency_events" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "eventReference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PublicSafetyEmergencyEventStatus" NOT NULL DEFAULT 'INFORMATIONAL',
    "isOfficialDeclaration" BOOLEAN NOT NULL DEFAULT false,
    "publicSummary" TEXT,
    "verifiedImpactSummary" TEXT,
    "serviceInterruptionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_safety_emergency_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_safety_official_notices" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "noticeReference" TEXT NOT NULL,
    "status" "PublicSafetyOfficialNoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "draftContent" TEXT NOT NULL,
    "approvedContent" TEXT,
    "publishedContent" TEXT,
    "approvedByOfficeholderId" UUID,
    "publishedByOfficeholderId" UUID,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_safety_official_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_safety_inspection_requests" (
    "id" UUID NOT NULL,
    "engagementId" UUID NOT NULL,
    "inspectionReference" TEXT NOT NULL,
    "inspectionKind" TEXT NOT NULL,
    "status" "PublicSafetyInspectionRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "facilityLabel" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_safety_inspection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_safety_external_dependencies" (
    "id" UUID NOT NULL,
    "engagementId" UUID NOT NULL,
    "dependencyCode" TEXT NOT NULL,
    "dependencyLabel" TEXT NOT NULL,
    "status" "PublicSafetyExternalDependencyStatus" NOT NULL DEFAULT 'PENDING',
    "externalAuthorityReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_safety_external_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_safety_communication_deliveries" (
    "id" UUID NOT NULL,
    "engagementId" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "templateCode" TEXT,
    "status" "PublicSafetyCommunicationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_safety_communication_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "public_safety_engagements_engagementReference_key" ON "public_safety_engagements"("engagementReference");

-- CreateIndex
CREATE INDEX "public_safety_engagements_jurisdictionId_idx" ON "public_safety_engagements"("jurisdictionId");

-- CreateIndex
CREATE INDEX "public_safety_engagements_reporterIdentityId_idx" ON "public_safety_engagements"("reporterIdentityId");

-- CreateIndex
CREATE INDEX "public_safety_engagements_organizationId_idx" ON "public_safety_engagements"("organizationId");

-- CreateIndex
CREATE INDEX "public_safety_engagements_responsibleDepartmentId_idx" ON "public_safety_engagements"("responsibleDepartmentId");

-- CreateIndex
CREATE INDEX "public_safety_engagements_status_idx" ON "public_safety_engagements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "public_safety_service_requests_requestReference_key" ON "public_safety_service_requests"("requestReference");

-- CreateIndex
CREATE INDEX "public_safety_service_requests_engagementId_idx" ON "public_safety_service_requests"("engagementId");

-- CreateIndex
CREATE INDEX "public_safety_service_requests_requestKind_idx" ON "public_safety_service_requests"("requestKind");

-- CreateIndex
CREATE INDEX "public_safety_service_requests_status_idx" ON "public_safety_service_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "public_safety_incident_reports_serviceRequestId_key" ON "public_safety_incident_reports"("serviceRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "public_safety_incident_reports_incidentReference_key" ON "public_safety_incident_reports"("incidentReference");

-- CreateIndex
CREATE INDEX "public_safety_incident_reports_engagementId_idx" ON "public_safety_incident_reports"("engagementId");

-- CreateIndex
CREATE INDEX "public_safety_incident_reports_verificationStatus_idx" ON "public_safety_incident_reports"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "public_safety_recovery_assistance_applications_serviceRequestId_key" ON "public_safety_recovery_assistance_applications"("serviceRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "public_safety_recovery_assistance_applications_applicationReference_key" ON "public_safety_recovery_assistance_applications"("applicationReference");

-- CreateIndex
CREATE INDEX "public_safety_recovery_assistance_applications_engagementId_idx" ON "public_safety_recovery_assistance_applications"("engagementId");

-- CreateIndex
CREATE INDEX "public_safety_recovery_assistance_applications_status_idx" ON "public_safety_recovery_assistance_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "public_safety_emergency_events_eventReference_key" ON "public_safety_emergency_events"("eventReference");

-- CreateIndex
CREATE INDEX "public_safety_emergency_events_jurisdictionId_idx" ON "public_safety_emergency_events"("jurisdictionId");

-- CreateIndex
CREATE INDEX "public_safety_emergency_events_status_idx" ON "public_safety_emergency_events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "public_safety_official_notices_noticeReference_key" ON "public_safety_official_notices"("noticeReference");

-- CreateIndex
CREATE INDEX "public_safety_official_notices_jurisdictionId_idx" ON "public_safety_official_notices"("jurisdictionId");

-- CreateIndex
CREATE INDEX "public_safety_official_notices_status_idx" ON "public_safety_official_notices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "public_safety_inspection_requests_inspectionReference_key" ON "public_safety_inspection_requests"("inspectionReference");

-- CreateIndex
CREATE INDEX "public_safety_inspection_requests_engagementId_idx" ON "public_safety_inspection_requests"("engagementId");

-- CreateIndex
CREATE INDEX "public_safety_inspection_requests_status_idx" ON "public_safety_inspection_requests"("status");

-- CreateIndex
CREATE INDEX "public_safety_external_dependencies_engagementId_idx" ON "public_safety_external_dependencies"("engagementId");

-- CreateIndex
CREATE INDEX "public_safety_external_dependencies_status_idx" ON "public_safety_external_dependencies"("status");

-- CreateIndex
CREATE INDEX "public_safety_communication_deliveries_engagementId_idx" ON "public_safety_communication_deliveries"("engagementId");

-- CreateIndex
CREATE INDEX "public_safety_communication_deliveries_status_idx" ON "public_safety_communication_deliveries"("status");

-- AddForeignKey
ALTER TABLE "public_safety_engagements" ADD CONSTRAINT "public_safety_engagements_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_engagements" ADD CONSTRAINT "public_safety_engagements_reporterIdentityId_fkey" FOREIGN KEY ("reporterIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_engagements" ADD CONSTRAINT "public_safety_engagements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_engagements" ADD CONSTRAINT "public_safety_engagements_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_service_requests" ADD CONSTRAINT "public_safety_service_requests_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "public_safety_engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_incident_reports" ADD CONSTRAINT "public_safety_incident_reports_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "public_safety_engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_incident_reports" ADD CONSTRAINT "public_safety_incident_reports_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "public_safety_service_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_incident_reports" ADD CONSTRAINT "public_safety_incident_reports_reporterIdentityId_fkey" FOREIGN KEY ("reporterIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_recovery_assistance_applications" ADD CONSTRAINT "public_safety_recovery_assistance_applications_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "public_safety_engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_recovery_assistance_applications" ADD CONSTRAINT "public_safety_recovery_assistance_applications_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "public_safety_service_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_emergency_events" ADD CONSTRAINT "public_safety_emergency_events_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_official_notices" ADD CONSTRAINT "public_safety_official_notices_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_official_notices" ADD CONSTRAINT "public_safety_official_notices_approvedByOfficeholderId_fkey" FOREIGN KEY ("approvedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_official_notices" ADD CONSTRAINT "public_safety_official_notices_publishedByOfficeholderId_fkey" FOREIGN KEY ("publishedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_inspection_requests" ADD CONSTRAINT "public_safety_inspection_requests_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "public_safety_engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_external_dependencies" ADD CONSTRAINT "public_safety_external_dependencies_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "public_safety_engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_safety_communication_deliveries" ADD CONSTRAINT "public_safety_communication_deliveries_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "public_safety_engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
