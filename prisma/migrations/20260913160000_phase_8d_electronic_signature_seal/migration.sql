-- Phase 8D: Electronic Signature and Seal Control

CREATE TYPE "CryptographicCredentialStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'COMPROMISED');
CREATE TYPE "ElectronicSignatureAuthorizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');
CREATE TYPE "SignatureValidationOutcome" AS ENUM (
  'VALID', 'INVALID', 'IMAGE_ONLY', 'HASH_MISMATCH', 'CERTIFICATE_INVALID', 'CERTIFICATE_REVOKED',
  'CERTIFICATE_EXPIRED', 'AUTHORITY_DENIED', 'AUTHORIZATION_DENIED', 'INSTRUMENT_TYPE_DENIED',
  'DOCUMENT_STATE_DENIED', 'IDENTITY_ASSURANCE_INSUFFICIENT', 'APPOINTMENT_INVALID', 'DELEGATION_INVALID',
  'ACTOR_NOT_HUMAN', 'SIGNATURE_NOT_BOUND'
);
CREATE TYPE "SignableInstrumentSigningState" AS ENUM (
  'PENDING_SIGNATURE', 'SIGNING_AUTHORIZED', 'SIGNED', 'SEALING_AUTHORIZED', 'SEALED', 'SIGNING_BLOCKED'
);
CREATE TYPE "ElectronicSealDefinitionStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'COMPROMISED');
CREATE TYPE "SealCustodyAssignmentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');
CREATE TYPE "SealUseAuthorizationStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'EXPIRED', 'REVOKED', 'APPLIED');
CREATE TYPE "KeyProtectionType" AS ENUM ('HSM', 'SMART_CARD', 'CLOUD_KMS', 'SOFTWARE_TOKEN', 'REMOTE_SIGNING_SERVICE', 'TEST_ONLY');
CREATE TYPE "RevocationCheckMethod" AS ENUM ('OCSP', 'CRL', 'PROVIDER_STATUS', 'TEST_STUB');

