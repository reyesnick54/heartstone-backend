-- CreateEnum
CREATE TYPE "StructuralLifecycleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JurisdictionType" AS ENUM ('NATIONAL', 'SUBNATIONAL', 'MUNICIPAL', 'SPECIAL_ECONOMIC_ZONE', 'REGULATORY', 'SUBJECT_MATTER', 'OTHER');

-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('GOVERNMENT', 'MINISTRY', 'AGENCY', 'AUTHORITY', 'REGULATOR', 'STATUTORY_BODY', 'SPECIAL_ECONOMIC_ZONE_AUTHORITY', 'PUBLIC_BODY', 'OTHER');

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

-- CreateIndex
CREATE UNIQUE INDEX "jurisdictions_code_key" ON "jurisdictions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_jurisdictionId_code_key" ON "institutions"("jurisdictionId", "code");

-- AddForeignKey
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
