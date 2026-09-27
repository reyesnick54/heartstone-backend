-- Remediation S16: operational case management, inspections, corrective actions, renewal monitoring

DO $$ BEGIN ALTER TYPE "CaseEventType" ADD VALUE 'CASE_MANAGER_ASSIGNED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "CaseEventType" ADD VALUE 'CASE_MANAGER_REASSIGNED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TYPE "InspectionStatus" ADD VALUE 'PLANNED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "InspectionStatus" ADD VALUE 'ASSIGNED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "InspectionStatus" ADD VALUE 'FINDINGS_RECORDED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "InspectionStatus" ADD VALUE 'FOLLOW_UP_REQUIRED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "InspectionStatus" ADD VALUE 'CLOSED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TYPE "CaseManagerAssignmentStatus" AS ENUM ('ACTIVE', 'SUPERSEDED');

CREATE TYPE "StrategicProjectOperationalStatus" AS ENUM (
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CLOSED'
);

CREATE TYPE "StrategicProjectCoordinationType" AS ENUM ('DEPENDENCY', 'REFERRAL');

CREATE TYPE "ComplianceCorrectiveActionRegisterStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'REMEDIATION_SUBMITTED',
  'VERIFIED',
  'ESCALATED',
  'CLOSED'
);

CREATE TYPE "InstrumentRenewalMonitoringStatus" AS ENUM (
  'ACTIVE',
  'REMINDER_SENT',
  'RENEWAL_IN_PROGRESS',
  'OVERDUE',
  'CLOSED'
);

CREATE TYPE "OperationalJobRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "case_manager_assignments" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "officeholderId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "departmentId" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "status" "CaseManagerAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "assignedByIdentityId" UUID NOT NULL,
  "supersededById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "case_manager_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "case_manager_assignments_supersededById_key" ON "case_manager_assignments"("supersededById");
CREATE INDEX "case_manager_assignments_caseId_status_idx" ON "case_manager_assignments"("caseId", "status");
CREATE INDEX "case_manager_assignments_officeholderId_status_idx" ON "case_manager_assignments"("officeholderId", "status");
CREATE INDEX "case_manager_assignments_institutionId_departmentId_idx" ON "case_manager_assignments"("institutionId", "departmentId");

