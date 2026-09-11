-- Phase 5F: Service Activation and Publication Governance

CREATE TYPE "ServiceTestReadinessStatus" AS ENUM (
  'NOT_TESTED',
  'TESTS_IN_PROGRESS',
  'TECHNICAL_TESTS_PASSED',
  'INSTITUTIONAL_REVIEW_PENDING',
  'INSTITUTIONAL_REVIEW_PASSED'
);

CREATE TYPE "ServiceReadinessLevel" AS ENUM (
  'NOT_READY',
  'TECHNICALLY_READY',
  'INSTITUTIONALLY_ACCEPTED',
  'OPERATIONALLY_ACTIVE'
);

CREATE TYPE "ServiceReadinessCheckOutcome" AS ENUM (
  'PASS',
  'FAIL',
  'REQUIRES_CONFIGURATION',
  'BLOCKED'
);

CREATE TYPE "ServiceActivationOutcome" AS ENUM (
  'ACTIVATED',
  'BLOCKED',
  'REQUIRES_CONFIGURATION',
  'REQUIRES_READINESS',
  'DENIED'
);

ALTER TABLE "government_services"
  ADD COLUMN "ownerOfficeholderId" UUID;

CREATE INDEX "government_services_ownerOfficeholderId_idx"
  ON "government_services"("ownerOfficeholderId");

ALTER TABLE "government_services"
  ADD CONSTRAINT "government_services_ownerOfficeholderId_fkey"
  FOREIGN KEY ("ownerOfficeholderId") REFERENCES "officeholders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "government_service_versions"
  ADD COLUMN "institutionallyAccepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "institutionallyAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "testReadinessStatus" "ServiceTestReadinessStatus" NOT NULL DEFAULT 'NOT_TESTED',
  ADD COLUMN "pilotScopeDescription" TEXT,
  ADD COLUMN "activationFunctionAuthorityRecordId" UUID,
  ADD COLUMN "supersededByVersionId" UUID;

CREATE INDEX "government_service_versions_activationFunctionAuthorityRecordId_idx"
  ON "government_service_versions"("activationFunctionAuthorityRecordId");

ALTER TABLE "government_service_versions"
  ADD CONSTRAINT "government_service_versions_activationFunctionAuthorityRecordId_fkey"
  FOREIGN KEY ("activationFunctionAuthorityRecordId") REFERENCES "function_authority_records"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "government_service_versions"
  ADD CONSTRAINT "government_service_versions_supersededByVersionId_fkey"
  FOREIGN KEY ("supersededByVersionId") REFERENCES "government_service_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "service_activation_records" (
  "id" UUID NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "priorMaturityStatus" "GovernmentServiceMaturityStatus" NOT NULL,
  "newMaturityStatus" "GovernmentServiceMaturityStatus" NOT NULL,
  "priorPublicAvailability" "GovernmentServicePublicAvailability" NOT NULL,
  "newPublicAvailability" "GovernmentServicePublicAvailability" NOT NULL,
  "actorIdentityId" UUID NOT NULL,
  "officeholderId" UUID,
  "authorityEvaluationRecordId" UUID,
  "activationBasis" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "scopeLimitations" JSONB NOT NULL DEFAULT '[]',
  "reason" TEXT,
  "outcome" "ServiceActivationOutcome" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_activation_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_activation_records_governmentServiceVersionId_idx"
  ON "service_activation_records"("governmentServiceVersionId");
CREATE INDEX "service_activation_records_actorIdentityId_idx"
  ON "service_activation_records"("actorIdentityId");
CREATE INDEX "service_activation_records_createdAt_idx"
  ON "service_activation_records"("createdAt");

ALTER TABLE "service_activation_records"
  ADD CONSTRAINT "service_activation_records_governmentServiceVersionId_fkey"
  FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_activation_records"
  ADD CONSTRAINT "service_activation_records_authorityEvaluationRecordId_fkey"
  FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
