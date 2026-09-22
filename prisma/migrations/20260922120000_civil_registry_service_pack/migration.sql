-- CreateEnum
CREATE TYPE "CivilRegistryEventType" AS ENUM ('BIRTH', 'DEATH', 'MARRIAGE', 'DIVORCE', 'CIVIL_STATUS_CHANGE', 'LEGAL_NAME_CHANGE');

-- CreateEnum
CREATE TYPE "CivilRegistryRecordStatus" AS ENUM ('SUBMISSION_PENDING', 'OFFICIAL', 'CORRECTED', 'SEALED', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "CivilRegistrySubmissionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'DECISION_PENDING', 'REGISTERED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CivilRegistryCertificateType" AS ENUM ('BIRTH_CERTIFICATE', 'DEATH_CERTIFICATE', 'MARRIAGE_CERTIFICATE', 'DIVORCE_CERTIFICATE', 'CIVIL_EXTRACT', 'VERIFICATION_ATTESTATION');

-- CreateEnum
CREATE TYPE "CivilRegistryCertificateStatus" AS ENUM ('PENDING_ISSUANCE', 'ISSUED', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "CivilRegistryVerificationValidity" AS ENUM ('VALID', 'REVOKED', 'SUPERSEDED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CivilRegistryEntitlementKind" AS ENUM ('SUBJECT', 'PARENT', 'SPOUSE', 'AUTHORIZED_APPLICANT', 'LEGAL_REPRESENTATIVE');

-- CreateTable
CREATE TABLE "civil_registry_vital_records" (
    "id" UUID NOT NULL,
    "recordNumber" TEXT NOT NULL,
    "eventType" "CivilRegistryEventType" NOT NULL,
    "status" "CivilRegistryRecordStatus" NOT NULL DEFAULT 'SUBMISSION_PENDING',
    "institutionId" UUID NOT NULL,
    "subjectIdentityId" UUID,
    "registrationCaseId" UUID,
    "servicePackReference" TEXT,
    "isSealed" BOOLEAN NOT NULL DEFAULT false,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "currentVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "civil_registry_vital_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civil_registry_vital_record_versions" (
    "id" UUID NOT NULL,
    "vitalRecordId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "recordStateHash" TEXT NOT NULL,
    "summaryLabel" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersedesVersionId" UUID,
    "amendmentReason" TEXT,
    "isOriginal" BOOLEAN NOT NULL DEFAULT false,
    "registeredByOfficialIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "civil_registry_vital_record_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civil_registry_event_submissions" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "vitalRecordId" UUID,
    "eventType" "CivilRegistryEventType" NOT NULL,
    "status" "CivilRegistrySubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "civil_registry_event_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civil_registry_record_entitlements" (
    "id" UUID NOT NULL,
    "vitalRecordId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "entitlementKind" "CivilRegistryEntitlementKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "civil_registry_record_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civil_registry_certificates" (
    "id" UUID NOT NULL,
    "vitalRecordId" UUID NOT NULL,
    "registryVersionId" UUID NOT NULL,
    "officialInstrumentId" UUID,
    "certificateType" "CivilRegistryCertificateType" NOT NULL,
    "status" "CivilRegistryCertificateStatus" NOT NULL DEFAULT 'PENDING_ISSUANCE',
    "issuedAt" TIMESTAMP(3),
    "issuedByOfficialIdentityId" UUID,
    "issuanceCaseId" UUID,
    "requestApplicationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "civil_registry_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civil_registry_certificate_verifications" (
    "id" UUID NOT NULL,
    "certificateId" UUID NOT NULL,
    "verificationReference" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "qrTokenReference" TEXT,
    "issuerInstitutionId" UUID NOT NULL,
    "validityStatus" "CivilRegistryVerificationValidity" NOT NULL DEFAULT 'VALID',
    "publicStatusLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "civil_registry_certificate_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "civil_registry_vital_records_recordNumber_key" ON "civil_registry_vital_records"("recordNumber");

-- CreateIndex
CREATE UNIQUE INDEX "civil_registry_vital_records_registrationCaseId_key" ON "civil_registry_vital_records"("registrationCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "civil_registry_vital_records_currentVersionId_key" ON "civil_registry_vital_records"("currentVersionId");

-- CreateIndex
CREATE INDEX "civil_registry_vital_records_institutionId_idx" ON "civil_registry_vital_records"("institutionId");

-- CreateIndex
CREATE INDEX "civil_registry_vital_records_subjectIdentityId_idx" ON "civil_registry_vital_records"("subjectIdentityId");

-- CreateIndex
CREATE INDEX "civil_registry_vital_records_status_idx" ON "civil_registry_vital_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "civil_registry_vital_record_versions_supersedesVersionId_key" ON "civil_registry_vital_record_versions"("supersedesVersionId");

-- CreateIndex
CREATE INDEX "civil_registry_vital_record_versions_vitalRecordId_idx" ON "civil_registry_vital_record_versions"("vitalRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "civil_registry_vital_record_versions_vitalRecordId_versionNumber_key" ON "civil_registry_vital_record_versions"("vitalRecordId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "civil_registry_event_submissions_caseId_key" ON "civil_registry_event_submissions"("caseId");

-- CreateIndex
CREATE INDEX "civil_registry_event_submissions_applicationId_idx" ON "civil_registry_event_submissions"("applicationId");

-- CreateIndex
CREATE INDEX "civil_registry_event_submissions_vitalRecordId_idx" ON "civil_registry_event_submissions"("vitalRecordId");

-- CreateIndex
CREATE INDEX "civil_registry_record_entitlements_identityId_idx" ON "civil_registry_record_entitlements"("identityId");

-- CreateIndex
CREATE UNIQUE INDEX "civil_registry_record_entitlements_vitalRecordId_identityId_entitlementKind_key" ON "civil_registry_record_entitlements"("vitalRecordId", "identityId", "entitlementKind");

-- CreateIndex
CREATE UNIQUE INDEX "civil_registry_certificates_officialInstrumentId_key" ON "civil_registry_certificates"("officialInstrumentId");

-- CreateIndex
CREATE INDEX "civil_registry_certificates_vitalRecordId_idx" ON "civil_registry_certificates"("vitalRecordId");

-- CreateIndex
CREATE INDEX "civil_registry_certificates_registryVersionId_idx" ON "civil_registry_certificates"("registryVersionId");

-- CreateIndex
CREATE INDEX "civil_registry_certificates_status_idx" ON "civil_registry_certificates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "civil_registry_certificate_verifications_verificationReference_key" ON "civil_registry_certificate_verifications"("verificationReference");

-- CreateIndex
CREATE UNIQUE INDEX "civil_registry_certificate_verifications_verificationCode_key" ON "civil_registry_certificate_verifications"("verificationCode");

-- CreateIndex
CREATE INDEX "civil_registry_certificate_verifications_certificateId_idx" ON "civil_registry_certificate_verifications"("certificateId");

-- CreateIndex
CREATE INDEX "civil_registry_certificate_verifications_issuerInstitutionId_idx" ON "civil_registry_certificate_verifications"("issuerInstitutionId");

-- AddForeignKey
ALTER TABLE "civil_registry_vital_records" ADD CONSTRAINT "civil_registry_vital_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_vital_records" ADD CONSTRAINT "civil_registry_vital_records_subjectIdentityId_fkey" FOREIGN KEY ("subjectIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_vital_records" ADD CONSTRAINT "civil_registry_vital_records_registrationCaseId_fkey" FOREIGN KEY ("registrationCaseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_vital_records" ADD CONSTRAINT "civil_registry_vital_records_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "civil_registry_vital_record_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_vital_record_versions" ADD CONSTRAINT "civil_registry_vital_record_versions_vitalRecordId_fkey" FOREIGN KEY ("vitalRecordId") REFERENCES "civil_registry_vital_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_vital_record_versions" ADD CONSTRAINT "civil_registry_vital_record_versions_supersedesVersionId_fkey" FOREIGN KEY ("supersedesVersionId") REFERENCES "civil_registry_vital_record_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_vital_record_versions" ADD CONSTRAINT "civil_registry_vital_record_versions_registeredByOfficialIdentityId_fkey" FOREIGN KEY ("registeredByOfficialIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_event_submissions" ADD CONSTRAINT "civil_registry_event_submissions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_event_submissions" ADD CONSTRAINT "civil_registry_event_submissions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_event_submissions" ADD CONSTRAINT "civil_registry_event_submissions_vitalRecordId_fkey" FOREIGN KEY ("vitalRecordId") REFERENCES "civil_registry_vital_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_record_entitlements" ADD CONSTRAINT "civil_registry_record_entitlements_vitalRecordId_fkey" FOREIGN KEY ("vitalRecordId") REFERENCES "civil_registry_vital_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_record_entitlements" ADD CONSTRAINT "civil_registry_record_entitlements_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_certificates" ADD CONSTRAINT "civil_registry_certificates_vitalRecordId_fkey" FOREIGN KEY ("vitalRecordId") REFERENCES "civil_registry_vital_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_certificates" ADD CONSTRAINT "civil_registry_certificates_registryVersionId_fkey" FOREIGN KEY ("registryVersionId") REFERENCES "civil_registry_vital_record_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_certificates" ADD CONSTRAINT "civil_registry_certificates_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_certificates" ADD CONSTRAINT "civil_registry_certificates_issuedByOfficialIdentityId_fkey" FOREIGN KEY ("issuedByOfficialIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_certificate_verifications" ADD CONSTRAINT "civil_registry_certificate_verifications_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "civil_registry_certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_registry_certificate_verifications" ADD CONSTRAINT "civil_registry_certificate_verifications_issuerInstitutionId_fkey" FOREIGN KEY ("issuerInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
