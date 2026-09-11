-- CreateEnum
CREATE TYPE "ServiceLifecycleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ServiceDataClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "ServiceFeeCalculationType" AS ENUM ('FIXED', 'PERCENTAGE', 'TIERED', 'FORMULA_REFERENCE', 'VARIABLE_BY_CLASSIFICATION', 'EXTERNAL_FEE', 'NO_FEE');

-- CreateEnum
CREATE TYPE "ServiceFeeRefundability" AS ENUM ('REFUNDABLE', 'NON_REFUNDABLE', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "ServiceOperatingMetadataStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ServiceLevelTargetType" AS ENUM ('INITIAL_ACKNOWLEDGMENT', 'FULL_PROCESSING', 'DECISION_ISSUANCE', 'APPEAL_RESPONSE', 'EXTERNAL_DEPENDENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceLevelClockBasis" AS ENUM ('ELAPSED_TIME', 'BUSINESS_PROCESSING', 'WAITING_ON_APPLICANT', 'WAITING_ON_EXTERNAL');

-- CreateEnum
CREATE TYPE "ServiceLevelDayBasis" AS ENUM ('CALENDAR_DAYS', 'BUSINESS_DAYS');

-- CreateEnum
CREATE TYPE "ServiceLevelDurationUnit" AS ENUM ('HOURS', 'DAYS', 'WEEKS', 'MONTHS');

-- CreateEnum
CREATE TYPE "ServiceDependencyType" AS ENUM ('GOVERNMENT', 'PROFESSIONAL', 'UTILITY', 'REGISTRY', 'VENDOR', 'PARTNER', 'PAYMENT', 'IDENTITY', 'INTEGRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceOutputType" AS ENUM ('ACKNOWLEDGMENT', 'NOTICE', 'CERTIFICATE', 'LICENSE', 'PERMIT', 'REGISTRATION', 'REFERRAL', 'REPORT', 'DECISION', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceRedressRouteType" AS ENUM ('CORRECTION', 'COMPLAINT', 'RECONSIDERATION', 'ADMINISTRATIVE_REVIEW', 'APPEAL', 'EXTERNAL_REVIEW', 'JUDICIAL_REVIEW_INFORMATION', 'OTHER');

-- CreateTable
CREATE TABLE "government_services" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "responsibleInstitutionId" UUID NOT NULL,
    "status" "ServiceLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_versions" (
    "id" UUID NOT NULL,
    "governmentServiceId" UUID NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "status" "ServiceLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "dataClassification" "ServiceDataClassification" NOT NULL DEFAULT 'PUBLIC',
    "identityAssuranceExpectation" "AssuranceLevel",
    "sensitiveDataIndicator" BOOLEAN NOT NULL DEFAULT false,
    "manualFallbackDescription" TEXT,
    "manualFallbackReference" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_fee_definitions" (
    "id" UUID NOT NULL,
    "serviceVersionId" UUID NOT NULL,
    "feeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL,
    "calculationType" "ServiceFeeCalculationType" NOT NULL,
    "fixedAmount" DECIMAL(18,4),
    "calculationConfiguration" JSONB NOT NULL DEFAULT '{}',
    "governingSourceId" UUID NOT NULL,
    "collectingInstitutionId" UUID NOT NULL,
    "refundability" "ServiceFeeRefundability" NOT NULL,
    "waiverReductionAvailable" BOOLEAN NOT NULL DEFAULT false,
    "waiverAuthorityFunctionId" UUID,
    "isExternalProfessionalFee" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "status" "ServiceOperatingMetadataStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_fee_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_level_targets" (
    "id" UUID NOT NULL,
    "serviceVersionId" UUID NOT NULL,
    "targetType" "ServiceLevelTargetType" NOT NULL,
    "targetDurationValue" INTEGER NOT NULL,
    "targetDurationUnit" "ServiceLevelDurationUnit" NOT NULL,
    "clockBasis" "ServiceLevelClockBasis" NOT NULL,
    "dayBasis" "ServiceLevelDayBasis" NOT NULL,
    "startEventDescription" TEXT NOT NULL,
    "startEventReference" TEXT,
    "pausable" BOOLEAN NOT NULL DEFAULT false,
    "approvedPauseReasons" JSONB NOT NULL DEFAULT '[]',
    "externalDependencyTreatment" TEXT,
    "escalationThreshold" TEXT,
    "governingSourceId" UUID,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "status" "ServiceOperatingMetadataStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_level_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_dependency_definitions" (
    "id" UUID NOT NULL,
    "serviceVersionId" UUID NOT NULL,
    "dependencyType" "ServiceDependencyType" NOT NULL,
    "authorityDependencyId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "externalEntityLabel" TEXT,
    "operationalNotes" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "status" "ServiceOperatingMetadataStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_dependency_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_output_definitions" (
    "id" UUID NOT NULL,
    "serviceVersionId" UUID NOT NULL,
    "outputType" "ServiceOutputType" NOT NULL,
    "publicName" TEXT NOT NULL,
    "description" TEXT,
    "issuingInstitutionId" UUID,
    "expectedValidityDescription" TEXT,
    "renewalRequired" BOOLEAN NOT NULL DEFAULT false,
    "authorityFunctionId" UUID,
    "electronicIssuanceEligible" BOOLEAN NOT NULL DEFAULT false,
    "electronicIssuanceMetadata" JSONB NOT NULL DEFAULT '{}',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "status" "ServiceOperatingMetadataStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_output_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_redress_routes" (
    "id" UUID NOT NULL,
    "serviceVersionId" UUID NOT NULL,
    "routeType" "ServiceRedressRouteType" NOT NULL,
    "routeName" TEXT NOT NULL,
    "description" TEXT,
    "responsibleInstitutionId" UUID,
    "deadlineDescription" TEXT,
    "governingSourceId" UUID,
    "independenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "contactChannelMetadata" JSONB NOT NULL DEFAULT '{}',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "status" "ServiceOperatingMetadataStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_redress_routes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "government_services_code_key" ON "government_services"("code");

-- CreateIndex
CREATE INDEX "government_services_responsibleInstitutionId_idx" ON "government_services"("responsibleInstitutionId");

-- CreateIndex
CREATE INDEX "service_versions_governmentServiceId_idx" ON "service_versions"("governmentServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "service_versions_governmentServiceId_versionLabel_key" ON "service_versions"("governmentServiceId", "versionLabel");

-- CreateIndex
CREATE INDEX "service_fee_definitions_serviceVersionId_idx" ON "service_fee_definitions"("serviceVersionId");

-- CreateIndex
CREATE INDEX "service_fee_definitions_governingSourceId_idx" ON "service_fee_definitions"("governingSourceId");

-- CreateIndex
CREATE INDEX "service_fee_definitions_collectingInstitutionId_idx" ON "service_fee_definitions"("collectingInstitutionId");

-- CreateIndex
CREATE UNIQUE INDEX "service_fee_definitions_serviceVersionId_feeCode_effectiveFrom_key" ON "service_fee_definitions"("serviceVersionId", "feeCode", "effectiveFrom");

-- CreateIndex
CREATE INDEX "service_level_targets_serviceVersionId_idx" ON "service_level_targets"("serviceVersionId");

-- CreateIndex
CREATE INDEX "service_level_targets_governingSourceId_idx" ON "service_level_targets"("governingSourceId");

-- CreateIndex
CREATE INDEX "service_dependency_definitions_serviceVersionId_idx" ON "service_dependency_definitions"("serviceVersionId");

-- CreateIndex
CREATE INDEX "service_dependency_definitions_authorityDependencyId_idx" ON "service_dependency_definitions"("authorityDependencyId");

-- CreateIndex
CREATE INDEX "service_output_definitions_serviceVersionId_idx" ON "service_output_definitions"("serviceVersionId");

-- CreateIndex
CREATE INDEX "service_output_definitions_issuingInstitutionId_idx" ON "service_output_definitions"("issuingInstitutionId");

-- CreateIndex
CREATE INDEX "service_output_definitions_authorityFunctionId_idx" ON "service_output_definitions"("authorityFunctionId");

-- CreateIndex
CREATE INDEX "service_redress_routes_serviceVersionId_idx" ON "service_redress_routes"("serviceVersionId");

-- CreateIndex
CREATE INDEX "service_redress_routes_responsibleInstitutionId_idx" ON "service_redress_routes"("responsibleInstitutionId");

-- CreateIndex
CREATE INDEX "service_redress_routes_governingSourceId_idx" ON "service_redress_routes"("governingSourceId");

-- AddForeignKey
ALTER TABLE "government_services" ADD CONSTRAINT "government_services_responsibleInstitutionId_fkey" FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_versions" ADD CONSTRAINT "service_versions_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_fee_definitions" ADD CONSTRAINT "service_fee_definitions_serviceVersionId_fkey" FOREIGN KEY ("serviceVersionId") REFERENCES "service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_fee_definitions" ADD CONSTRAINT "service_fee_definitions_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_fee_definitions" ADD CONSTRAINT "service_fee_definitions_collectingInstitutionId_fkey" FOREIGN KEY ("collectingInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_fee_definitions" ADD CONSTRAINT "service_fee_definitions_waiverAuthorityFunctionId_fkey" FOREIGN KEY ("waiverAuthorityFunctionId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_level_targets" ADD CONSTRAINT "service_level_targets_serviceVersionId_fkey" FOREIGN KEY ("serviceVersionId") REFERENCES "service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_level_targets" ADD CONSTRAINT "service_level_targets_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_dependency_definitions" ADD CONSTRAINT "service_dependency_definitions_serviceVersionId_fkey" FOREIGN KEY ("serviceVersionId") REFERENCES "service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_dependency_definitions" ADD CONSTRAINT "service_dependency_definitions_authorityDependencyId_fkey" FOREIGN KEY ("authorityDependencyId") REFERENCES "authority_dependencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_output_definitions" ADD CONSTRAINT "service_output_definitions_serviceVersionId_fkey" FOREIGN KEY ("serviceVersionId") REFERENCES "service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_output_definitions" ADD CONSTRAINT "service_output_definitions_issuingInstitutionId_fkey" FOREIGN KEY ("issuingInstitutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_output_definitions" ADD CONSTRAINT "service_output_definitions_authorityFunctionId_fkey" FOREIGN KEY ("authorityFunctionId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_redress_routes" ADD CONSTRAINT "service_redress_routes_serviceVersionId_fkey" FOREIGN KEY ("serviceVersionId") REFERENCES "service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_redress_routes" ADD CONSTRAINT "service_redress_routes_responsibleInstitutionId_fkey" FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_redress_routes" ADD CONSTRAINT "service_redress_routes_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
