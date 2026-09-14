-- Phase 13B: Cybersecurity Hardening, Identity Assurance, Cryptography and Supply-Chain Security

CREATE TYPE "SecurityControlDomain" AS ENUM (
  'IDENTITY',
  'AUTHENTICATION',
  'AUTHORIZATION',
  'PRIVILEGED_ACCESS',
  'SEGREGATION_OF_DUTIES',
  'NETWORK',
  'APPLICATION',
  'DATABASE',
  'API',
  'INTEGRATION',
  'HOST',
  'CONTAINER',
  'BUILD_PIPELINE',
  'SECRETS',
  'CRYPTOGRAPHY',
  'LOGGING',
  'MONITORING',
  'DATA_PROTECTION',
  'BACKUP',
  'RECOVERY',
  'INCIDENT_RESPONSE',
  'VULNERABILITY',
  'SUPPLY_CHAIN',
  'VENDOR',
  'AI_SECURITY',
  'PHYSICAL_DEPENDENCY_REFERENCE'
);

CREATE TYPE "SecurityFindingSeverity" AS ENUM (
  'INFORMATIONAL',
  'LOW',
  'MODERATE',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE "SecurityControlImplementationStatus" AS ENUM (
  'PLANNED',
  'IMPLEMENTED',
  'PARTIALLY_IMPLEMENTED',
  'NOT_IMPLEMENTED',
  'EXCEPTION',
  'DECOMMISSIONED'
);

CREATE TYPE "SecurityControlAssessmentResult" AS ENUM (
  'PASS',
  'FAIL',
  'PARTIAL',
  'NOT_TESTED',
  'DEFERRED'
);

CREATE TYPE "SecurityExceptionStatus" AS ENUM (
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'REVOKED'
);

CREATE TYPE "VulnerabilityFindingStatus" AS ENUM (
  'OPEN',
  'TRIAGED',
  'IN_REMEDIATION',
  'REMEDIATED',
  'ACCEPTED_RISK',
  'FALSE_POSITIVE'
);

CREATE TYPE "VulnerabilityRemediationStatus" AS ENUM (
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'VERIFIED',
  'FAILED'
);

CREATE TYPE "SecurityAssuranceReviewStatus" AS ENUM (
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'DEFERRED'
);

CREATE TYPE "CryptographicMigrationStatus" AS ENUM (
  'CURRENT',
  'DEPRECATED',
  'MIGRATION_REQUIRED',
  'MIGRATED',
  'LEGACY_VERIFICATION_ONLY'
);

CREATE TYPE "PostQuantumMigrationStatus" AS ENUM (
  'IDENTIFIED',
  'ASSESSED',
  'NOT_YET_MIGRATED',
  'PILOT',
  'VALIDATION',
  'MIGRATED',
  'REVALIDATION_REQUIRED',
  'DEFERRED_WITH_ACCEPTED_RISK'
);

CREATE TYPE "SoftwareComponentType" AS ENUM (
  'APPLICATION',
  'LIBRARY',
  'FRAMEWORK',
  'RUNTIME',
  'CONTAINER',
  'OPERATING_SYSTEM',
  'FIRMWARE',
  'OTHER'
);

CREATE TYPE "BuildProvenanceStatus" AS ENUM (
  'RECORDED',
  'VERIFIED',
  'UNVERIFIABLE',
  'REJECTED'
);

CREATE TYPE "ReleaseAttestationStatus" AS ENUM (
  'PENDING',
  'ATTESTED',
  'REJECTED',
  'REVOKED'
);

CREATE TYPE "VendorSecurityAssessmentStatus" AS ENUM (
  'PENDING',
  'IN_REVIEW',
  'APPROVED',
  'CONDITIONAL',
  'REJECTED',
  'EXPIRED'
);

CREATE TYPE "PrivilegedAccessReviewStatus" AS ENUM (
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'OVERDUE'
);

CREATE TYPE "ServiceIdentityReviewStatus" AS ENUM (
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLIANT',
  'NON_COMPLIANT',
  'OVERDUE'
);

CREATE TYPE "CredentialRotationStatus" AS ENUM (
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'OVERDUE'
);

CREATE TYPE "BreakGlassAccessStatus" AS ENUM (
  'REQUESTED',
  'APPROVED',
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
  'REVIEWED'
);

CREATE TYPE "SecurityEnvironment" AS ENUM (
  'DEVELOPMENT',
  'TEST',
  'STAGING',
  'PRODUCTION'
);

CREATE TYPE "SecurityTestCategory" AS ENUM (
  'AUTHORIZATION_BYPASS',
  'IDOR',
  'MASS_ASSIGNMENT',
  'PRIVILEGE_ESCALATION',
  'BROKEN_AUTHENTICATION',
  'SESSION_FIXATION',
  'TOKEN_REPLAY',
  'CSRF',
  'SSRF',
  'INJECTION',
  'XSS',
  'TEMPLATE_INJECTION',
  'PATH_TRAVERSAL',
  'UNSAFE_DESERIALIZATION',
  'FILE_UPLOAD_ABUSE',
  'RATE_LIMITING',
  'RESOURCE_EXHAUSTION',
  'SECRETS_LEAKAGE',
  'PII_LEAKAGE',
  'WEBHOOK_SPOOFING',
  'SIGNATURE_REPLAY',
  'CROSS_TENANT_LEAKAGE',
  'AGENT_TOOL_PRIVILEGE_ESCALATION'
);

CREATE TYPE "ProductionReadinessGateStatus" AS ENUM (
  'NOT_EVALUATED',
  'BLOCKED',
  'CONDITIONALLY_READY',
  'READY'
);

CREATE TABLE "security_assets" (
  "id" UUID NOT NULL,
  "assetCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "assetType" TEXT NOT NULL,
  "environment" "SecurityEnvironment" NOT NULL,
  "ownerIdentityId" UUID NOT NULL,
  "criticality" "SecurityFindingSeverity" NOT NULL DEFAULT 'MODERATE',
  "isProductionConsequential" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "security_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_control_definitions" (
  "id" UUID NOT NULL,
  "controlCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "domain" "SecurityControlDomain" NOT NULL,
  "requirementSource" TEXT NOT NULL,
  "ownerIdentityId" UUID NOT NULL,
  "isMandatory" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "security_control_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_control_implementations" (
  "id" UUID NOT NULL,
  "implementationCode" TEXT NOT NULL,
  "controlDefinitionId" UUID NOT NULL,
  "assetId" UUID NOT NULL,
  "ownerIdentityId" UUID NOT NULL,
  "requirementSource" TEXT NOT NULL,
  "implementationDescription" TEXT NOT NULL,
  "environment" "SecurityEnvironment" NOT NULL,
  "evidenceReference" TEXT,
  "testMethod" TEXT NOT NULL,
  "status" "SecurityControlImplementationStatus" NOT NULL DEFAULT 'PLANNED',
  "lastTestedAt" TIMESTAMP(3),
  "nextReviewAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "security_control_implementations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_control_assessments" (
  "id" UUID NOT NULL,
  "assessmentNumber" TEXT NOT NULL,
  "implementationId" UUID NOT NULL,
  "assessorIdentityId" UUID NOT NULL,
  "result" "SecurityControlAssessmentResult" NOT NULL,
  "findingsSummary" TEXT,
  "evidenceReference" TEXT,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_control_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_findings" (
  "id" UUID NOT NULL,
  "findingNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "SecurityFindingSeverity" NOT NULL,
  "domain" "SecurityControlDomain" NOT NULL,
  "implementationId" UUID,
  "assessmentId" UUID,
  "ownerIdentityId" UUID NOT NULL,
  "riskAccepted" BOOLEAN NOT NULL DEFAULT false,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "identifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "security_findings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_exceptions" (
  "id" UUID NOT NULL,
  "exceptionNumber" TEXT NOT NULL,
  "controlDefinitionId" UUID NOT NULL,
  "implementationId" UUID,
  "businessJustification" TEXT NOT NULL,
  "scopeDescription" TEXT NOT NULL,
  "compensatingControls" TEXT NOT NULL,
  "riskDescription" TEXT NOT NULL,
  "ownerIdentityId" UUID NOT NULL,
  "approverIdentityId" UUID,
  "status" "SecurityExceptionStatus" NOT NULL DEFAULT 'REQUESTED',
  "severity" "SecurityFindingSeverity" NOT NULL,
  "isPermanent" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "reviewDate" TIMESTAMP(3) NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "security_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vulnerability_findings" (
  "id" UUID NOT NULL,
  "findingNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "SecurityFindingSeverity" NOT NULL,
  "cveId" TEXT,
  "affectedComponent" TEXT NOT NULL,
  "status" "VulnerabilityFindingStatus" NOT NULL DEFAULT 'OPEN',
  "ownerIdentityId" UUID NOT NULL,
  "identifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vulnerability_findings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vulnerability_remediations" (
  "id" UUID NOT NULL,
  "remediationNumber" TEXT NOT NULL,
  "findingId" UUID NOT NULL,
  "ownerIdentityId" UUID NOT NULL,
  "planDescription" TEXT NOT NULL,
  "status" "VulnerabilityRemediationStatus" NOT NULL DEFAULT 'PLANNED',
  "targetCompletionAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vulnerability_remediations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_assurance_reviews" (
  "id" UUID NOT NULL,
  "reviewNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "scopeDescription" TEXT NOT NULL,
  "reviewerIdentityId" UUID NOT NULL,
  "status" "SecurityAssuranceReviewStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "findingsSummary" TEXT,
  "accreditationGranted" BOOLEAN NOT NULL DEFAULT false,
  "operationalActivationApproved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "security_assurance_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cryptographic_key_references" (
  "id" UUID NOT NULL,
  "referenceCode" TEXT NOT NULL,
  "secretManagerReference" TEXT NOT NULL,
  "algorithm" TEXT NOT NULL,
  "keyPurpose" TEXT NOT NULL,
  "ownerIdentityId" UUID,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "rotationScheduleDays" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cryptographic_key_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "certificate_references" (
  "id" UUID NOT NULL,
  "referenceCode" TEXT NOT NULL,
  "secretManagerReference" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "issuer" TEXT NOT NULL,
  "serialNumber" TEXT,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "certificate_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trust_anchor_references" (
  "id" UUID NOT NULL,
  "referenceCode" TEXT NOT NULL,
  "secretManagerReference" TEXT NOT NULL,
  "anchorName" TEXT NOT NULL,
  "anchorType" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "trust_anchor_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cryptographic_assets" (
  "id" UUID NOT NULL,
  "assetCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "algorithm" TEXT NOT NULL,
  "algorithmVersion" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "dataOrSystemReference" TEXT NOT NULL,
  "keyReferenceId" UUID,
  "certificateReferenceId" UUID,
  "trustAnchorReferenceId" UUID,
  "ownerIdentityId" UUID NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "rotationScheduleDays" INTEGER,
  "cryptographicStrengthBits" INTEGER,
  "migrationStatus" "CryptographicMigrationStatus" NOT NULL DEFAULT 'CURRENT',
  "claimsPostQuantumSecurity" BOOLEAN NOT NULL DEFAULT false,
  "postQuantumValidated" BOOLEAN NOT NULL DEFAULT false,
  "historicalVerificationPreserved" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cryptographic_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cryptographic_policies" (
  "id" UUID NOT NULL,
  "policyCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "minimumKeyStrengthBits" INTEGER NOT NULL,
  "approvedAlgorithms" TEXT[] NOT NULL,
  "deprecatedAlgorithms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "ownerIdentityId" UUID NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cryptographic_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cryptographic_agility_assessments" (
  "id" UUID NOT NULL,
  "assessmentNumber" TEXT NOT NULL,
  "policyId" UUID NOT NULL,
  "assessorIdentityId" UUID NOT NULL,
  "canVersionAlgorithms" BOOLEAN NOT NULL DEFAULT false,
  "canRotateKeys" BOOLEAN NOT NULL DEFAULT false,
  "canReplaceCertificates" BOOLEAN NOT NULL DEFAULT false,
  "canChangeTrustAnchors" BOOLEAN NOT NULL DEFAULT false,
  "canIdentifyAffectedRecords" BOOLEAN NOT NULL DEFAULT false,
  "preservesHistoricalVerification" BOOLEAN NOT NULL DEFAULT false,
  "canMigrateWithoutDestroyingEvidence" BOOLEAN NOT NULL DEFAULT false,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cryptographic_agility_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "post_quantum_migration_items" (
  "id" UUID NOT NULL,
  "itemCode" TEXT NOT NULL,
  "componentReference" TEXT NOT NULL,
  "currentAlgorithm" TEXT NOT NULL,
  "targetAlgorithm" TEXT,
  "status" "PostQuantumMigrationStatus" NOT NULL DEFAULT 'IDENTIFIED',
  "ownerIdentityId" UUID NOT NULL,
  "riskAcceptanceReference" TEXT,
  "identifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "migratedAt" TIMESTAMP(3),
  "revalidationDueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "post_quantum_migration_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "software_component_records" (
  "id" UUID NOT NULL,
  "componentCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "componentType" "SoftwareComponentType" NOT NULL,
  "purl" TEXT,
  "license" TEXT,
  "ownerIdentityId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "software_component_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "software_bill_of_materials_records" (
  "id" UUID NOT NULL,
  "sbomCode" TEXT NOT NULL,
  "releaseReference" TEXT NOT NULL,
  "format" TEXT NOT NULL DEFAULT 'CycloneDX',
  "artifactDigest" TEXT NOT NULL,
  "componentInventory" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ownerIdentityId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "software_bill_of_materials_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dependency_vulnerability_records" (
  "id" UUID NOT NULL,
  "recordNumber" TEXT NOT NULL,
  "componentId" UUID,
  "packageName" TEXT NOT NULL,
  "packageVersion" TEXT NOT NULL,
  "cveId" TEXT,
  "severity" "SecurityFindingSeverity" NOT NULL,
  "isProductionBlocking" BOOLEAN NOT NULL DEFAULT false,
  "dispositionReference" TEXT,
  "ownerIdentityId" UUID NOT NULL,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dependency_vulnerability_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "build_provenance_records" (
  "id" UUID NOT NULL,
  "provenanceCode" TEXT NOT NULL,
  "sourceCommitSha" TEXT NOT NULL,
  "buildId" TEXT NOT NULL,
  "buildSystem" TEXT NOT NULL,
  "testRunReference" TEXT,
  "artifactDigest" TEXT NOT NULL,
  "status" "BuildProvenanceStatus" NOT NULL DEFAULT 'RECORDED',
  "verificationMethod" TEXT,
  "ownerIdentityId" UUID NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "build_provenance_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "release_artifact_attestations" (
  "id" UUID NOT NULL,
  "attestationNumber" TEXT NOT NULL,
  "releaseReference" TEXT NOT NULL,
  "sourceCommitSha" TEXT NOT NULL,
  "buildProvenanceId" UUID NOT NULL,
  "sbomRecordId" UUID,
  "artifactDigest" TEXT NOT NULL,
  "signatureReference" TEXT,
  "isSigned" BOOLEAN NOT NULL DEFAULT false,
  "status" "ReleaseAttestationStatus" NOT NULL DEFAULT 'PENDING',
  "approverIdentityId" UUID,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "release_artifact_attestations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_security_assessments" (
  "id" UUID NOT NULL,
  "assessmentNumber" TEXT NOT NULL,
  "vendorName" TEXT NOT NULL,
  "vendorReference" TEXT NOT NULL,
  "assessorIdentityId" UUID NOT NULL,
  "status" "VendorSecurityAssessmentStatus" NOT NULL DEFAULT 'PENDING',
  "findingsSummary" TEXT,
  "expiresAt" TIMESTAMP(3),
  "assessedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vendor_security_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "privileged_access_reviews" (
  "id" UUID NOT NULL,
  "reviewNumber" TEXT NOT NULL,
  "subjectIdentityId" UUID NOT NULL,
  "reviewerIdentityId" UUID NOT NULL,
  "environment" "SecurityEnvironment" NOT NULL,
  "accessPurpose" TEXT NOT NULL,
  "approvedScope" TEXT NOT NULL,
  "status" "PrivilegedAccessReviewStatus" NOT NULL DEFAULT 'SCHEDULED',
  "accessGrantedAt" TIMESTAMP(3),
  "accessExpiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "isSharedAdministratorAccount" BOOLEAN NOT NULL DEFAULT false,
  "reviewCompletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "privileged_access_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "break_glass_access_events" (
  "id" UUID NOT NULL,
  "eventNumber" TEXT NOT NULL,
  "actorIdentityId" UUID NOT NULL,
  "approverIdentityId" UUID,
  "reason" TEXT NOT NULL,
  "approvedScope" TEXT NOT NULL,
  "status" "BreakGlassAccessStatus" NOT NULL DEFAULT 'REQUESTED',
  "environment" "SecurityEnvironment" NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "postEventReviewCompleted" BOOLEAN NOT NULL DEFAULT false,
  "postEventReviewAt" TIMESTAMP(3),
  "enhancedLoggingReference" TEXT,
  "createsInstitutionalAuthority" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "break_glass_access_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_identity_reviews" (
  "id" UUID NOT NULL,
  "reviewNumber" TEXT NOT NULL,
  "serviceIdentityId" UUID NOT NULL,
  "reviewerIdentityId" UUID NOT NULL,
  "identityCategory" TEXT NOT NULL,
  "status" "ServiceIdentityReviewStatus" NOT NULL DEFAULT 'SCHEDULED',
  "isAnonymousOrShared" BOOLEAN NOT NULL DEFAULT false,
  "isConsequentialEnvironment" BOOLEAN NOT NULL DEFAULT false,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "findingsSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_identity_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credential_rotation_records" (
  "id" UUID NOT NULL,
  "rotationNumber" TEXT NOT NULL,
  "credentialId" UUID NOT NULL,
  "ownerIdentityId" UUID NOT NULL,
  "status" "CredentialRotationStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "secretManagerReference" TEXT NOT NULL,
  "previousReferenceRetained" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "credential_rotation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_test_executions" (
  "id" UUID NOT NULL,
  "executionNumber" TEXT NOT NULL,
  "category" "SecurityTestCategory" NOT NULL,
  "environment" "SecurityEnvironment" NOT NULL,
  "executorIdentityId" UUID NOT NULL,
  "targetReference" TEXT NOT NULL,
  "passed" BOOLEAN NOT NULL,
  "findingsSummary" TEXT,
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_test_executions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "security_assets_assetCode_key" ON "security_assets"("assetCode");
CREATE UNIQUE INDEX "security_control_definitions_controlCode_key" ON "security_control_definitions"("controlCode");
CREATE UNIQUE INDEX "security_control_implementations_implementationCode_key" ON "security_control_implementations"("implementationCode");
CREATE UNIQUE INDEX "security_control_assessments_assessmentNumber_key" ON "security_control_assessments"("assessmentNumber");
CREATE UNIQUE INDEX "security_findings_findingNumber_key" ON "security_findings"("findingNumber");
CREATE UNIQUE INDEX "security_exceptions_exceptionNumber_key" ON "security_exceptions"("exceptionNumber");
CREATE UNIQUE INDEX "vulnerability_findings_findingNumber_key" ON "vulnerability_findings"("findingNumber");
CREATE UNIQUE INDEX "vulnerability_remediations_remediationNumber_key" ON "vulnerability_remediations"("remediationNumber");
CREATE UNIQUE INDEX "security_assurance_reviews_reviewNumber_key" ON "security_assurance_reviews"("reviewNumber");
CREATE UNIQUE INDEX "cryptographic_key_references_referenceCode_key" ON "cryptographic_key_references"("referenceCode");
CREATE UNIQUE INDEX "certificate_references_referenceCode_key" ON "certificate_references"("referenceCode");
CREATE UNIQUE INDEX "trust_anchor_references_referenceCode_key" ON "trust_anchor_references"("referenceCode");
CREATE UNIQUE INDEX "cryptographic_assets_assetCode_key" ON "cryptographic_assets"("assetCode");
CREATE UNIQUE INDEX "cryptographic_policies_policyCode_key" ON "cryptographic_policies"("policyCode");
CREATE UNIQUE INDEX "cryptographic_agility_assessments_assessmentNumber_key" ON "cryptographic_agility_assessments"("assessmentNumber");
CREATE UNIQUE INDEX "post_quantum_migration_items_itemCode_key" ON "post_quantum_migration_items"("itemCode");
CREATE UNIQUE INDEX "software_component_records_componentCode_key" ON "software_component_records"("componentCode");
CREATE UNIQUE INDEX "software_bill_of_materials_records_sbomCode_key" ON "software_bill_of_materials_records"("sbomCode");
CREATE UNIQUE INDEX "dependency_vulnerability_records_recordNumber_key" ON "dependency_vulnerability_records"("recordNumber");
CREATE UNIQUE INDEX "build_provenance_records_provenanceCode_key" ON "build_provenance_records"("provenanceCode");
CREATE UNIQUE INDEX "release_artifact_attestations_attestationNumber_key" ON "release_artifact_attestations"("attestationNumber");
CREATE UNIQUE INDEX "vendor_security_assessments_assessmentNumber_key" ON "vendor_security_assessments"("assessmentNumber");
CREATE UNIQUE INDEX "privileged_access_reviews_reviewNumber_key" ON "privileged_access_reviews"("reviewNumber");
CREATE UNIQUE INDEX "break_glass_access_events_eventNumber_key" ON "break_glass_access_events"("eventNumber");
CREATE UNIQUE INDEX "service_identity_reviews_reviewNumber_key" ON "service_identity_reviews"("reviewNumber");
CREATE UNIQUE INDEX "credential_rotation_records_rotationNumber_key" ON "credential_rotation_records"("rotationNumber");
CREATE UNIQUE INDEX "security_test_executions_executionNumber_key" ON "security_test_executions"("executionNumber");

CREATE INDEX "security_assets_ownerIdentityId_idx" ON "security_assets"("ownerIdentityId");
CREATE INDEX "security_control_definitions_domain_idx" ON "security_control_definitions"("domain");
CREATE INDEX "security_control_implementations_controlDefinitionId_idx" ON "security_control_implementations"("controlDefinitionId");
CREATE INDEX "security_control_implementations_assetId_idx" ON "security_control_implementations"("assetId");
CREATE INDEX "security_control_implementations_status_idx" ON "security_control_implementations"("status");
CREATE INDEX "security_findings_severity_idx" ON "security_findings"("severity");
CREATE INDEX "security_findings_isOpen_idx" ON "security_findings"("isOpen");
CREATE INDEX "security_exceptions_status_idx" ON "security_exceptions"("status");
CREATE INDEX "security_exceptions_expiresAt_idx" ON "security_exceptions"("expiresAt");
CREATE INDEX "vulnerability_findings_status_idx" ON "vulnerability_findings"("status");
CREATE INDEX "cryptographic_assets_migrationStatus_idx" ON "cryptographic_assets"("migrationStatus");
CREATE INDEX "post_quantum_migration_items_status_idx" ON "post_quantum_migration_items"("status");
CREATE INDEX "dependency_vulnerability_records_severity_idx" ON "dependency_vulnerability_records"("severity");
CREATE INDEX "dependency_vulnerability_records_isProductionBlocking_idx" ON "dependency_vulnerability_records"("isProductionBlocking");
CREATE INDEX "build_provenance_records_status_idx" ON "build_provenance_records"("status");
CREATE INDEX "release_artifact_attestations_status_idx" ON "release_artifact_attestations"("status");
CREATE INDEX "break_glass_access_events_status_idx" ON "break_glass_access_events"("status");
CREATE INDEX "break_glass_access_events_expiresAt_idx" ON "break_glass_access_events"("expiresAt");
CREATE INDEX "credential_rotation_records_status_idx" ON "credential_rotation_records"("status");
CREATE INDEX "security_test_executions_category_idx" ON "security_test_executions"("category");

ALTER TABLE "security_assets" ADD CONSTRAINT "security_assets_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_control_definitions" ADD CONSTRAINT "security_control_definitions_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_control_implementations" ADD CONSTRAINT "security_control_implementations_controlDefinitionId_fkey" FOREIGN KEY ("controlDefinitionId") REFERENCES "security_control_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_control_implementations" ADD CONSTRAINT "security_control_implementations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "security_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_control_implementations" ADD CONSTRAINT "security_control_implementations_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_control_assessments" ADD CONSTRAINT "security_control_assessments_implementationId_fkey" FOREIGN KEY ("implementationId") REFERENCES "security_control_implementations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_control_assessments" ADD CONSTRAINT "security_control_assessments_assessorIdentityId_fkey" FOREIGN KEY ("assessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_findings" ADD CONSTRAINT "security_findings_implementationId_fkey" FOREIGN KEY ("implementationId") REFERENCES "security_control_implementations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "security_findings" ADD CONSTRAINT "security_findings_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "security_control_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "security_findings" ADD CONSTRAINT "security_findings_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_exceptions" ADD CONSTRAINT "security_exceptions_controlDefinitionId_fkey" FOREIGN KEY ("controlDefinitionId") REFERENCES "security_control_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_exceptions" ADD CONSTRAINT "security_exceptions_implementationId_fkey" FOREIGN KEY ("implementationId") REFERENCES "security_control_implementations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "security_exceptions" ADD CONSTRAINT "security_exceptions_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_exceptions" ADD CONSTRAINT "security_exceptions_approverIdentityId_fkey" FOREIGN KEY ("approverIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vulnerability_findings" ADD CONSTRAINT "vulnerability_findings_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vulnerability_remediations" ADD CONSTRAINT "vulnerability_remediations_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "vulnerability_findings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vulnerability_remediations" ADD CONSTRAINT "vulnerability_remediations_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_assurance_reviews" ADD CONSTRAINT "security_assurance_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cryptographic_assets" ADD CONSTRAINT "cryptographic_assets_keyReferenceId_fkey" FOREIGN KEY ("keyReferenceId") REFERENCES "cryptographic_key_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cryptographic_assets" ADD CONSTRAINT "cryptographic_assets_certificateReferenceId_fkey" FOREIGN KEY ("certificateReferenceId") REFERENCES "certificate_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cryptographic_assets" ADD CONSTRAINT "cryptographic_assets_trustAnchorReferenceId_fkey" FOREIGN KEY ("trustAnchorReferenceId") REFERENCES "trust_anchor_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cryptographic_assets" ADD CONSTRAINT "cryptographic_assets_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cryptographic_policies" ADD CONSTRAINT "cryptographic_policies_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cryptographic_agility_assessments" ADD CONSTRAINT "cryptographic_agility_assessments_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "cryptographic_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cryptographic_agility_assessments" ADD CONSTRAINT "cryptographic_agility_assessments_assessorIdentityId_fkey" FOREIGN KEY ("assessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "post_quantum_migration_items" ADD CONSTRAINT "post_quantum_migration_items_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "software_component_records" ADD CONSTRAINT "software_component_records_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "software_bill_of_materials_records" ADD CONSTRAINT "software_bill_of_materials_records_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dependency_vulnerability_records" ADD CONSTRAINT "dependency_vulnerability_records_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "software_component_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dependency_vulnerability_records" ADD CONSTRAINT "dependency_vulnerability_records_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "build_provenance_records" ADD CONSTRAINT "build_provenance_records_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "release_artifact_attestations" ADD CONSTRAINT "release_artifact_attestations_buildProvenanceId_fkey" FOREIGN KEY ("buildProvenanceId") REFERENCES "build_provenance_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "release_artifact_attestations" ADD CONSTRAINT "release_artifact_attestations_sbomRecordId_fkey" FOREIGN KEY ("sbomRecordId") REFERENCES "software_bill_of_materials_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "release_artifact_attestations" ADD CONSTRAINT "release_artifact_attestations_approverIdentityId_fkey" FOREIGN KEY ("approverIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_security_assessments" ADD CONSTRAINT "vendor_security_assessments_assessorIdentityId_fkey" FOREIGN KEY ("assessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privileged_access_reviews" ADD CONSTRAINT "privileged_access_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "break_glass_access_events" ADD CONSTRAINT "break_glass_access_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "break_glass_access_events" ADD CONSTRAINT "break_glass_access_events_approverIdentityId_fkey" FOREIGN KEY ("approverIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_identity_reviews" ADD CONSTRAINT "service_identity_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credential_rotation_records" ADD CONSTRAINT "credential_rotation_records_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credential_rotation_records" ADD CONSTRAINT "credential_rotation_records_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_test_executions" ADD CONSTRAINT "security_test_executions_executorIdentityId_fkey" FOREIGN KEY ("executorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
