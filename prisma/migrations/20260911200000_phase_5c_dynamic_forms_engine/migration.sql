-- Phase 5C: Dynamic Versioned Forms Engine (extends Phase 5G form stubs)

CREATE TYPE "FormDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "FormFieldType" AS ENUM (
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'INTEGER',
  'DECIMAL',
  'DATE',
  'DATETIME',
  'BOOLEAN',
  'SELECT',
  'MULTISELECT',
  'RADIO',
  'CHECKBOX',
  'EMAIL',
  'PHONE',
  'COUNTRY',
  'CURRENCY',
  'ADDRESS',
  'IDENTIFIER',
  'FILE_REFERENCE',
  'DECLARATION',
  'INFORMATION_DISPLAY'
);
CREATE TYPE "FormDataClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'RESTRICTED', 'SENSITIVE');
CREATE TYPE "FormConditionalAction" AS ENUM ('SHOW', 'HIDE', 'REQUIRE', 'OPTIONAL');
CREATE TYPE "FormConditionalLogic" AS ENUM ('AND', 'OR');
CREATE TYPE "FormConditionalOperator" AS ENUM (
  'EQUALS',
  'NOT_EQUALS',
  'IN',
  'NOT_IN',
  'IS_EMPTY',
  'IS_NOT_EMPTY',
  'GREATER_THAN',
  'LESS_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN_OR_EQUAL'
);

ALTER TYPE "FormVersionStatus" RENAME VALUE 'ACTIVE' TO 'PUBLISHED';
ALTER TYPE "FormVersionStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "form_definitions"
  ADD COLUMN "purpose" TEXT,
  ADD COLUMN "governmentServiceVersionId" UUID,
  ADD COLUMN "status" "FormDefinitionStatus" NOT NULL DEFAULT 'DRAFT';

ALTER TABLE "form_versions" DROP CONSTRAINT IF EXISTS "form_versions_formDefinitionId_fkey";
ALTER TABLE "government_service_versions" DROP CONSTRAINT IF EXISTS "government_service_versions_formVersionId_fkey";

DROP TABLE IF EXISTS "form_versions";

CREATE TABLE "form_versions" (
  "id" UUID NOT NULL,
  "formDefinitionId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "title" JSONB NOT NULL,
  "instructions" JSONB,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "status" "FormVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "supersededById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "form_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "form_sections" (
  "id" UUID NOT NULL,
  "formVersionId" UUID NOT NULL,
  "sectionKey" TEXT NOT NULL,
  "title" JSONB NOT NULL,
  "description" JSONB,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "form_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "form_fields" (
  "id" UUID NOT NULL,
  "formSectionId" UUID NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "label" JSONB NOT NULL,
  "description" JSONB,
  "fieldType" "FormFieldType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL,
  "defaultValue" JSONB,
  "placeholder" JSONB,
  "dataClassification" "FormDataClassification" NOT NULL DEFAULT 'PUBLIC',
  "validationDefinition" JSONB NOT NULL DEFAULT '{}',
  "options" JSONB,
  "sourceMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "form_field_conditional_rules" (
  "id" UUID NOT NULL,
  "formFieldId" UUID NOT NULL,
  "action" "FormConditionalAction" NOT NULL,
  "conditions" JSONB NOT NULL,
  "logic" "FormConditionalLogic" NOT NULL DEFAULT 'AND',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "form_field_conditional_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "form_versions_formDefinitionId_version_key" ON "form_versions"("formDefinitionId", "version");
CREATE INDEX "form_versions_formDefinitionId_idx" ON "form_versions"("formDefinitionId");
CREATE INDEX "form_versions_status_idx" ON "form_versions"("status");
CREATE UNIQUE INDEX "form_sections_formVersionId_sectionKey_key" ON "form_sections"("formVersionId", "sectionKey");
CREATE INDEX "form_sections_formVersionId_idx" ON "form_sections"("formVersionId");
CREATE UNIQUE INDEX "form_fields_formSectionId_fieldKey_key" ON "form_fields"("formSectionId", "fieldKey");
CREATE INDEX "form_fields_formSectionId_idx" ON "form_fields"("formSectionId");
CREATE INDEX "form_field_conditional_rules_formFieldId_idx" ON "form_field_conditional_rules"("formFieldId");
CREATE INDEX "form_definitions_governmentServiceVersionId_idx" ON "form_definitions"("governmentServiceVersionId");
CREATE INDEX "form_definitions_status_idx" ON "form_definitions"("status");

ALTER TABLE "form_definitions"
  ADD CONSTRAINT "form_definitions_governmentServiceVersionId_fkey"
  FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "form_versions"
  ADD CONSTRAINT "form_versions_formDefinitionId_fkey"
  FOREIGN KEY ("formDefinitionId") REFERENCES "form_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "form_versions"
  ADD CONSTRAINT "form_versions_supersededById_fkey"
  FOREIGN KEY ("supersededById") REFERENCES "form_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "form_sections"
  ADD CONSTRAINT "form_sections_formVersionId_fkey"
  FOREIGN KEY ("formVersionId") REFERENCES "form_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "form_fields"
  ADD CONSTRAINT "form_fields_formSectionId_fkey"
  FOREIGN KEY ("formSectionId") REFERENCES "form_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "form_field_conditional_rules"
  ADD CONSTRAINT "form_field_conditional_rules_formFieldId_fkey"
  FOREIGN KEY ("formFieldId") REFERENCES "form_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "government_service_versions"
  ADD CONSTRAINT "government_service_versions_formVersionId_fkey"
  FOREIGN KEY ("formVersionId") REFERENCES "form_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
