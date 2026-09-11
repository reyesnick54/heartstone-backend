-- AlterEnum
ALTER TYPE "AuthorityDependencyType" ADD VALUE 'EXPRESSLY_RETAINED_NATIONAL_DETERMINATION';
ALTER TYPE "AuthorityDependencyType" ADD VALUE 'GOVERNMENT_CONCURRENCE';
ALTER TYPE "AuthorityDependencyType" ADD VALUE 'MANDATORY_CONSULTATION';
ALTER TYPE "AuthorityDependencyType" ADD VALUE 'SHARED_COORDINATED_ACTION';
ALTER TYPE "AuthorityDependencyType" ADD VALUE 'PROFESSIONAL_REVIEW';
ALTER TYPE "AuthorityDependencyType" ADD VALUE 'SUPERVISORY_REVIEW';
ALTER TYPE "AuthorityDependencyType" ADD VALUE 'INSPECTION_DEPENDENCY';
ALTER TYPE "AuthorityDependencyType" ADD VALUE 'LIAISON';
ALTER TYPE "AuthorityDependencyType" ADD VALUE 'OTHER_AUTHENTICATED_DEPENDENCY';

-- CreateEnum
CREATE TYPE "AuthorityDependencyBlockingStatus" AS ENUM ('BLOCKING', 'NON_BLOCKING');
CREATE TYPE "AuthorityDependencyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE "ExternalDeterminationStatus" AS ENUM ('PENDING', 'GRANTED', 'DENIED', 'PARTIALLY_GRANTED', 'WITHDRAWN', 'EXPIRED');
CREATE TYPE "InstitutionalActType" AS ENUM ('DECISION', 'CONCURRENCE', 'CONSULTATION', 'SUPERVISION', 'LIAISON', 'PROFESSIONAL_DETERMINATION', 'COORDINATED_ACTION', 'DATA_EXCHANGE');
CREATE TYPE "ProfessionalAttestationSource" AS ENUM ('QUALIFIED_PROFESSIONAL', 'AI_ASSISTANCE', 'ADMINISTRATOR', 'GOVERNMENT_OFFICIAL', 'OTHER');

-- AlterEnum
ALTER TYPE "AuthorityEvaluationOutcome" ADD VALUE 'BLOCKED';

-- AlterTable
ALTER TABLE "authority_dependencies" ADD COLUMN "competentAuthorityLabel" TEXT,
ADD COLUMN "triggerCondition" TEXT,
ADD COLUMN "requiredOutcome" TEXT,
ADD COLUMN "blockingStatus" "AuthorityDependencyBlockingStatus" NOT NULL DEFAULT 'BLOCKING',
ADD COLUMN "sourceProvision" TEXT,
ADD COLUMN "requiredEvidenceReference" TEXT,
ADD COLUMN "status" "AuthorityDependencyStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "effectiveFrom" TIMESTAMP(3),
ADD COLUMN "effectiveUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "authority_dependencies_dependencyType_idx" ON "authority_dependencies"("dependencyType");

-- CreateTable
CREATE TABLE "external_dependency_determinations" (
    "id" UUID NOT NULL,
    "authorityDependencyId" UUID NOT NULL,
    "externalAuthorityId" UUID NOT NULL,
    "determinationReference" TEXT NOT NULL,
    "determinationStatus" "ExternalDeterminationStatus" NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retainedQuestion" TEXT,
    "requiredDetermination" TEXT,
    "referralBasis" TEXT,
    "effectOnAbsezAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_dependency_determinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutional_authority_acts" (
    "id" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "institutionId" UUID,
    "externalAuthorityId" UUID,
    "actorOfficeholderId" UUID,
    "actorIdentityId" UUID,
    "actType" "InstitutionalActType" NOT NULL,
    "decisionOrAction" TEXT NOT NULL,
    "evidenceReference" TEXT,
    "legalEffect" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutional_authority_acts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_dependency_determinations_authorityDependencyId_idx" ON "external_dependency_determinations"("authorityDependencyId");
CREATE INDEX "external_dependency_determinations_externalAuthorityId_idx" ON "external_dependency_determinations"("externalAuthorityId");
CREATE INDEX "institutional_authority_acts_functionAuthorityRecordId_idx" ON "institutional_authority_acts"("functionAuthorityRecordId");

-- AddForeignKey
ALTER TABLE "external_dependency_determinations" ADD CONSTRAINT "external_dependency_determinations_authorityDependencyId_fkey" FOREIGN KEY ("authorityDependencyId") REFERENCES "authority_dependencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "external_dependency_determinations" ADD CONSTRAINT "external_dependency_determinations_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "institutional_authority_acts" ADD CONSTRAINT "institutional_authority_acts_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "institutional_authority_acts" ADD CONSTRAINT "institutional_authority_acts_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "institutional_authority_acts" ADD CONSTRAINT "institutional_authority_acts_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
