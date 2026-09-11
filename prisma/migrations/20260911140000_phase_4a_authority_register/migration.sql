-- Phase 4A: Authority Implementation and Control Register foundation

CREATE TYPE "AuthorityClassification" AS ENUM (
  'ABSEZ_OWNED',
  'ABSEZ_DELEGATED',
  'EXPRESSLY_RETAINED_NATIONAL',
  'SHARED_OR_COORDINATED',
  'RESERVED_PROFESSIONAL',
  'ADMINISTRATIVE_SUPPORT',
  'TECHNOLOGY_ASSISTED',
  'PROHIBITED_OR_UNAUTHORIZED'
);

CREATE TYPE "AuthorityLifecycleState" AS ENUM (
  'RECOGNIZED',
  'REVIEWED',
  'ENABLED',
  'TESTED',
  'ACCEPTED',
  'ACTIVE',
  'SUSPENDED',
  'SUPERSEDED'
);

CREATE TYPE "ControlledFunctionClass" AS ENUM (
  'INFORMATION_AND_GUIDANCE',
  'APPLICANT_INTAKE',
  'IDENTITY_VERIFICATION',
  'ELIGIBILITY_SCREENING',
  'COMPLETENESS_REVIEW',
  'EVIDENCE_VERIFICATION',
  'FEE_CALCULATION_AND_COLLECTION',
  'DEPARTMENTAL_ASSESSMENT',
  'GOVERNMENT_REFERRAL',
  'PROFESSIONAL_REVIEW',
  'INSPECTION',
  'RECOMMENDATION',
  'ADMINISTRATIVE_DECISION',
  'EXPRESSLY_RETAINED_NATIONAL_DECISION',
  'ISSUANCE',
  'REGISTRATION',
  'MONITORING',
  'COMPLIANCE_REVIEW',
  'RENEWAL',
  'VARIATION',
  'SUSPENSION',
  'REVOCATION',
  'COMPLAINT',
  'RECONSIDERATION',
  'APPEAL_SUPPORT',
  'REPORTING',
  'RECORDS_MANAGEMENT',
  'ENFORCEMENT_REFERRAL',
  'EMERGENCY_OR_CONTINUITY_ACTION',
  'SERVICE_RETIREMENT'
);

CREATE TABLE "function_authority_records" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "functionClass" "ControlledFunctionClass" NOT NULL,
  "authorityClassification" "AuthorityClassification" NOT NULL,
  "lifecycleState" "AuthorityLifecycleState" NOT NULL DEFAULT 'RECOGNIZED',
  "institutionId" UUID NOT NULL,
  "departmentId" UUID,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "revalidationAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "function_authority_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "function_authority_records_code_key" ON "function_authority_records"("code");
CREATE INDEX "function_authority_records_institutionId_idx" ON "function_authority_records"("institutionId");
CREATE INDEX "function_authority_records_departmentId_idx" ON "function_authority_records"("departmentId");
CREATE INDEX "function_authority_records_lifecycleState_idx" ON "function_authority_records"("lifecycleState");
CREATE INDEX "function_authority_records_authorityClassification_idx" ON "function_authority_records"("authorityClassification");
CREATE INDEX "function_authority_records_functionClass_idx" ON "function_authority_records"("functionClass");

ALTER TABLE "function_authority_records"
  ADD CONSTRAINT "function_authority_records_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "function_authority_records"
  ADD CONSTRAINT "function_authority_records_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