CREATE TABLE "electronic_signature_credential_references" (
    "id" UUID NOT NULL,
    "credentialProvider" TEXT NOT NULL,
    "credentialReference" TEXT NOT NULL,
    "certificateSubject" TEXT NOT NULL,
    "certificateSerial" TEXT NOT NULL,
    "certificateIssuer" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "keyProtectionType" "KeyProtectionType" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "certificateStatus" "CryptographicCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "revocationCheckMethod" "RevocationCheckMethod" NOT NULL,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electronic_signature_credential_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "electronic_signature_authorizations" (
    "id" UUID NOT NULL,
    "signatoryIdentityId" UUID NOT NULL,
    "officeholderId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "permittedInstrumentTypes" JSONB NOT NULL DEFAULT '[]',
    "permittedDecisionTypeVersion" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "status" "ElectronicSignatureAuthorizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "requiredIdentityAssuranceLevel" "AssuranceLevel" NOT NULL DEFAULT 'MEDIUM',
    "requiresMfaAtSigning" BOOLEAN NOT NULL DEFAULT true,
    "requiresWitness" BOOLEAN NOT NULL DEFAULT false,
    "requiresCountersignature" BOOLEAN NOT NULL DEFAULT false,
    "credentialReferenceId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electronic_signature_authorizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "signable_instrument_bindings" (
    "id" UUID NOT NULL,
    "documentRecordId" UUID NOT NULL,
    "documentVersionId" UUID NOT NULL,
    "instrumentType" TEXT NOT NULL,
    "functionAuthorityRecordId" UUID,
    "decisionReference" TEXT,
    "signingState" "SignableInstrumentSigningState" NOT NULL DEFAULT 'PENDING_SIGNATURE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signable_instrument_bindings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "electronic_signature_records" (
    "id" UUID NOT NULL,
    "signatoryIdentityId" UUID NOT NULL,
    "officeholderId" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "authorizationId" UUID NOT NULL,
    "documentRecordId" UUID NOT NULL,
    "documentVersionId" UUID NOT NULL,
    "documentHash" TEXT NOT NULL,
    "instrumentType" TEXT NOT NULL,
    "signatureMethod" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "credentialReferenceId" UUID NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "intentStatement" TEXT NOT NULL,
    "signatureValueReference" TEXT NOT NULL,
    "timestampEvidence" JSONB NOT NULL DEFAULT '{}',
    "certificateStatusAtSigning" "CryptographicCredentialStatus" NOT NULL,
    "revocationStatusAtSigning" "CryptographicCredentialStatus" NOT NULL,
    "validationResult" "SignatureValidationOutcome" NOT NULL DEFAULT 'VALID',
    "authorityEvaluationRecordId" UUID NOT NULL,
    "witnessSignatureRecordId" UUID,
    "countersignatureRecordId" UUID,
    "integrityEvidence" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electronic_signature_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "electronic_signature_validation_records" (
    "id" UUID NOT NULL,
    "signatureRecordId" UUID NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentHashAtValidation" TEXT NOT NULL,
    "validationOutcome" "SignatureValidationOutcome" NOT NULL,
    "certificateStatus" "CryptographicCredentialStatus" NOT NULL,
    "revocationStatus" "CryptographicCredentialStatus" NOT NULL,
    "validationEvidence" JSONB NOT NULL DEFAULT '{}',
    "validatedByIdentityId" UUID,

    CONSTRAINT "electronic_signature_validation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "electronic_seal_definitions" (
    "id" UUID NOT NULL,
    "institutionalOwnerId" UUID NOT NULL,
    "sealCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permittedInstrumentTypes" JSONB NOT NULL DEFAULT '[]',
    "credentialReferenceId" UUID NOT NULL,
    "status" "ElectronicSealDefinitionStatus" NOT NULL DEFAULT 'ACTIVE',
    "dualControlRequired" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electronic_seal_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "electronic_seal_custody_assignments" (
    "id" UUID NOT NULL,
    "sealId" UUID NOT NULL,
    "custodianOfficeholderId" UUID NOT NULL,
    "custodianOfficeId" UUID,
    "custodianIdentityId" UUID NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "status" "SealCustodyAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electronic_seal_custody_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "electronic_seal_use_authorizations" (
    "id" UUID NOT NULL,
    "sealId" UUID NOT NULL,
    "signableInstrumentBindingId" UUID NOT NULL,
    "documentVersionId" UUID NOT NULL,
    "documentHash" TEXT NOT NULL,
    "instrumentType" TEXT NOT NULL,
    "authorizedByIdentityId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID NOT NULL,
    "approvalAt" TIMESTAMP(3),
    "expirationAt" TIMESTAMP(3) NOT NULL,
    "status" "SealUseAuthorizationStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "preparerIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electronic_seal_use_authorizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "electronic_seal_use_records" (
    "id" UUID NOT NULL,
    "sealId" UUID NOT NULL,
    "documentVersionId" UUID NOT NULL,
    "documentHash" TEXT NOT NULL,
    "custodyAssignmentId" UUID NOT NULL,
    "authorizationId" UUID NOT NULL,
    "preparerIdentityId" UUID,
    "approverIdentityId" UUID,
    "custodianOfficeholderId" UUID NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL,
    "validationOutcome" "SignatureValidationOutcome" NOT NULL,
    "integrityEvidence" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electronic_seal_use_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "electronic_signature_credential_references_credentialProvider_credentialReference_key"
  ON "electronic_signature_credential_references"("credentialProvider", "credentialReference");
CREATE INDEX "electronic_signature_credential_references_certificateStatus_idx"
  ON "electronic_signature_credential_references"("certificateStatus");

CREATE INDEX "electronic_signature_authorizations_signatoryIdentityId_idx"
  ON "electronic_signature_authorizations"("signatoryIdentityId");
CREATE INDEX "electronic_signature_authorizations_officeholderId_idx"
  ON "electronic_signature_authorizations"("officeholderId");
CREATE INDEX "electronic_signature_authorizations_institutionId_idx"
  ON "electronic_signature_authorizations"("institutionId");
CREATE INDEX "electronic_signature_authorizations_functionAuthorityRecordId_idx"
  ON "electronic_signature_authorizations"("functionAuthorityRecordId");
CREATE INDEX "electronic_signature_authorizations_status_idx"
  ON "electronic_signature_authorizations"("status");

CREATE UNIQUE INDEX "signable_instrument_bindings_documentVersionId_instrumentType_key"
  ON "signable_instrument_bindings"("documentVersionId", "instrumentType");
CREATE INDEX "signable_instrument_bindings_documentRecordId_idx"
  ON "signable_instrument_bindings"("documentRecordId");
CREATE INDEX "signable_instrument_bindings_signingState_idx"
  ON "signable_instrument_bindings"("signingState");

CREATE INDEX "electronic_signature_records_documentVersionId_idx"
  ON "electronic_signature_records"("documentVersionId");
CREATE INDEX "electronic_signature_records_signatoryIdentityId_idx"
  ON "electronic_signature_records"("signatoryIdentityId");
CREATE INDEX "electronic_signature_records_officeholderId_idx"
  ON "electronic_signature_records"("officeholderId");
CREATE INDEX "electronic_signature_records_signedAt_idx"
  ON "electronic_signature_records"("signedAt");

CREATE INDEX "electronic_signature_validation_records_signatureRecordId_idx"
  ON "electronic_signature_validation_records"("signatureRecordId");
CREATE INDEX "electronic_signature_validation_records_validatedAt_idx"
  ON "electronic_signature_validation_records"("validatedAt");

CREATE UNIQUE INDEX "electronic_seal_definitions_sealCode_key" ON "electronic_seal_definitions"("sealCode");
CREATE INDEX "electronic_seal_definitions_institutionalOwnerId_idx"
  ON "electronic_seal_definitions"("institutionalOwnerId");
CREATE INDEX "electronic_seal_definitions_status_idx" ON "electronic_seal_definitions"("status");

CREATE INDEX "electronic_seal_custody_assignments_sealId_idx" ON "electronic_seal_custody_assignments"("sealId");
CREATE INDEX "electronic_seal_custody_assignments_custodianOfficeholderId_idx"
  ON "electronic_seal_custody_assignments"("custodianOfficeholderId");
CREATE INDEX "electronic_seal_custody_assignments_status_idx" ON "electronic_seal_custody_assignments"("status");

CREATE INDEX "electronic_seal_use_authorizations_sealId_idx" ON "electronic_seal_use_authorizations"("sealId");
CREATE INDEX "electronic_seal_use_authorizations_documentVersionId_idx"
  ON "electronic_seal_use_authorizations"("documentVersionId");
CREATE INDEX "electronic_seal_use_authorizations_status_idx" ON "electronic_seal_use_authorizations"("status");

CREATE INDEX "electronic_seal_use_records_sealId_idx" ON "electronic_seal_use_records"("sealId");
CREATE INDEX "electronic_seal_use_records_documentVersionId_idx" ON "electronic_seal_use_records"("documentVersionId");
CREATE INDEX "electronic_seal_use_records_appliedAt_idx" ON "electronic_seal_use_records"("appliedAt");

ALTER TABLE "electronic_signature_authorizations"
  ADD CONSTRAINT "electronic_signature_authorizations_signatoryIdentityId_fkey"
  FOREIGN KEY ("signatoryIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_signature_authorizations"
  ADD CONSTRAINT "electronic_signature_authorizations_officeholderId_fkey"
  FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_signature_authorizations"
  ADD CONSTRAINT "electronic_signature_authorizations_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_signature_authorizations"
  ADD CONSTRAINT "electronic_signature_authorizations_functionAuthorityRecordId_fkey"
  FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_signature_authorizations"
  ADD CONSTRAINT "electronic_signature_authorizations_credentialReferenceId_fkey"
  FOREIGN KEY ("credentialReferenceId") REFERENCES "electronic_signature_credential_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "signable_instrument_bindings"
  ADD CONSTRAINT "signable_instrument_bindings_documentRecordId_fkey"
  FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "signable_instrument_bindings"
  ADD CONSTRAINT "signable_instrument_bindings_documentVersionId_fkey"
  FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "signable_instrument_bindings"
  ADD CONSTRAINT "signable_instrument_bindings_functionAuthorityRecordId_fkey"
  FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "electronic_signature_records"
  ADD CONSTRAINT "electronic_signature_records_signatoryIdentityId_fkey"
  FOREIGN KEY ("signatoryIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_signature_records"
  ADD CONSTRAINT "electronic_signature_records_officeholderId_fkey"
  FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_signature_records"
  ADD CONSTRAINT "electronic_signature_records_functionAuthorityRecordId_fkey"
  FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_signature_records"
  ADD CONSTRAINT "electronic_signature_records_authorizationId_fkey"
  FOREIGN KEY ("authorizationId") REFERENCES "electronic_signature_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_signature_records"
  ADD CONSTRAINT "electronic_signature_records_documentRecordId_fkey"
  FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_signature_records"
  ADD CONSTRAINT "electronic_signature_records_documentVersionId_fkey"
  FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_signature_records"
  ADD CONSTRAINT "electronic_signature_records_credentialReferenceId_fkey"
  FOREIGN KEY ("credentialReferenceId") REFERENCES "electronic_signature_credential_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_signature_records"
  ADD CONSTRAINT "electronic_signature_records_authorityEvaluationRecordId_fkey"
  FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_signature_records"
  ADD CONSTRAINT "electronic_signature_records_witnessSignatureRecordId_fkey"
  FOREIGN KEY ("witnessSignatureRecordId") REFERENCES "electronic_signature_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "electronic_signature_records"
  ADD CONSTRAINT "electronic_signature_records_countersignatureRecordId_fkey"
  FOREIGN KEY ("countersignatureRecordId") REFERENCES "electronic_signature_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "electronic_signature_validation_records"
  ADD CONSTRAINT "electronic_signature_validation_records_signatureRecordId_fkey"
  FOREIGN KEY ("signatureRecordId") REFERENCES "electronic_signature_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "electronic_seal_definitions"
  ADD CONSTRAINT "electronic_seal_definitions_institutionalOwnerId_fkey"
  FOREIGN KEY ("institutionalOwnerId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_seal_definitions"
  ADD CONSTRAINT "electronic_seal_definitions_credentialReferenceId_fkey"
  FOREIGN KEY ("credentialReferenceId") REFERENCES "electronic_signature_credential_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "electronic_seal_custody_assignments"
  ADD CONSTRAINT "electronic_seal_custody_assignments_sealId_fkey"
  FOREIGN KEY ("sealId") REFERENCES "electronic_seal_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_seal_custody_assignments"
  ADD CONSTRAINT "electronic_seal_custody_assignments_custodianOfficeholderId_fkey"
  FOREIGN KEY ("custodianOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_seal_custody_assignments"
  ADD CONSTRAINT "electronic_seal_custody_assignments_custodianOfficeId_fkey"
  FOREIGN KEY ("custodianOfficeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "electronic_seal_custody_assignments"
  ADD CONSTRAINT "electronic_seal_custody_assignments_custodianIdentityId_fkey"
  FOREIGN KEY ("custodianIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "electronic_seal_use_authorizations"
  ADD CONSTRAINT "electronic_seal_use_authorizations_sealId_fkey"
  FOREIGN KEY ("sealId") REFERENCES "electronic_seal_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_seal_use_authorizations"
  ADD CONSTRAINT "electronic_seal_use_authorizations_signableInstrumentBindingId_fkey"
  FOREIGN KEY ("signableInstrumentBindingId") REFERENCES "signable_instrument_bindings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_seal_use_authorizations"
  ADD CONSTRAINT "electronic_seal_use_authorizations_authorizedByIdentityId_fkey"
  FOREIGN KEY ("authorizedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_seal_use_authorizations"
  ADD CONSTRAINT "electronic_seal_use_authorizations_authorityEvaluationRecordId_fkey"
  FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "electronic_seal_use_records"
  ADD CONSTRAINT "electronic_seal_use_records_sealId_fkey"
  FOREIGN KEY ("sealId") REFERENCES "electronic_seal_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_seal_use_records"
  ADD CONSTRAINT "electronic_seal_use_records_documentVersionId_fkey"
  FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_seal_use_records"
  ADD CONSTRAINT "electronic_seal_use_records_custodyAssignmentId_fkey"
  FOREIGN KEY ("custodyAssignmentId") REFERENCES "electronic_seal_custody_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_seal_use_records"
  ADD CONSTRAINT "electronic_seal_use_records_authorizationId_fkey"
  FOREIGN KEY ("authorizationId") REFERENCES "electronic_seal_use_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "electronic_seal_use_records"
  ADD CONSTRAINT "electronic_seal_use_records_preparerIdentityId_fkey"
  FOREIGN KEY ("preparerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "electronic_seal_use_records"
  ADD CONSTRAINT "electronic_seal_use_records_approverIdentityId_fkey"
  FOREIGN KEY ("approverIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "electronic_seal_use_records"
  ADD CONSTRAINT "electronic_seal_use_records_custodianOfficeholderId_fkey"
  FOREIGN KEY ("custodianOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
