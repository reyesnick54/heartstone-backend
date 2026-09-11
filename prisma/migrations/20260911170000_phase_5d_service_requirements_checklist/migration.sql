-- Phase 5D: Service Requirements and Conditional Checklist Engine

CREATE TYPE "GovernmentServiceLifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "GovernmentServiceVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED', 'RETIRED');
CREATE TYPE "FormVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');
CREATE TYPE "DeclarationVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');
CREATE TYPE "ServiceRequirementType" AS ENUM (
  'INFORMATION',
  'FORM_FIELD',
  'IDENTITY',
  'REPRESENTATION',
  'DOCUMENT',
  'EVIDENCE',
  'DECLARATION',
  'FEE',
  'PREREQUISITE',
  'PROFESSIONAL_DOCUMENT',
  'EXTERNAL_DETERMINATION',
  'OTHER_STRUCTURED_REQUIREMENT'
);
CREATE TYPE "ServiceRequirementMandatoryStatus" AS ENUM ('MANDATORY', 'CONDITIONAL', 'OPTIONAL');
CREATE TYPE "ServiceRequirementEffectiveState" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'EXPIRED');
CREATE TYPE "EvidenceQualityExpectation" AS ENUM (
  'SUBMITTED',
  'ORIGINAL_REQUIRED',
  'CERTIFIED_COPY_REQUIRED',
  'VERIFICATION_REQUIRED',
  'PROFESSIONAL_VALIDATION_REQUIRED',
  'EXTERNAL_CONFIRMATION_REQUIRED'
);
CREATE TYPE "StructuredApplicabilityRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');
CREATE TYPE "StructuredApplicabilityRuleType" AS ENUM (
  'FACT_EQUALS',
  'FACT_NOT_EQUALS',
  'FACT_IN',
  'FACT_NOT_IN',
  'FACT_PRESENT',
  'FACT_NOT_PRESENT',
  'ALL_OF',
  'ANY_OF'
);

