-- CreateEnum
CREATE TYPE "TechnicalAccessPolicyScope" AS ENUM ('PLATFORM_WIDE', 'INSTITUTION');

-- AlterEnum
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'TECHNICAL_PERMISSION_DENIED';

-- CreateTable
CREATE TABLE "technical_access_policies" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "permissionCode" TEXT NOT NULL,
    "institutionId" UUID,
    "scope" "TechnicalAccessPolicyScope" NOT NULL DEFAULT 'PLATFORM_WIDE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technical_access_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "technical_access_policies_identityId_permissionCode_idx" ON "technical_access_policies"("identityId", "permissionCode");

-- CreateIndex
CREATE INDEX "technical_access_policies_institutionId_idx" ON "technical_access_policies"("institutionId");

-- CreateIndex
CREATE INDEX "technical_access_policies_permissionCode_idx" ON "technical_access_policies"("permissionCode");

-- AddForeignKey
ALTER TABLE "technical_access_policies" ADD CONSTRAINT "technical_access_policies_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_access_policies" ADD CONSTRAINT "technical_access_policies_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
