-- Phase 10F: Statutory and External Redress Pathways

CREATE TYPE "ExternalReviewStatus" AS ENUM (
  'PREPARATION',
  'READY_FOR_TRANSMISSION',
  'TRANSMITTED',
  'ACKNOWLEDGED',
  'UNDER_EXTERNAL_REVIEW',
  'FURTHER_INFORMATION_REQUESTED',
  'HEARING_SCHEDULED',
  'EXTERNAL_DETERMINATION_RECEIVED',
  'IMPLEMENTATION_PENDING',
  'CLOSED',
  'UNKNOWN',
  'SAFE_HALTED'
);

CREATE TYPE "ExternalReviewRouteType" AS ENUM (
  'STATUTORY_APPEAL',
  'PROFESSIONAL_CHALLENGE',
  'REGULATORY_REVIEW',
  'OMBUDS_OVERSIGHT',
  'JUDICIAL_REVIEW',
  'OTHER_EXTERNAL'
);

CREATE TYPE "ExternalAuthorityBindingClass" AS ENUM (
  'BINDING',
  'RECOMMENDATORY',
  'INFORMATIONAL',
  'UNKNOWN'
);

CREATE TYPE "ExternalDeterminationAuthenticityStatus" AS ENUM (
  'UNVERIFIED',
  'PENDING_VERIFICATION',
  'AUTHENTICATED',
  'REJECTED'
);

CREATE TYPE "ProfessionalChallengeAuthorityType" AS ENUM (
  'PROFESSIONAL_BODY',
  'LICENSE_BOARD',
  'NAMED_REVIEWING_PROFESSIONAL',
  'OTHER_COMPETENT_BODY'
);

CREATE TYPE "ExternalReviewTransmissionMethod" AS ENUM (
  'SECURE_PORTAL',
  'REGISTERED_MAIL',
  'EMAIL',
  'IN_PERSON',
  'ELECTRONIC_FILING',
  'OTHER'
);

CREATE TYPE "RetainedAppealAuthorityClass" AS ENUM (
  'NATIONAL_STATUTORY',
  'PROFESSIONAL_DISCIPLINE',
  'REGULATORY',
  'JUDICIAL',
  'OTHER_RETAINED'
);

ALTER TABLE "redress_matters" ADD COLUMN "retainsNationalAppealAuthority" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "redress_matters" ADD COLUMN "blocksInternalAdjudication" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "redress_matters" ADD COLUMN "retainedAuthorityClass" "RetainedAppealAuthorityClass";

