-- CreateEnum
CREATE TYPE "DelegationStatus" AS ENUM ('PLANNED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED', 'ENDED');

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offices" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officeholders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "officeholders_pkey" PRIMARY KEY ("id")
);

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
    "delegatorInstitutionId" TEXT,
    "delegatorOfficeId" TEXT,
    "delegatorOfficeholderId" TEXT,
    "recipientInstitutionId" TEXT,
    "recipientOfficeId" TEXT,
    "recipientOfficeholderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delegations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_code_key" ON "institutions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "offices_code_key" ON "offices"("code");

-- CreateIndex
CREATE UNIQUE INDEX "officeholders_code_key" ON "officeholders"("code");

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
