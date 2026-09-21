-- CreateEnum
CREATE TYPE "PlatformAdministrativeAccessScope" AS ENUM ('PLATFORM_WIDE', 'INSTITUTION', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "PlatformAdministrativeAccessAuditResult" AS ENUM ('GRANTED', 'DENIED_NO_POLICY', 'DENIED_SUSPENDED', 'DENIED_SUBSTANTIVE_ONLY');

-- AlterEnum
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'PLATFORM_ADMIN_ACCESS_GRANTED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'PLATFORM_ADMIN_ACCESS_DENIED';

-- CreateTable
CREATE TABLE "platform_administrative_access_policies" (
    "id" UUID NOT NULL,
    "identityId" UUID,
    "institutionId" UUID,
    "departmentId" UUID,
    "permissionCode" TEXT NOT NULL,
    "scope" "PlatformAdministrativeAccessScope" NOT NULL DEFAULT 'PLATFORM_WIDE',
    "canConfigureServices" BOOLEAN NOT NULL DEFAULT true,
    "canConfigureForms" BOOLEAN NOT NULL DEFAULT true,
    "canConfigureWorkflows" BOOLEAN NOT NULL DEFAULT true,
    "canConfigureIntegrations" BOOLEAN NOT NULL DEFAULT true,
    "canConfigureCommunications" BOOLEAN NOT NULL DEFAULT true,
    "canViewSecurity" BOOLEAN NOT NULL DEFAULT true,
    "canViewReadiness" BOOLEAN NOT NULL DEFAULT true,
    "substantiveAccessDenied" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_administrative_access_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_administrative_access_audits" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "sessionId" UUID,
    "endpoint" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" UUID,
    "accessResult" "PlatformAdministrativeAccessAuditResult" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_administrative_access_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_administrative_access_policies_identityId_idx" ON "platform_administrative_access_policies"("identityId");

-- CreateIndex
CREATE INDEX "platform_administrative_access_policies_institutionId_idx" ON "platform_administrative_access_policies"("institutionId");

-- CreateIndex
CREATE INDEX "platform_administrative_access_policies_departmentId_idx" ON "platform_administrative_access_policies"("departmentId");

-- CreateIndex
CREATE INDEX "platform_administrative_access_policies_permissionCode_idx" ON "platform_administrative_access_policies"("permissionCode");

-- CreateIndex
CREATE INDEX "platform_administrative_access_audits_identityId_idx" ON "platform_administrative_access_audits"("identityId");

-- CreateIndex
CREATE INDEX "platform_administrative_access_audits_endpoint_idx" ON "platform_administrative_access_audits"("endpoint");

-- CreateIndex
CREATE INDEX "platform_administrative_access_audits_accessResult_idx" ON "platform_administrative_access_audits"("accessResult");

-- CreateIndex
CREATE INDEX "platform_administrative_access_audits_createdAt_idx" ON "platform_administrative_access_audits"("createdAt");

-- AddForeignKey
ALTER TABLE "platform_administrative_access_policies" ADD CONSTRAINT "platform_administrative_access_policies_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_administrative_access_policies" ADD CONSTRAINT "platform_administrative_access_policies_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_administrative_access_policies" ADD CONSTRAINT "platform_administrative_access_policies_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_administrative_access_audits" ADD CONSTRAINT "platform_administrative_access_audits_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
