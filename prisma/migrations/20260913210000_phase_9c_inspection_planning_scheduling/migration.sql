-- Phase 9C: Inspection planning, assignment, and scheduling

CREATE TYPE "InspectionTypeDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'RETIRED');
CREATE TYPE "InspectionPlanTriggerType" AS ENUM (
  'SCHEDULED_PERIODIC',
  'CONDITION_REQUIRED',
  'RENEWAL',
  'CORRECTIVE_ACTION_FOLLOW_UP',
  'INCIDENT',
  'COMPLAINT',
  'RISK_BASED',
  'RANDOMIZED_APPROVED_PROGRAM',
  'GOVERNMENT_REFERRAL',
  'PROFESSIONAL_REFERRAL',
  'OTHER_AUTHORIZED'
);
CREATE TYPE "InspectionPlanStatus" AS ENUM (
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);
CREATE TYPE "InspectionNoticeStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'DELIVERED', 'WAIVED_AUTHORIZED');
CREATE TYPE "InspectionAssignmentStatus" AS ENUM ('ACTIVE', 'ENDED', 'REVOKED', 'CONFLICT_BLOCKED');
CREATE TYPE "InspectorIndependenceStatus" AS ENUM ('INDEPENDENT', 'DECLARED_CONFLICT', 'BLOCKED');
CREATE TYPE "InspectionScheduleEventType" AS ENUM (
  'PLANNED',
  'NOTICE_PREPARED',
  'NOTICE_DELIVERED',
  'RESCHEDULED',
  'CANCELLED',
  'SCOPE_AMENDED_AUTHORIZED'
);