CREATE TABLE "external_review_referrals" (
  "id" UUID NOT NULL,
  "referralNumber" TEXT NOT NULL,
  "redressMatterId" UUID NOT NULL,
  "caseId" UUID,
  "routeType" "ExternalReviewRouteType" NOT NULL,
  "competentAuthority" TEXT NOT NULL,
  "externalAuthorityId" UUID,
  "routeVersion" TEXT NOT NULL,
  "authorityPurpose" TEXT NOT NULL,
  "standingRecordReference" TEXT,
  "timelinessRecordReference" TEXT,
  "challengedDecisionId" UUID,
  "challengedInstrumentId" UUID,
  "grounds" TEXT NOT NULL,
  "requestedRemedy" TEXT,
  "recordTransmitted" BOOLEAN NOT NULL DEFAULT false,
  "evidenceManifestReference" TEXT,
  "securityClassification" TEXT NOT NULL,
  "transmissionMethod" "ExternalReviewTransmissionMethod",
  "status" "ExternalReviewStatus" NOT NULL DEFAULT 'PREPARATION',
  "retainsNationalAuthority" BOOLEAN NOT NULL DEFAULT false,
  "retainedAuthorityClass" "RetainedAppealAuthorityClass",
  "blocksInternalAdjudication" BOOLEAN NOT NULL DEFAULT false,
  "sentAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "externalReference" TEXT,
  "preparedByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "external_review_referrals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_review_packages" (
  "id" UUID NOT NULL,
  "referralId" UUID NOT NULL,
  "packageVersion" INTEGER NOT NULL,
  "evidencePacketVersionId" UUID NOT NULL,
  "canonicalManifest" JSONB NOT NULL,
  "manifestHash" TEXT NOT NULL,
  "securityClassification" TEXT NOT NULL,
  "documentVersionPins" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_review_packages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_review_acknowledgments" (
  "id" UUID NOT NULL,
  "referralId" UUID NOT NULL,
  "acknowledgedByAuthority" TEXT NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL,
  "externalReference" TEXT,
  "authenticityStatus" "ExternalDeterminationAuthenticityStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "authenticityVerificationRef" TEXT,
  "receivedFromSource" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_review_acknowledgments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_review_status_records" (
  "id" UUID NOT NULL,
  "referralId" UUID NOT NULL,
  "status" "ExternalReviewStatus" NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceAuthority" TEXT,
  "sourceReference" TEXT,
  "notes" TEXT,
  "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_review_status_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_review_determinations" (
  "id" UUID NOT NULL,
  "referralId" UUID NOT NULL,
  "sourceAuthority" TEXT NOT NULL,
  "authenticityStatus" "ExternalDeterminationAuthenticityStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "authenticityVerificationRef" TEXT,
  "officialReference" TEXT,
  "decisionDate" TIMESTAMP(3),
  "receivedDate" TIMESTAMP(3) NOT NULL,
  "outcomeText" TEXT NOT NULL,
  "reasonsReference" TEXT,
  "effectiveDate" TIMESTAMP(3),
  "stayInterimEffect" TEXT,
  "remedyText" TEXT,
  "furtherRightsText" TEXT,
  "instrumentOrderReference" TEXT,
  "conditionsText" TEXT,
  "implementationRequirements" TEXT,
  "verificationMethod" TEXT,
  "bindingClass" "ExternalAuthorityBindingClass" NOT NULL DEFAULT 'UNKNOWN',
  "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
  "implementationAuthorized" BOOLEAN NOT NULL DEFAULT false,
  "recordedByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "external_review_determinations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_challenge_referrals" (
  "id" UUID NOT NULL,
  "referralId" UUID NOT NULL,
  "redressMatterId" UUID NOT NULL,
  "competentAuthorityType" "ProfessionalChallengeAuthorityType" NOT NULL,
  "professionalBodyReference" TEXT NOT NULL,
  "challengeTargetReference" TEXT NOT NULL,
  "challengedFindingReference" TEXT NOT NULL,
  "independencePreserved" BOOLEAN NOT NULL DEFAULT true,
  "technologySubstitutesAuthority" BOOLEAN NOT NULL DEFAULT false,
  "status" "ExternalReviewStatus" NOT NULL DEFAULT 'PREPARATION',
  "externalReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "professional_challenge_referrals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "regulatory_review_referrals" (
  "id" UUID NOT NULL,
  "referralId" UUID NOT NULL,
  "redressMatterId" UUID NOT NULL,
  "regulatorReference" TEXT NOT NULL,
  "regulatoryMatterReference" TEXT,
  "regulatorStatusText" TEXT,
  "inferredApprovalFromSilence" BOOLEAN NOT NULL DEFAULT false,
  "status" "ExternalReviewStatus" NOT NULL DEFAULT 'PREPARATION',
  "externalReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "regulatory_review_referrals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ombuds_oversight_referrals" (
  "id" UUID NOT NULL,
  "referralId" UUID NOT NULL,
  "redressMatterId" UUID NOT NULL,
  "ombudsReference" TEXT NOT NULL,
  "oversightPurpose" TEXT NOT NULL,
  "bindingClass" "ExternalAuthorityBindingClass" NOT NULL DEFAULT 'RECOMMENDATORY',
  "isRecommendatoryOnly" BOOLEAN NOT NULL DEFAULT true,
  "status" "ExternalReviewStatus" NOT NULL DEFAULT 'PREPARATION',
  "externalReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ombuds_oversight_referrals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "judicial_review_information_records" (
  "id" UUID NOT NULL,
  "referralId" UUID NOT NULL,
  "redressMatterId" UUID NOT NULL,
  "routeInformation" TEXT NOT NULL,
  "deadlineInformation" TEXT,
  "competentForum" TEXT NOT NULL,
  "filingReference" TEXT,
  "caseStatusText" TEXT,
  "caseStatusAuthenticated" BOOLEAN NOT NULL DEFAULT false,
  "exportAssistanceReference" TEXT,
  "isCourtSystem" BOOLEAN NOT NULL DEFAULT false,
  "outcomeCharacterization" TEXT,
  "outcomeAuthenticated" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "judicial_review_information_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_review_referrals_referralNumber_key" ON "external_review_referrals"("referralNumber");
CREATE INDEX "external_review_referrals_redressMatterId_idx" ON "external_review_referrals"("redressMatterId");
CREATE INDEX "external_review_referrals_caseId_idx" ON "external_review_referrals"("caseId");
CREATE INDEX "external_review_referrals_status_idx" ON "external_review_referrals"("status");
CREATE INDEX "external_review_referrals_routeType_idx" ON "external_review_referrals"("routeType");
CREATE INDEX "external_review_referrals_externalAuthorityId_idx" ON "external_review_referrals"("externalAuthorityId");

CREATE UNIQUE INDEX "external_review_packages_referralId_packageVersion_key" ON "external_review_packages"("referralId", "packageVersion");
CREATE INDEX "external_review_packages_referralId_idx" ON "external_review_packages"("referralId");
CREATE INDEX "external_review_packages_evidencePacketVersionId_idx" ON "external_review_packages"("evidencePacketVersionId");
CREATE INDEX "external_review_packages_manifestHash_idx" ON "external_review_packages"("manifestHash");

CREATE INDEX "external_review_acknowledgments_referralId_idx" ON "external_review_acknowledgments"("referralId");
CREATE INDEX "external_review_acknowledgments_acknowledgedAt_idx" ON "external_review_acknowledgments"("acknowledgedAt");

CREATE INDEX "external_review_status_records_referralId_idx" ON "external_review_status_records"("referralId");
CREATE INDEX "external_review_status_records_status_idx" ON "external_review_status_records"("status");
CREATE INDEX "external_review_status_records_recordedAt_idx" ON "external_review_status_records"("recordedAt");

CREATE UNIQUE INDEX "external_review_determinations_referralId_key" ON "external_review_determinations"("referralId");
CREATE INDEX "external_review_determinations_authenticityStatus_idx" ON "external_review_determinations"("authenticityStatus");
CREATE INDEX "external_review_determinations_bindingClass_idx" ON "external_review_determinations"("bindingClass");
CREATE INDEX "external_review_determinations_isAuthenticated_idx" ON "external_review_determinations"("isAuthenticated");

CREATE UNIQUE INDEX "professional_challenge_referrals_referralId_key" ON "professional_challenge_referrals"("referralId");
CREATE INDEX "professional_challenge_referrals_redressMatterId_idx" ON "professional_challenge_referrals"("redressMatterId");
CREATE INDEX "professional_challenge_referrals_status_idx" ON "professional_challenge_referrals"("status");

CREATE UNIQUE INDEX "regulatory_review_referrals_referralId_key" ON "regulatory_review_referrals"("referralId");
CREATE INDEX "regulatory_review_referrals_redressMatterId_idx" ON "regulatory_review_referrals"("redressMatterId");
CREATE INDEX "regulatory_review_referrals_status_idx" ON "regulatory_review_referrals"("status");

CREATE UNIQUE INDEX "ombuds_oversight_referrals_referralId_key" ON "ombuds_oversight_referrals"("referralId");
CREATE INDEX "ombuds_oversight_referrals_redressMatterId_idx" ON "ombuds_oversight_referrals"("redressMatterId");
CREATE INDEX "ombuds_oversight_referrals_status_idx" ON "ombuds_oversight_referrals"("status");

CREATE UNIQUE INDEX "judicial_review_information_records_referralId_key" ON "judicial_review_information_records"("referralId");
CREATE INDEX "judicial_review_information_records_redressMatterId_idx" ON "judicial_review_information_records"("redressMatterId");

ALTER TABLE "external_review_referrals" ADD CONSTRAINT "external_review_referrals_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "external_review_referrals" ADD CONSTRAINT "external_review_referrals_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "external_review_referrals" ADD CONSTRAINT "external_review_referrals_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "external_review_referrals" ADD CONSTRAINT "external_review_referrals_challengedDecisionId_fkey" FOREIGN KEY ("challengedDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "external_review_referrals" ADD CONSTRAINT "external_review_referrals_challengedInstrumentId_fkey" FOREIGN KEY ("challengedInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "external_review_referrals" ADD CONSTRAINT "external_review_referrals_preparedByIdentityId_fkey" FOREIGN KEY ("preparedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "external_review_packages" ADD CONSTRAINT "external_review_packages_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "external_review_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_review_packages" ADD CONSTRAINT "external_review_packages_evidencePacketVersionId_fkey" FOREIGN KEY ("evidencePacketVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "external_review_acknowledgments" ADD CONSTRAINT "external_review_acknowledgments_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "external_review_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_review_status_records" ADD CONSTRAINT "external_review_status_records_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "external_review_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_review_determinations" ADD CONSTRAINT "external_review_determinations_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "external_review_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_review_determinations" ADD CONSTRAINT "external_review_determinations_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "professional_challenge_referrals" ADD CONSTRAINT "professional_challenge_referrals_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "external_review_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "professional_challenge_referrals" ADD CONSTRAINT "professional_challenge_referrals_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "regulatory_review_referrals" ADD CONSTRAINT "regulatory_review_referrals_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "external_review_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "regulatory_review_referrals" ADD CONSTRAINT "regulatory_review_referrals_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ombuds_oversight_referrals" ADD CONSTRAINT "ombuds_oversight_referrals_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "external_review_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ombuds_oversight_referrals" ADD CONSTRAINT "ombuds_oversight_referrals_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "judicial_review_information_records" ADD CONSTRAINT "judicial_review_information_records_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "external_review_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judicial_review_information_records" ADD CONSTRAINT "judicial_review_information_records_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
