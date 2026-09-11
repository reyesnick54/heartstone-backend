-- CreateEnum
CREATE TYPE "GovernmentAction" AS ENUM ('PREPARE', 'REVIEW', 'RECOMMEND', 'DECIDE', 'SIGN', 'ISSUE');

-- CreateEnum
CREATE TYPE "GovernmentFunctionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'ENDED');

-- CreateEnum
CREATE TYPE "FunctionAuthorityRecordStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'ENDED');

-- CreateEnum
CREATE TYPE "AuthorityConditionType" AS ENUM ('REQUIRED_EVIDENCE', 'REQUIRED_QUALIFICATION', 'REQUIRED_CONCURRENCE', 'TRANSACTION_LIMIT', 'JURISDICTION_LIMIT', 'SUBJECT_MATTER_LIMIT', 'INFORMATION_CLASSIFICATION', 'CONFLICT_CHECK', 'RECUSAL_CHECK', 'SEGREGATION_OF_DUTIES', 'SECOND_APPROVAL', 'ACTIVATION_REQUIRED', 'OTHER_STRUCTURED_REQUIREMENT');

-- CreateEnum
CREATE TYPE "AuthorityConditionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ConditionFailureBehavior" AS ENUM ('BLOCK', 'REQUIRE_REVIEW', 'SAFE_HALT');

-- CreateTable
CREATE TABLE "government_functions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "GovernmentFunctionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_functions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "function_authority_records" (
    "id" UUID NOT NULL,
    "governmentFunctionId" UUID NOT NULL,
    "officeId" UUID,
    "actionRight" "GovernmentAction" NOT NULL,
    "status" "FunctionAuthorityRecordStatus" NOT NULL DEFAULT 'PENDING',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "function_authority_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authority_conditions" (
    "id" UUID NOT NULL,
    "functionAuthorityRecordId" UUID,
    "governmentFunctionId" UUID,
    "actionRight" "GovernmentAction",
    "conditionType" "AuthorityConditionType" NOT NULL,
    "requiredAction" "GovernmentAction",
    "configuration" JSONB NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "status" "AuthorityConditionStatus" NOT NULL DEFAULT 'PENDING',
    "failureBehavior" "ConditionFailureBehavior" NOT NULL DEFAULT 'BLOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authority_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "government_functions_code_key" ON "government_functions"("code");

-- CreateIndex
CREATE INDEX "function_authority_records_governmentFunctionId_idx" ON "function_authority_records"("governmentFunctionId");

-- CreateIndex
CREATE INDEX "function_authority_records_officeId_idx" ON "function_authority_records"("officeId");

-- CreateIndex
CREATE INDEX "authority_conditions_functionAuthorityRecordId_idx" ON "authority_conditions"("functionAuthorityRecordId");

-- CreateIndex
CREATE INDEX "authority_conditions_governmentFunctionId_idx" ON "authority_conditions"("governmentFunctionId");

-- CreateIndex
CREATE INDEX "authority_conditions_conditionType_idx" ON "authority_conditions"("conditionType");

-- AddForeignKey
ALTER TABLE "function_authority_records" ADD CONSTRAINT "function_authority_records_governmentFunctionId_fkey" FOREIGN KEY ("governmentFunctionId") REFERENCES "government_functions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_authority_records" ADD CONSTRAINT "function_authority_records_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authority_conditions" ADD CONSTRAINT "authority_conditions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authority_conditions" ADD CONSTRAINT "authority_conditions_governmentFunctionId_fkey" FOREIGN KEY ("governmentFunctionId") REFERENCES "government_functions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