CREATE TABLE "inspection_type_definitions" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "responsibleInstitutionId" UUID NOT NULL,
  "responsibleDepartmentId" UUID,
  "functionAuthorityRecordId" UUID NOT NULL,
  "requiredAuthorityAction" "AuthorityActionType" NOT NULL DEFAULT 'INSPECT',
  "jurisdictionId" UUID NOT NULL,
  "subjectMatter" TEXT NOT NULL,
  "requiredCompetence" TEXT NOT NULL,
  "professionalRequirement" TEXT,
  "noticeRequirement" JSONB NOT NULL DEFAULT '{}',
  "unannouncedAllowed" BOOLEAN NOT NULL DEFAULT false,
  "evidenceRequirements" JSONB NOT NULL DEFAULT '[]',
  "status" "InspectionTypeDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inspection_type_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_plans" (
  "id" UUID NOT NULL,
  "inspectionNumber" TEXT NOT NULL,
  "complianceMatterId" UUID NOT NULL,
  "inspectionTypeDefinitionId" UUID NOT NULL,
  "authorizedConditionId" UUID,
  "functionAuthorityRecordId" UUID NOT NULL,
  "jurisdictionId" UUID NOT NULL,
  "triggerType" "InspectionPlanTriggerType" NOT NULL,
  "triggerReference" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "location" TEXT,
  "scheduledFrom" TIMESTAMP(3),
  "scheduledTo" TIMESTAMP(3),
  "requirementsToExamine" JSONB NOT NULL DEFAULT '[]',
  "evidencePlan" JSONB NOT NULL DEFAULT '[]',
  "safetyRequirements" JSONB NOT NULL DEFAULT '[]',
  "confidentiality" JSONB NOT NULL DEFAULT '{}',
  "noticeStatus" "InspectionNoticeStatus" NOT NULL DEFAULT 'PENDING',
  "riskFactors" JSONB NOT NULL DEFAULT '[]',
  "riskScore" DOUBLE PRECISION,
  "createdByIdentityId" UUID NOT NULL,
  "approvedByIdentityId" UUID,
  "status" "InspectionPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inspection_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_assignments" (
  "id" UUID NOT NULL,
  "inspectionPlanId" UUID NOT NULL,
  "inspectorIdentityId" UUID NOT NULL,
  "officeholderId" UUID NOT NULL,
  "appointmentId" UUID NOT NULL,
  "qualificationReference" TEXT,
  "scope" TEXT NOT NULL,
  "jurisdictionId" UUID NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "conflictDeclaration" TEXT,
  "independenceStatus" "InspectorIndependenceStatus" NOT NULL DEFAULT 'INDEPENDENT',
  "leadInspector" BOOLEAN NOT NULL DEFAULT false,
  "status" "InspectionAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inspection_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspector_qualification_snapshots" (
  "id" UUID NOT NULL,
  "inspectionAssignmentId" UUID NOT NULL,
  "qualification" TEXT NOT NULL,
  "licenseAccreditation" TEXT,
  "competence" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3),
  "scope" TEXT NOT NULL,
  "conflicts" TEXT,
  "independence" TEXT,
  "verifiedByIdentityId" UUID NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inspector_qualification_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_schedule_events" (
  "id" UUID NOT NULL,
  "inspectionPlanId" UUID NOT NULL,
  "eventType" "InspectionScheduleEventType" NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "scopeAtEvent" TEXT NOT NULL,
  "noticeDetails" JSONB,
  "isUnannounced" BOOLEAN NOT NULL DEFAULT false,
  "recordedByIdentityId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inspection_schedule_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inspection_type_definitions_code_key" ON "inspection_type_definitions"("code");
CREATE UNIQUE INDEX "inspection_plans_inspectionNumber_key" ON "inspection_plans"("inspectionNumber");
CREATE UNIQUE INDEX "inspector_qualification_snapshots_inspectionAssignmentId_key" ON "inspector_qualification_snapshots"("inspectionAssignmentId");

CREATE INDEX "inspection_type_definitions_responsibleInstitutionId_idx" ON "inspection_type_definitions"("responsibleInstitutionId");
CREATE INDEX "inspection_type_definitions_jurisdictionId_idx" ON "inspection_type_definitions"("jurisdictionId");
CREATE INDEX "inspection_plans_complianceMatterId_idx" ON "inspection_plans"("complianceMatterId");
CREATE INDEX "inspection_plans_status_idx" ON "inspection_plans"("status");
CREATE INDEX "inspection_assignments_inspectionPlanId_idx" ON "inspection_assignments"("inspectionPlanId");
CREATE INDEX "inspection_schedule_events_inspectionPlanId_idx" ON "inspection_schedule_events"("inspectionPlanId");

ALTER TABLE "inspection_type_definitions" ADD CONSTRAINT "inspection_type_definitions_responsibleInstitutionId_fkey" FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_type_definitions" ADD CONSTRAINT "inspection_type_definitions_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_type_definitions" ADD CONSTRAINT "inspection_type_definitions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_type_definitions" ADD CONSTRAINT "inspection_type_definitions_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspection_plans" ADD CONSTRAINT "inspection_plans_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_plans" ADD CONSTRAINT "inspection_plans_inspectionTypeDefinitionId_fkey" FOREIGN KEY ("inspectionTypeDefinitionId") REFERENCES "inspection_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_plans" ADD CONSTRAINT "inspection_plans_authorizedConditionId_fkey" FOREIGN KEY ("authorizedConditionId") REFERENCES "decision_conditions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_plans" ADD CONSTRAINT "inspection_plans_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_plans" ADD CONSTRAINT "inspection_plans_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_plans" ADD CONSTRAINT "inspection_plans_createdByIdentityId_fkey" FOREIGN KEY ("createdByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_plans" ADD CONSTRAINT "inspection_plans_approvedByIdentityId_fkey" FOREIGN KEY ("approvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_inspectionPlanId_fkey" FOREIGN KEY ("inspectionPlanId") REFERENCES "inspection_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_inspectorIdentityId_fkey" FOREIGN KEY ("inspectorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspector_qualification_snapshots" ADD CONSTRAINT "inspector_qualification_snapshots_inspectionAssignmentId_fkey" FOREIGN KEY ("inspectionAssignmentId") REFERENCES "inspection_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspector_qualification_snapshots" ADD CONSTRAINT "inspector_qualification_snapshots_verifiedByIdentityId_fkey" FOREIGN KEY ("verifiedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspection_schedule_events" ADD CONSTRAINT "inspection_schedule_events_inspectionPlanId_fkey" FOREIGN KEY ("inspectionPlanId") REFERENCES "inspection_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_schedule_events" ADD CONSTRAINT "inspection_schedule_events_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
