-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'HISTORICAL');

-- CreateEnum
CREATE TYPE "ExternalAuthorityType" AS ENUM ('GOVERNMENT_AUTHORITY', 'REGULATOR', 'JUDICIAL_BODY', 'PROFESSIONAL_BODY', 'PUBLIC_REGISTRY', 'INTERNATIONAL_BODY', 'OTHER');

-- CreateEnum
CREATE TYPE "InstitutionExternalAuthorityRelationshipType" AS ENUM ('COORDINATION', 'REFERRAL', 'CONSULTATION', 'VERIFICATION', 'SUPERVISION', 'REGULATORY', 'DEPENDENCY', 'OTHER');

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_authorities" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ExternalAuthorityType" NOT NULL,
    "jurisdictionDescription" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_external_authorities" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "externalAuthorityId" TEXT NOT NULL,
    "relationshipType" "InstitutionExternalAuthorityRelationshipType" NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_external_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_code_key" ON "institutions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "external_authorities_code_key" ON "external_authorities"("code");

-- CreateIndex
CREATE INDEX "institution_external_authorities_institutionId_idx" ON "institution_external_authorities"("institutionId");

-- CreateIndex
CREATE INDEX "institution_external_authorities_externalAuthorityId_idx" ON "institution_external_authorities"("externalAuthorityId");

-- AddForeignKey
ALTER TABLE "institution_external_authorities" ADD CONSTRAINT "institution_external_authorities_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_external_authorities" ADD CONSTRAINT "institution_external_authorities_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