ALTER TABLE "case_manager_assignments" ADD CONSTRAINT "case_manager_assignments_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_manager_assignments" ADD CONSTRAINT "case_manager_assignments_officeholderId_fkey"
  FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_manager_assignments" ADD CONSTRAINT "case_manager_assignments_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_manager_assignments" ADD CONSTRAINT "case_manager_assignments_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_manager_assignments" ADD CONSTRAINT "case_manager_assignments_assignedByIdentityId_fkey"
  FOREIGN KEY ("assignedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_manager_assignments" ADD CONSTRAINT "case_manager_assignments_supersededById_fkey"
  FOREIGN KEY ("supersededById") REFERENCES "case_manager_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inspection_records" ADD COLUMN IF NOT EXISTS "serviceAppointmentId" UUID;
ALTER TABLE "inspection_records" ADD COLUMN IF NOT EXISTS "outcome" TEXT;
ALTER TABLE "inspection_records" ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_serviceAppointmentId_fkey"
    FOREIGN KEY ("serviceAppointmentId") REFERENCES "service_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "joint_inspection_participants" (
  "id" UUID NOT NULL,
  "inspectionId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "departmentId" UUID,
  "officeholderId" UUID NOT NULL,
  "identityId" UUID NOT NULL,
  "functionAuthorityRecordId" UUID,
  "mandateSummary" TEXT NOT NULL,
  "participantFindings" TEXT,
  "attributionLabel" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "joint_inspection_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "joint_inspection_participants_inspectionId_institutionId_officeholderId_key"
  ON "joint_inspection_participants"("inspectionId", "institutionId", "officeholderId");
CREATE INDEX "joint_inspection_participants_inspectionId_idx" ON "joint_inspection_participants"("inspectionId");

ALTER TABLE "joint_inspection_participants" ADD CONSTRAINT "joint_inspection_participants_inspectionId_fkey"
  FOREIGN KEY ("inspectionId") REFERENCES "inspection_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "joint_inspection_participants" ADD CONSTRAINT "joint_inspection_participants_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "joint_inspection_participants" ADD CONSTRAINT "joint_inspection_participants_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "joint_inspection_participants" ADD CONSTRAINT "joint_inspection_participants_officeholderId_fkey"
  FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "joint_inspection_participants" ADD CONSTRAINT "joint_inspection_participants_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "joint_inspection_participants" ADD CONSTRAINT "joint_inspection_participants_functionAuthorityRecordId_fkey"
  FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "compliance_corrective_action_registers" (
  "id" UUID NOT NULL,
  "correctiveActionReference" TEXT NOT NULL,
  "complianceMatterId" UUID,
  "inspectionRecordId" UUID,
  "originatingFindingReference" TEXT,
  "responsibleIdentityId" UUID,
  "responsibleOrganizationId" UUID,
  "requiredAction" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" "ComplianceCorrectiveActionRegisterStatus" NOT NULL DEFAULT 'OPEN',
  "remediationEvidenceRecordIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "reviewerOfficeholderId" UUID,
  "reviewerIdentityId" UUID,
  "verifiedAt" TIMESTAMP(3),
  "verificationEvidenceRecordIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "escalationReference" TEXT,
  "closedAt" TIMESTAMP(3),
  "createdByIdentityId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "compliance_corrective_action_registers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "compliance_corrective_action_registers_correctiveActionReference_key"
  ON "compliance_corrective_action_registers"("correctiveActionReference");
CREATE INDEX "compliance_corrective_action_registers_status_idx" ON "compliance_corrective_action_registers"("status");
CREATE INDEX "compliance_corrective_action_registers_complianceMatterId_idx" ON "compliance_corrective_action_registers"("complianceMatterId");
CREATE INDEX "compliance_corrective_action_registers_inspectionRecordId_idx" ON "compliance_corrective_action_registers"("inspectionRecordId");

ALTER TABLE "compliance_corrective_action_registers" ADD CONSTRAINT "compliance_corrective_action_registers_complianceMatterId_fkey"
  FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_corrective_action_registers" ADD CONSTRAINT "compliance_corrective_action_registers_inspectionRecordId_fkey"
  FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_corrective_action_registers" ADD CONSTRAINT "compliance_corrective_action_registers_responsibleIdentityId_fkey"
  FOREIGN KEY ("responsibleIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_corrective_action_registers" ADD CONSTRAINT "compliance_corrective_action_registers_responsibleOrganizationId_fkey"
  FOREIGN KEY ("responsibleOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_corrective_action_registers" ADD CONSTRAINT "compliance_corrective_action_registers_reviewerOfficeholderId_fkey"
  FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_corrective_action_registers" ADD CONSTRAINT "compliance_corrective_action_registers_reviewerIdentityId_fkey"
  FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_corrective_action_registers" ADD CONSTRAINT "compliance_corrective_action_registers_createdByIdentityId_fkey"
  FOREIGN KEY ("createdByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "strategic_project_profiles" ADD COLUMN IF NOT EXISTS "primaryInvestorOrganizationId" UUID;
ALTER TABLE "strategic_project_profiles" ADD COLUMN IF NOT EXISTS "currentCaseManagerAssignmentId" UUID;
ALTER TABLE "strategic_project_profiles" ADD COLUMN IF NOT EXISTS "operationalStatus" "StrategicProjectOperationalStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "strategic_project_profiles" ADD COLUMN IF NOT EXISTS "readinessEvidencePacketId" UUID;

ALTER TABLE "strategic_project_profiles" ADD CONSTRAINT "strategic_project_profiles_primaryInvestorOrganizationId_fkey"
  FOREIGN KEY ("primaryInvestorOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategic_project_profiles" ADD CONSTRAINT "strategic_project_profiles_currentCaseManagerAssignmentId_fkey"
  FOREIGN KEY ("currentCaseManagerAssignmentId") REFERENCES "case_manager_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategic_project_profiles" ADD CONSTRAINT "strategic_project_profiles_readinessEvidencePacketId_fkey"
  FOREIGN KEY ("readinessEvidencePacketId") REFERENCES "evidence_packets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "strategic_project_case_links" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "linkRole" TEXT NOT NULL DEFAULT 'RELATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "strategic_project_case_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "strategic_project_case_links_profileId_caseId_key" ON "strategic_project_case_links"("profileId", "caseId");
ALTER TABLE "strategic_project_case_links" ADD CONSTRAINT "strategic_project_case_links_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_project_case_links" ADD CONSTRAINT "strategic_project_case_links_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "strategic_project_organization_links" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "participationRole" TEXT NOT NULL DEFAULT 'PARTICIPANT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "strategic_project_organization_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "strategic_project_organization_links_profileId_organizationId_key"
  ON "strategic_project_organization_links"("profileId", "organizationId");
ALTER TABLE "strategic_project_organization_links" ADD CONSTRAINT "strategic_project_organization_links_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_project_organization_links" ADD CONSTRAINT "strategic_project_organization_links_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "strategic_project_service_links" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "governmentServiceId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "strategic_project_service_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "strategic_project_service_links_profileId_governmentServiceId_key"
  ON "strategic_project_service_links"("profileId", "governmentServiceId");
ALTER TABLE "strategic_project_service_links" ADD CONSTRAINT "strategic_project_service_links_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_project_service_links" ADD CONSTRAINT "strategic_project_service_links_governmentServiceId_fkey"
  FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "strategic_project_instrument_links" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "officialInstrumentId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "strategic_project_instrument_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "strategic_project_instrument_links_profileId_officialInstrumentId_key"
  ON "strategic_project_instrument_links"("profileId", "officialInstrumentId");
ALTER TABLE "strategic_project_instrument_links" ADD CONSTRAINT "strategic_project_instrument_links_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_project_instrument_links" ADD CONSTRAINT "strategic_project_instrument_links_officialInstrumentId_fkey"
  FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "strategic_project_referral_links" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "caseReferralId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "strategic_project_referral_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "strategic_project_referral_links_profileId_caseReferralId_key"
  ON "strategic_project_referral_links"("profileId", "caseReferralId");
ALTER TABLE "strategic_project_referral_links" ADD CONSTRAINT "strategic_project_referral_links_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_project_referral_links" ADD CONSTRAINT "strategic_project_referral_links_caseReferralId_fkey"
  FOREIGN KEY ("caseReferralId") REFERENCES "case_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "strategic_project_institution_coordinations" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "sourceInstitutionId" UUID NOT NULL,
  "targetInstitutionId" UUID NOT NULL,
  "sourceDepartmentId" UUID,
  "targetDepartmentId" UUID,
  "coordinationType" "StrategicProjectCoordinationType" NOT NULL,
  "scopeSummary" TEXT NOT NULL,
  "doesNotExtendReceivingMandate" BOOLEAN NOT NULL DEFAULT true,
  "caseReferralId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "strategic_project_institution_coordinations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "strategic_project_institution_coordinations_profileId_idx"
  ON "strategic_project_institution_coordinations"("profileId");
ALTER TABLE "strategic_project_institution_coordinations" ADD CONSTRAINT "strategic_project_institution_coordinations_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_project_institution_coordinations" ADD CONSTRAINT "strategic_project_institution_coordinations_sourceInstitutionId_fkey"
  FOREIGN KEY ("sourceInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "strategic_project_institution_coordinations" ADD CONSTRAINT "strategic_project_institution_coordinations_targetInstitutionId_fkey"
  FOREIGN KEY ("targetInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "strategic_project_institution_coordinations" ADD CONSTRAINT "strategic_project_institution_coordinations_sourceDepartmentId_fkey"
  FOREIGN KEY ("sourceDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategic_project_institution_coordinations" ADD CONSTRAINT "strategic_project_institution_coordinations_targetDepartmentId_fkey"
  FOREIGN KEY ("targetDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategic_project_institution_coordinations" ADD CONSTRAINT "strategic_project_institution_coordinations_caseReferralId_fkey"
  FOREIGN KEY ("caseReferralId") REFERENCES "case_referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "instrument_renewal_monitoring_schedules" (
  "id" UUID NOT NULL,
  "instrumentId" UUID NOT NULL,
  "expirationDate" TIMESTAMP(3) NOT NULL,
  "eligibilityWindowStart" TIMESTAMP(3),
  "eligibilityWindowEnd" TIMESTAMP(3),
  "renewalApplicationId" UUID,
  "monitoringStatus" "InstrumentRenewalMonitoringStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastReminderAt" TIMESTAMP(3),
  "overdueMarkedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "instrument_renewal_monitoring_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "instrument_renewal_monitoring_schedules_instrumentId_key"
  ON "instrument_renewal_monitoring_schedules"("instrumentId");
CREATE INDEX "instrument_renewal_monitoring_schedules_monitoringStatus_idx"
  ON "instrument_renewal_monitoring_schedules"("monitoringStatus");
CREATE INDEX "instrument_renewal_monitoring_schedules_expirationDate_idx"
  ON "instrument_renewal_monitoring_schedules"("expirationDate");

ALTER TABLE "instrument_renewal_monitoring_schedules" ADD CONSTRAINT "instrument_renewal_monitoring_schedules_instrumentId_fkey"
  FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instrument_renewal_monitoring_schedules" ADD CONSTRAINT "instrument_renewal_monitoring_schedules_renewalApplicationId_fkey"
  FOREIGN KEY ("renewalApplicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "instrument_renewal_reminders" (
  "id" UUID NOT NULL,
  "scheduleId" UUID NOT NULL,
  "communicationMessageId" UUID,
  "reminderKind" TEXT NOT NULL,
  "remindedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instrument_renewal_reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "instrument_renewal_reminders_scheduleId_idx" ON "instrument_renewal_reminders"("scheduleId");
ALTER TABLE "instrument_renewal_reminders" ADD CONSTRAINT "instrument_renewal_reminders_scheduleId_fkey"
  FOREIGN KEY ("scheduleId") REFERENCES "instrument_renewal_monitoring_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instrument_renewal_reminders" ADD CONSTRAINT "instrument_renewal_reminders_communicationMessageId_fkey"
  FOREIGN KEY ("communicationMessageId") REFERENCES "communication_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "operational_job_definitions" (
  "id" UUID NOT NULL,
  "jobCode" TEXT NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "intervalMs" INTEGER NOT NULL,
  "lastRunAt" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operational_job_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operational_job_definitions_jobCode_key" ON "operational_job_definitions"("jobCode");

CREATE TABLE "operational_job_runs" (
  "id" UUID NOT NULL,
  "jobDefinitionId" UUID NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "status" "OperationalJobRunStatus" NOT NULL DEFAULT 'RUNNING',
  "resultSummary" TEXT,
  "errorMessage" TEXT,
  CONSTRAINT "operational_job_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operational_job_runs_jobDefinitionId_startedAt_idx" ON "operational_job_runs"("jobDefinitionId", "startedAt");
ALTER TABLE "operational_job_runs" ADD CONSTRAINT "operational_job_runs_jobDefinitionId_fkey"
  FOREIGN KEY ("jobDefinitionId") REFERENCES "operational_job_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "operational_job_definitions" ("id", "jobCode", "description", "enabled", "intervalMs", "nextRunAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'INSTRUMENT_RENEWAL_REMINDERS',
  'Send renewal eligibility reminders; does not renew instruments',
  true,
  3600000,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
