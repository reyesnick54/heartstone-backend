-- Phase 4B: Governing source registry and function-source crosswalk

-- CreateEnum
CREATE TYPE "GoverningSourceType" AS ENUM ('LEGISLATION', 'AMENDMENT', 'ORDER', 'GUIDELINE', 'MEMORANDUM', 'IMPLEMENTATION_PROTOCOL', 'EXECUTABLE_ANNEX', 'RESOLUTION', 'DELEGATION_INSTRUMENT', 'APPOINTMENT_INSTRUMENT', 'APPROVED_PROCEDURE', 'GOVERNMENT_DIRECTIVE', 'PROFESSIONAL_REQUIREMENT', 'OTHER_AUTHENTICATED_INSTRUMENT');

-- CreateEnum
CREATE TYPE "SourceAuthenticationStatus" AS ENUM ('UNVERIFIED', 'VERIFICATION_PENDING', 'AUTHENTICATED', 'REJECTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "GoverningSourceStatus" AS ENUM ('IDENTIFIED', 'AUTHENTICATION_PENDING', 'AUTHENTICATED', 'IN_FORCE', 'NOT_YET_EFFECTIVE', 'AMENDED', 'SUPERSEDED', 'REVOKED', 'EXPIRED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "GoverningSourceRelationshipType" AS ENUM ('AMENDS', 'AMENDED_BY', 'SUPERSEDES', 'SUPERSEDED_BY', 'REVOKES', 'REVOKED_BY', 'IMPLEMENTS', 'SUPPLEMENTS', 'INCORPORATES', 'DEPENDENT_ON');

-- CreateEnum
CREATE TYPE "FunctionSourceRelationshipType" AS ENUM ('PRIMARY_BASIS', 'SUPPORTING', 'IMPLEMENTING', 'INTERPRETIVE_GUIDANCE', 'ADMINISTRATIVE_NOTE');

-- CreateEnum
CREATE TYPE "FunctionSourceInterpretationStatus" AS ENUM ('UNRESOLVED', 'RESOLVED', 'CONTESTED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "SourceFoundationValidity" AS ENUM ('VALID', 'UNRESOLVED', 'INVALID', 'EXPIRED', 'SUPERSEDED', 'CONFLICTING');

-- AlterEnum
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'GOVERNING_SOURCE_CREATED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'GOVERNING_SOURCE_STATUS_UPDATED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'GOVERNING_SOURCE_AUTHENTICATION_UPDATED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'GOVERNING_SOURCE_RELATIONSHIP_CREATED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'FUNCTION_GOVERNING_SOURCE_LINKED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'FUNCTION_GOVERNING_SOURCE_UPDATED';

-- CreateTable
CREATE TABLE "governing_sources" (
    "id" UUID NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" "GoverningSourceType" NOT NULL,
    "issuer" TEXT,
    "jurisdictionId" UUID,
    "instrumentDate" DATE,
    "effectiveDate" DATE,
    "commencementDate" DATE,
    "expiryDate" DATE,
    "authenticationStatus" "SourceAuthenticationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "sourceStatus" "GoverningSourceStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "officialLocationRef" TEXT,
    "documentFingerprint" TEXT,
    "classificationMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governing_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governing_source_relationships" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "relatedSourceId" UUID NOT NULL,
    "relationshipType" "GoverningSourceRelationshipType" NOT NULL,
    "effectiveFrom" DATE,
    "effectiveUntil" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governing_source_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "function_governing_sources" (
    "id" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "governingSourceId" UUID NOT NULL,
    "provisionCitation" TEXT,
    "relationshipType" "FunctionSourceRelationshipType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "interpretationStatus" "FunctionSourceInterpretationStatus" NOT NULL DEFAULT 'UNRESOLVED',
    "effectiveFrom" DATE,
    "effectiveUntil" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "function_governing_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "governing_sources_sourceCode_key" ON "governing_sources"("sourceCode");

-- CreateIndex
CREATE INDEX "governing_sources_jurisdictionId_idx" ON "governing_sources"("jurisdictionId");

-- CreateIndex
CREATE INDEX "governing_sources_sourceStatus_idx" ON "governing_sources"("sourceStatus");

-- CreateIndex
CREATE INDEX "governing_sources_authenticationStatus_idx" ON "governing_sources"("authenticationStatus");

-- CreateIndex
CREATE INDEX "governing_source_relationships_sourceId_idx" ON "governing_source_relationships"("sourceId");

-- CreateIndex
CREATE INDEX "governing_source_relationships_relatedSourceId_idx" ON "governing_source_relationships"("relatedSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "governing_source_relationships_sourceId_relatedSourceId_rel_key" ON "governing_source_relationships"("sourceId", "relatedSourceId", "relationshipType");

-- CreateIndex
CREATE INDEX "function_governing_sources_functionAuthorityRecordId_idx" ON "function_governing_sources"("functionAuthorityRecordId");

-- CreateIndex
CREATE INDEX "function_governing_sources_governingSourceId_idx" ON "function_governing_sources"("governingSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "function_governing_sources_functionAuthorityRecordId_governin_key" ON "function_governing_sources"("functionAuthorityRecordId", "governingSourceId", "relationshipType");

-- AddForeignKey
ALTER TABLE "governing_sources" ADD CONSTRAINT "governing_sources_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governing_source_relationships" ADD CONSTRAINT "governing_source_relationships_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "governing_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governing_source_relationships" ADD CONSTRAINT "governing_source_relationships_relatedSourceId_fkey" FOREIGN KEY ("relatedSourceId") REFERENCES "governing_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_governing_sources" ADD CONSTRAINT "function_governing_sources_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_governing_sources" ADD CONSTRAINT "function_governing_sources_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
