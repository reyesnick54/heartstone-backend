-- AlterEnum
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'SERVICE_ELIGIBILITY_RULE_CREATED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'SERVICE_ELIGIBILITY_RULE_UPDATED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'SERVICE_ELIGIBILITY_RULE_PUBLISHED_CHANGE';

-- CreateEnum
CREATE TYPE "GovernmentServiceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "GovernmentServiceVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED', 'ARCHIVED');
CREATE TYPE "ServiceEligibilityRuleCategory" AS ENUM (
  'APPLICANT_CATEGORY',
  'ENTITY_TYPE',
  'RESIDENCY_STATUS',
  'ACTIVITY',
  'LOCATION',
  'GEOGRAPHIC_SCOPE',
  'AGE_OR_THRESHOLD',
  'OWNERSHIP_ATTRIBUTE',
  'EMPLOYER_STATUS',
  'PREREQUISITE_STATUS',
  'REPRESENTATIVE_REQUIREMENT',
  'EXCLUSION',
  'REQUIRED_ATTRIBUTE',
  'OTHER_STRUCTURED_RULE'
);
CREATE TYPE "ServiceEligibilityRuleOperator" AS ENUM (
  'EQUALS',
  'NOT_EQUALS',
  'IN',
  'NOT_IN',
  'EXISTS',
  'NOT_EXISTS',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'CONTAINS'
);
CREATE TYPE "ServiceEligibilityRuleStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'ARCHIVED');
CREATE TYPE "EligibilityGuidanceOutcome" AS ENUM (
  'LIKELY_ELIGIBLE',
  'LIKELY_INELIGIBLE',
  'MORE_INFORMATION_REQUIRED',
  'OUTSIDE_PUBLISHED_SCOPE',
  'REFER_TO_OTHER_SERVICE',
  'UNRESOLVED'
);

-- CreateTable
CREATE TABLE "government_services" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "institutionId" UUID,
    "status" "GovernmentServiceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_service_versions" (
    "id" UUID NOT NULL,
    "governmentServiceId" UUID NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "status" "GovernmentServiceVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "relatedServiceCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dependencyCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_service_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_eligibility_rules" (
    "id" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "category" "ServiceEligibilityRuleCategory" NOT NULL,
    "attributeKey" TEXT NOT NULL,
    "operator" "ServiceEligibilityRuleOperator" NOT NULL,
    "expectedValue" JSONB NOT NULL DEFAULT '{}',
    "reasonCode" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "onFailureOutcome" "EligibilityGuidanceOutcome",
    "status" "ServiceEligibilityRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_eligibility_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_eligibility_rule_audits" (
    "id" UUID NOT NULL,
    "serviceEligibilityRuleId" UUID,
    "governmentServiceVersionId" UUID NOT NULL,
    "actorIdentityId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "previousSnapshot" JSONB,
    "newSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_eligibility_rule_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "government_services_code_key" ON "government_services"("code");
CREATE INDEX "government_services_institutionId_idx" ON "government_services"("institutionId");
CREATE UNIQUE INDEX "government_service_versions_governmentServiceId_versionLabel_key" ON "government_service_versions"("governmentServiceId", "versionLabel");
CREATE INDEX "government_service_versions_governmentServiceId_idx" ON "government_service_versions"("governmentServiceId");
CREATE INDEX "government_service_versions_status_idx" ON "government_service_versions"("status");
CREATE INDEX "service_eligibility_rules_governmentServiceVersionId_idx" ON "service_eligibility_rules"("governmentServiceVersionId");
CREATE INDEX "service_eligibility_rules_status_idx" ON "service_eligibility_rules"("status");
CREATE INDEX "service_eligibility_rule_audits_governmentServiceVersionId_idx" ON "service_eligibility_rule_audits"("governmentServiceVersionId");
CREATE INDEX "service_eligibility_rule_audits_serviceEligibilityRuleId_idx" ON "service_eligibility_rule_audits"("serviceEligibilityRuleId");

-- AddForeignKey
ALTER TABLE "government_services" ADD CONSTRAINT "government_services_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "government_service_versions" ADD CONSTRAINT "government_service_versions_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_eligibility_rules" ADD CONSTRAINT "service_eligibility_rules_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_eligibility_rule_audits" ADD CONSTRAINT "service_eligibility_rule_audits_serviceEligibilityRuleId_fkey" FOREIGN KEY ("serviceEligibilityRuleId") REFERENCES "service_eligibility_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
