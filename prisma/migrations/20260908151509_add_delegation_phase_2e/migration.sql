-- CreateEnum
CREATE TYPE "DelegationStatus" AS ENUM ('PLANNED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED', 'ENDED');

-- CreateTable
CREATE TABLE "delegations" (
    "id" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "scopeDescription" TEXT NOT NULL,
    "status" "DelegationStatus" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "notes" TEXT,
    "delegatorInstitutionId" UUID,
    "delegatorOfficeId" TEXT,
    "delegatorOfficeholderId" TEXT,
    "recipientInstitutionId" UUID,
    "recipientOfficeId" TEXT,
    "recipientOfficeholderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delegations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delegations_referenceCode_key" ON "delegations"("referenceCode");

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegatorInstitutionId_fkey" FOREIGN KEY ("delegatorInstitutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegatorOfficeId_fkey" FOREIGN KEY ("delegatorOfficeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegatorOfficeholderId_fkey" FOREIGN KEY ("delegatorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_recipientInstitutionId_fkey" FOREIGN KEY ("recipientInstitutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_recipientOfficeId_fkey" FOREIGN KEY ("recipientOfficeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_recipientOfficeholderId_fkey" FOREIGN KEY ("recipientOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