CREATE TABLE "government_services" (
  "id" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "lifecycleStatus" "GovernmentServiceLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "government_services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "government_service_versions" (
  "id" UUID NOT NULL,
  "governmentServiceId" UUID NOT NULL,
  "versionLabel" TEXT NOT NULL,
  "status" "GovernmentServiceVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "isImmutable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "government_service_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "form_definitions" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "form_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "form_versions" (
  "id" UUID NOT NULL,
  "formDefinitionId" UUID NOT NULL,
  "versionLabel" TEXT NOT NULL,
  "status" "FormVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "isImmutable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "form_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "form_fields" (
  "id" UUID NOT NULL,
  "formVersionId" UUID NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "fieldType" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "configuration" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "declaration_definitions" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "declaration_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "declaration_definition_versions" (
  "id" UUID NOT NULL,
  "declarationDefinitionId" UUID NOT NULL,
  "versionLabel" TEXT NOT NULL,
  "declarationText" TEXT NOT NULL,
  "status" "DeclarationVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "isImmutable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "declaration_definition_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "structured_applicability_rules" (
  "id" UUID NOT NULL,
  "serviceVersionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "ruleType" "StructuredApplicabilityRuleType" NOT NULL,
  "configuration" JSONB NOT NULL DEFAULT '{}',
  "status" "StructuredApplicabilityRuleStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "structured_applicability_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_requirements" (
  "id" UUID NOT NULL,
  "serviceVersionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "publicDescription" TEXT,
  "requirementType" "ServiceRequirementType" NOT NULL,
  "mandatoryStatus" "ServiceRequirementMandatoryStatus" NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "effectiveState" "ServiceRequirementEffectiveState" NOT NULL DEFAULT 'DRAFT',
  "sourceReference" TEXT,
  "governingSourceId" UUID,
  "verificationRequired" BOOLEAN NOT NULL DEFAULT false,
  "validityExpectationDays" INTEGER,
  "evidenceQualityExpectation" "EvidenceQualityExpectation",
  "applicabilityRuleId" UUID,
  "formDefinitionId" UUID,
  "formVersionId" UUID,
  "formFieldId" UUID,
  "declarationDefinitionId" UUID,
  "declarationDefinitionVersionId" UUID,
  "configuration" JSONB NOT NULL DEFAULT '{}',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_requirements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "government_services_institutionId_code_key" ON "government_services"("institutionId", "code");
CREATE INDEX "government_services_institutionId_idx" ON "government_services"("institutionId");
CREATE INDEX "government_services_lifecycleStatus_idx" ON "government_services"("lifecycleStatus");

CREATE UNIQUE INDEX "government_service_versions_governmentServiceId_versionLabel_key" ON "government_service_versions"("governmentServiceId", "versionLabel");
CREATE INDEX "government_service_versions_governmentServiceId_idx" ON "government_service_versions"("governmentServiceId");
CREATE INDEX "government_service_versions_status_idx" ON "government_service_versions"("status");

CREATE UNIQUE INDEX "form_definitions_code_key" ON "form_definitions"("code");

CREATE UNIQUE INDEX "form_versions_formDefinitionId_versionLabel_key" ON "form_versions"("formDefinitionId", "versionLabel");
CREATE INDEX "form_versions_formDefinitionId_idx" ON "form_versions"("formDefinitionId");
CREATE INDEX "form_versions_status_idx" ON "form_versions"("status");

CREATE UNIQUE INDEX "form_fields_formVersionId_fieldKey_key" ON "form_fields"("formVersionId", "fieldKey");
CREATE INDEX "form_fields_formVersionId_idx" ON "form_fields"("formVersionId");

CREATE UNIQUE INDEX "declaration_definitions_code_key" ON "declaration_definitions"("code");

CREATE UNIQUE INDEX "declaration_definition_versions_declarationDefinitionId_versionLabel_key" ON "declaration_definition_versions"("declarationDefinitionId", "versionLabel");
CREATE INDEX "declaration_definition_versions_declarationDefinitionId_idx" ON "declaration_definition_versions"("declarationDefinitionId");
CREATE INDEX "declaration_definition_versions_status_idx" ON "declaration_definition_versions"("status");

CREATE UNIQUE INDEX "structured_applicability_rules_serviceVersionId_code_key" ON "structured_applicability_rules"("serviceVersionId", "code");
CREATE INDEX "structured_applicability_rules_serviceVersionId_idx" ON "structured_applicability_rules"("serviceVersionId");
CREATE INDEX "structured_applicability_rules_status_idx" ON "structured_applicability_rules"("status");

CREATE UNIQUE INDEX "service_requirements_serviceVersionId_code_key" ON "service_requirements"("serviceVersionId", "code");
CREATE INDEX "service_requirements_serviceVersionId_idx" ON "service_requirements"("serviceVersionId");
CREATE INDEX "service_requirements_effectiveState_idx" ON "service_requirements"("effectiveState");
CREATE INDEX "service_requirements_governingSourceId_idx" ON "service_requirements"("governingSourceId");
CREATE INDEX "service_requirements_applicabilityRuleId_idx" ON "service_requirements"("applicabilityRuleId");

ALTER TABLE "government_services" ADD CONSTRAINT "government_services_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "government_service_versions" ADD CONSTRAINT "government_service_versions_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_formDefinitionId_fkey" FOREIGN KEY ("formDefinitionId") REFERENCES "form_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "form_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "declaration_definition_versions" ADD CONSTRAINT "declaration_definition_versions_declarationDefinitionId_fkey" FOREIGN KEY ("declarationDefinitionId") REFERENCES "declaration_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "structured_applicability_rules" ADD CONSTRAINT "structured_applicability_rules_serviceVersionId_fkey" FOREIGN KEY ("serviceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_requirements" ADD CONSTRAINT "service_requirements_serviceVersionId_fkey" FOREIGN KEY ("serviceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_requirements" ADD CONSTRAINT "service_requirements_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_requirements" ADD CONSTRAINT "service_requirements_applicabilityRuleId_fkey" FOREIGN KEY ("applicabilityRuleId") REFERENCES "structured_applicability_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_requirements" ADD CONSTRAINT "service_requirements_formDefinitionId_fkey" FOREIGN KEY ("formDefinitionId") REFERENCES "form_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_requirements" ADD CONSTRAINT "service_requirements_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "form_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_requirements" ADD CONSTRAINT "service_requirements_formFieldId_fkey" FOREIGN KEY ("formFieldId") REFERENCES "form_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_requirements" ADD CONSTRAINT "service_requirements_declarationDefinitionId_fkey" FOREIGN KEY ("declarationDefinitionId") REFERENCES "declaration_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_requirements" ADD CONSTRAINT "service_requirements_declarationDefinitionVersionId_fkey" FOREIGN KEY ("declarationDefinitionVersionId") REFERENCES "declaration_definition_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
