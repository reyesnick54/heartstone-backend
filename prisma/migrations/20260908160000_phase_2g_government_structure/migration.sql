-- CreateEnum
CREATE TYPE "GovernmentBodyType" AS ENUM ('GOVERNING', 'SUPERVISORY', 'ADVISORY', 'ADMINISTRATIVE', 'DECISION_MAKING', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DelegationStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'ENDED');

-- CreateEnum
CREATE TYPE "ExternalAuthorityType" AS ENUM ('GOVERNMENT', 'REGULATORY', 'JUDICIAL', 'PROFESSIONAL', 'INSTITUTIONAL', 'OTHER');

-- CreateTable
CREATE TABLE "government_bodies" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "GovernmentBodyType" NOT NULL,
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_bodies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offices" (
    "id" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officeholders" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "officeholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "officeId" UUID NOT NULL,
    "officeholderId" UUID NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegations" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "delegatorOfficeId" UUID,
    "delegatorOfficeholderId" UUID,
    "recipientOfficeId" UUID,
    "recipientOfficeholderId" UUID,
    "scopeDescription" TEXT NOT NULL,
    "status" "DelegationStatus" NOT NULL DEFAULT 'PENDING',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_authorities" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ExternalAuthorityType" NOT NULL,
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_external_authorities" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "externalAuthorityId" UUID NOT NULL,
    "relationshipLabel" TEXT,
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_external_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "institutions_jurisdictionId_idx" ON "institutions"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "government_bodies_institutionId_code_key" ON "government_bodies"("institutionId", "code");

-- CreateIndex
CREATE INDEX "government_bodies_institutionId_idx" ON "government_bodies"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_institutionId_code_key" ON "departments"("institutionId", "code");

-- CreateIndex
CREATE INDEX "departments_institutionId_idx" ON "departments"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "offices_departmentId_code_key" ON "offices"("departmentId", "code");

-- CreateIndex
CREATE INDEX "offices_departmentId_idx" ON "offices"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "officeholders_code_key" ON "officeholders"("code");

-- CreateIndex
CREATE INDEX "appointments_officeId_idx" ON "appointments"("officeId");

-- CreateIndex
CREATE INDEX "appointments_officeholderId_idx" ON "appointments"("officeholderId");

-- CreateIndex
CREATE INDEX "delegations_institutionId_idx" ON "delegations"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "external_authorities_code_key" ON "external_authorities"("code");

-- CreateIndex
CREATE INDEX "institution_external_authorities_institutionId_idx" ON "institution_external_authorities"("institutionId");

-- CreateIndex
CREATE INDEX "institution_external_authorities_externalAuthorityId_idx" ON "institution_external_authorities"("externalAuthorityId");

-- CreateIndex
CREATE UNIQUE INDEX "institution_external_authorities_institutionId_externalAuthorityId_key" ON "institution_external_authorities"("institutionId", "externalAuthorityId");

-- AddForeignKey
ALTER TABLE "government_bodies" ADD CONSTRAINT "government_bodies_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offices" ADD CONSTRAINT "offices_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegatorOfficeId_fkey" FOREIGN KEY ("delegatorOfficeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegatorOfficeholderId_fkey" FOREIGN KEY ("delegatorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_recipientOfficeId_fkey" FOREIGN KEY ("recipientOfficeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_recipientOfficeholderId_fkey" FOREIGN KEY ("recipientOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_external_authorities" ADD CONSTRAINT "institution_external_authorities_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_external_authorities" ADD CONSTRAINT "institution_external_authorities_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
