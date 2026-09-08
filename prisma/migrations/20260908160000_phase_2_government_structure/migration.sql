-- CreateEnum
CREATE TYPE "StructuralLifecycleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JurisdictionType" AS ENUM ('NATIONAL', 'SUBNATIONAL', 'MUNICIPAL', 'SPECIAL_ECONOMIC_ZONE', 'REGULATORY', 'SUBJECT_MATTER', 'OTHER');

-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('GOVERNMENT', 'MINISTRY', 'AGENCY', 'AUTHORITY', 'REGULATOR', 'STATUTORY_BODY', 'SPECIAL_ECONOMIC_ZONE_AUTHORITY', 'PUBLIC_BODY', 'OTHER');

-- CreateEnum
CREATE TYPE "GovernmentBodyType" AS ENUM ('BOARD', 'COUNCIL', 'COMMITTEE', 'COMMISSION', 'ADVISORY', 'ADMINISTRATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DelegationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ExternalAuthorityType" AS ENUM ('GOVERNMENT', 'REGULATORY', 'JUDICIAL', 'PROFESSIONAL', 'INTERNATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "InstitutionExternalAuthorityRelationshipType" AS ENUM ('COORDINATION', 'REFERRAL', 'RECOGNITION', 'OVERSIGHT', 'OTHER');

-- CreateTable
CREATE TABLE "jurisdictions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "JurisdictionType" NOT NULL,
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "InstitutionType" NOT NULL,
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

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
    "displayName" TEXT NOT NULL,
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
    "code" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegations" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "sourceInstitutionId" UUID NOT NULL,
    "delegatorOfficeholderId" UUID NOT NULL,
    "recipientOfficeholderId" UUID NOT NULL,
    "scopeDescription" TEXT NOT NULL,
    "status" "DelegationStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "notes" TEXT,
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
    "code" TEXT NOT NULL,
    "relationshipType" "InstitutionExternalAuthorityRelationshipType" NOT NULL,
    "description" TEXT,
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_external_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jurisdictions_code_key" ON "jurisdictions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_jurisdictionId_code_key" ON "institutions"("jurisdictionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "government_bodies_institutionId_code_key" ON "government_bodies"("institutionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_institutionId_code_key" ON "departments"("institutionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "offices_departmentId_code_key" ON "offices"("departmentId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "officeholders_code_key" ON "officeholders"("code");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_code_key" ON "appointments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "delegations_code_key" ON "delegations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "external_authorities_code_key" ON "external_authorities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "institution_external_authorities_code_key" ON "institution_external_authorities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "institution_external_authorities_institutionId_externalAutho_key" ON "institution_external_authorities"("institutionId", "externalAuthorityId", "relationshipType");

-- AddForeignKey
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_sourceInstitutionId_fkey" FOREIGN KEY ("sourceInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegatorOfficeholderId_fkey" FOREIGN KEY ("delegatorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_recipientOfficeholderId_fkey" FOREIGN KEY ("recipientOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_external_authorities" ADD CONSTRAINT "institution_external_authorities_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_external_authorities" ADD CONSTRAINT "institution_external_authorities_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
