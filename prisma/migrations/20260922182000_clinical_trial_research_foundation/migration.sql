-- Clinical trial registry & clinical research enrollment foundation (jurisdiction-neutral)

CREATE TYPE "ClinicalResearchDataClassification" AS ENUM (
  'PUBLIC',
  'OFFICIAL',
  'OFFICIAL_SENSITIVE',
  'PROTECTED_PARTICIPANT',
  'PROTECTED_HEALTH'
);

CREATE TYPE "ClinicalTrialListingLifecycleStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED_FOR_LISTING',
  'RECRUITING',
  'ACTIVE_NOT_RECRUITING',
  'SUSPENDED',
  'TERMINATED',
  'COMPLETED',
  'ARCHIVED'
);

CREATE TYPE "ClinicalTrialRecruitmentStatus" AS ENUM (
  'NOT_YET_RECRUITING',
  'RECRUITING',
  'ENROLLING_BY_INVITATION',
  'ACTIVE_NOT_RECRUITING',
  'COMPLETED',
  'SUSPENDED',
  'WITHDRAWN',
  'UNKNOWN'
);

CREATE TYPE "PreliminaryTrialMatchOutcome" AS ENUM (
  'POTENTIAL_MATCH',
  'NOT_ENOUGH_INFORMATION',
  'LIKELY_NOT_MATCH'
);

CREATE TYPE "ClinicalTrialEligibilityAssessmentOutcome" AS ENUM (
  'INCOMPLETE',
  'DETERMINED_MEETS_PROFESSIONAL_CRITERIA',
  'DETERMINED_DOES_NOT_MEET',
  'INCONCLUSIVE_REQUIRES_FOLLOWUP'
);

CREATE TYPE "ClinicalTrialScreeningReviewOutcome" AS ENUM (
  'PENDING',
  'PROCEED_TO_CONSENT',
  'DECLINED_BY_PARTICIPANT',
  'INELIGIBLE_BY_PROFESSIONAL_REVIEW',
  'REQUIRES_ADDITIONAL_INFORMATION'
);

CREATE TYPE "ResearchEthicsApprovalStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'CONDITIONALLY_APPROVED',
  'SUSPENDED',
  'EXPIRED',
  'WITHDRAWN',
  'NOT_APPROVED'
);

CREATE TYPE "ClinicalRegulatoryApprovalStatus" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'AUTHORIZED',
  'CONDITIONALLY_AUTHORIZED',
  'SUSPENDED',
  'REVOKED',
  'EXPIRED'
);

CREATE TYPE "ClinicalTrialInterestStatus" AS ENUM (
  'EXPRESSED',
  'WITHDRAWN',
  'CLOSED'
);

CREATE TYPE "ClinicalTrialScreeningStatus" AS ENUM (
  'AUTHORIZED',
  'IN_PROGRESS',
  'PENDING_PROFESSIONAL_REVIEW',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "ClinicalTrialConsentSignatureStatus" AS ENUM (
  'PENDING',
  'SIGNED',
  'WITHDRAWN',
  'SUPERSEDED'
);

CREATE TYPE "ClinicalTrialEnrollmentStatus" AS ENUM (
  'PENDING',
  'ENROLLED',
  'ACTIVE',
  'COMPLETED',
  'WITHDRAWN',
  'SUSPENDED'
);

CREATE TYPE "ClinicalTrialWithdrawalReasonCategory" AS ENUM (
  'PARTICIPANT_REQUEST',
  'INVESTIGATOR_DECISION',
  'SAFETY',
  'PROTOCOL_DEVIATION',
  'LOST_TO_FOLLOWUP',
  'OTHER_DOCUMENTED'
);

CREATE TYPE "ClinicalResearchActorPersona" AS ENUM (
  'CITIZEN',
  'PARTICIPANT',
  'TRIAL_SPONSOR',
  'SITE_COORDINATOR',
  'INVESTIGATOR',
  'ETHICS_COMMITTEE',
  'REGULATORY_AUTHORITY',
  'AUTHORIZED_PROFESSIONAL',
  'TECHNICAL_ADMIN',
  'AI_ASSISTANCE',
  'SYSTEM'
);

CREATE TABLE "clinical_trial_phase_references" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_phase_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_condition_references" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "categoryCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_condition_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_intervention_references" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_intervention_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_sponsors" (
  "id" UUID NOT NULL,
  "sponsorReference" TEXT NOT NULL,
  "institutionId" UUID,
  "organizationIdentityId" UUID,
  "displayName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_sponsors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trials" (
  "id" UUID NOT NULL,
  "trialNumber" TEXT NOT NULL,
  "jurisdictionId" UUID NOT NULL,
  "sponsorId" UUID NOT NULL,
  "listingLifecycleStatus" "ClinicalTrialListingLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
  "recruitmentStatus" "ClinicalTrialRecruitmentStatus" NOT NULL DEFAULT 'NOT_YET_RECRUITING',
  "phaseReferenceId" UUID,
  "conditionReferenceId" UUID,
  "interventionReferenceId" UUID,
  "minimumAgeYears" INTEGER,
  "maximumAgeYears" INTEGER,
  "locationSummary" TEXT,
  "isPubliclyDiscoverable" BOOLEAN NOT NULL DEFAULT false,
  "listingIsNotRegulatoryApproval" BOOLEAN NOT NULL DEFAULT true,
  "discoveryIsNotRecommendation" BOOLEAN NOT NULL DEFAULT true,
  "currentTrialVersionId" UUID,
  "currentProtocolVersionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_versions" (
  "id" UUID NOT NULL,
  "clinicalTrialId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "publicSummary" TEXT NOT NULL,
  "broadEligibilitySummary" TEXT,
  "activatedAt" TIMESTAMP(3),
  "isImmutable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_protocols" (
  "id" UUID NOT NULL,
  "clinicalTrialId" UUID NOT NULL,
  "protocolIdentifier" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_protocols_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_protocol_versions" (
  "id" UUID NOT NULL,
  "protocolId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "amendmentSummary" TEXT,
  "activatedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "isImmutable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_protocol_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_sites" (
  "id" UUID NOT NULL,
  "clinicalTrialId" UUID NOT NULL,
  "siteReference" TEXT NOT NULL,
  "institutionId" UUID,
  "locationSummary" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_sites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_investigators" (
  "id" UUID NOT NULL,
  "clinicalTrialSiteId" UUID NOT NULL,
  "officeholderId" UUID,
  "professionalIdentityId" UUID,
  "displayName" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_investigators_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_principal_investigators" (
  "id" UUID NOT NULL,
  "clinicalTrialId" UUID NOT NULL,
  "clinicalTrialSiteId" UUID,
  "investigatorId" UUID,
  "officeholderId" UUID,
  "displayName" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_principal_investigators_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "research_ethics_approvals" (
  "id" UUID NOT NULL,
  "clinicalTrialId" UUID NOT NULL,
  "approvalReference" TEXT NOT NULL,
  "status" "ResearchEthicsApprovalStatus" NOT NULL DEFAULT 'DRAFT',
  "currentVersionId" UUID,
  "blocksEnrollmentWhenInactive" BOOLEAN NOT NULL DEFAULT true,
  "sponsorSelfApprovalForbidden" BOOLEAN NOT NULL DEFAULT true,
  "ethicsIsNotRegulatoryApproval" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "research_ethics_approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "research_ethics_approval_versions" (
  "id" UUID NOT NULL,
  "researchEthicsApprovalId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "committeeInstitutionId" UUID,
  "approvedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "documentReference" TEXT,
  "recordedByOfficeholderId" UUID,
  "recordedByPersona" "ClinicalResearchActorPersona" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "research_ethics_approval_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_regulatory_approvals" (
  "id" UUID NOT NULL,
  "clinicalTrialId" UUID NOT NULL,
  "approvalReference" TEXT NOT NULL,
  "status" "ClinicalRegulatoryApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "regulatoryIsNotEthicsApproval" BOOLEAN NOT NULL DEFAULT true,
  "blocksEnrollmentWhenInactive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_regulatory_approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_regulatory_statuses" (
  "id" UUID NOT NULL,
  "clinicalRegulatoryApprovalId" UUID NOT NULL,
  "fromStatus" "ClinicalRegulatoryApprovalStatus",
  "toStatus" "ClinicalRegulatoryApprovalStatus" NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorPersona" "ClinicalResearchActorPersona" NOT NULL,
  "actorIdentityId" UUID,
  "reasonSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_regulatory_statuses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_external_registry_references" (
  "id" UUID NOT NULL,
  "clinicalTrialId" UUID NOT NULL,
  "registryCode" TEXT NOT NULL,
  "registryTrialId" TEXT NOT NULL,
  "registryUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_external_registry_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_research_participant_profiles" (
  "id" UUID NOT NULL,
  "participantReference" TEXT NOT NULL,
  "subjectIdentityId" UUID NOT NULL,
  "jurisdictionId" UUID,
  "dataClassification" "ClinicalResearchDataClassification" NOT NULL DEFAULT 'PROTECTED_PARTICIPANT',
  "dataCompartmentCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_research_participant_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_eligibility_criteria" (
  "id" UUID NOT NULL,
  "clinicalTrialId" UUID NOT NULL,
  "criterionCode" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "isInclusion" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_eligibility_criteria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_interests" (
  "id" UUID NOT NULL,
  "clinicalTrialId" UUID NOT NULL,
  "participantProfileId" UUID NOT NULL,
  "status" "ClinicalTrialInterestStatus" NOT NULL DEFAULT 'EXPRESSED',
  "interestIsNotEnrollment" BOOLEAN NOT NULL DEFAULT true,
  "expressedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_interests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_screenings" (
  "id" UUID NOT NULL,
  "clinicalTrialId" UUID NOT NULL,
  "participantProfileId" UUID NOT NULL,
  "interestId" UUID,
  "status" "ClinicalTrialScreeningStatus" NOT NULL DEFAULT 'AUTHORIZED',
  "patientAuthorizationRecordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "screeningDataReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_screenings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_screening_reviews" (
  "id" UUID NOT NULL,
  "screeningId" UUID NOT NULL,
  "reviewerOfficeholderId" UUID,
  "reviewerProfessionalIdentityId" UUID,
  "reviewerPersona" "ClinicalResearchActorPersona" NOT NULL,
  "outcome" "ClinicalTrialScreeningReviewOutcome" NOT NULL DEFAULT 'PENDING',
  "reasonCategoryCode" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "auditReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_screening_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_eligibility_assessments" (
  "id" UUID NOT NULL,
  "screeningId" UUID NOT NULL,
  "assessorOfficeholderId" UUID,
  "assessorProfessionalIdentityId" UUID,
  "assessorPersona" "ClinicalResearchActorPersona" NOT NULL,
  "outcome" "ClinicalTrialEligibilityAssessmentOutcome" NOT NULL DEFAULT 'INCOMPLETE',
  "isProfessionalEligibilityDecision" BOOLEAN NOT NULL DEFAULT true,
  "aiCannotFinalizeEligibility" BOOLEAN NOT NULL DEFAULT true,
  "assessedAt" TIMESTAMP(3),
  "reasonCategoryCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_eligibility_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_eligibility_evidence" (
  "id" UUID NOT NULL,
  "eligibilityAssessmentId" UUID NOT NULL,
  "evidenceReference" TEXT NOT NULL,
  "summary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_trial_eligibility_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_consents" (
  "id" UUID NOT NULL,
  "clinicalTrialId" UUID NOT NULL,
  "consentCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_consents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_consent_versions" (
  "id" UUID NOT NULL,
  "consentId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "contentReference" TEXT NOT NULL,
  "activatedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_consent_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_consent_signatures" (
  "id" UUID NOT NULL,
  "participantProfileId" UUID NOT NULL,
  "consentVersionId" UUID NOT NULL,
  "status" "ClinicalTrialConsentSignatureStatus" NOT NULL DEFAULT 'PENDING',
  "signedAt" TIMESTAMP(3),
  "consentIsNotEnrollment" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_consent_signatures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_enrollments" (
  "id" UUID NOT NULL,
  "enrollmentReference" TEXT NOT NULL,
  "clinicalTrialId" UUID NOT NULL,
  "clinicalTrialSiteId" UUID NOT NULL,
  "participantProfileId" UUID NOT NULL,
  "protocolVersionId" UUID NOT NULL,
  "consentVersionId" UUID NOT NULL,
  "eligibilityAssessmentId" UUID NOT NULL,
  "status" "ClinicalTrialEnrollmentStatus" NOT NULL DEFAULT 'PENDING',
  "enrolledAt" TIMESTAMP(3),
  "participationIsNotTreatment" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_trial_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_enrollment_status_histories" (
  "id" UUID NOT NULL,
  "enrollmentId" UUID NOT NULL,
  "fromStatus" "ClinicalTrialEnrollmentStatus",
  "toStatus" "ClinicalTrialEnrollmentStatus" NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorPersona" "ClinicalResearchActorPersona" NOT NULL,
  "actorIdentityId" UUID,
  "reasonSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_trial_enrollment_status_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clinical_trial_withdrawals" (
  "id" UUID NOT NULL,
  "enrollmentId" UUID NOT NULL,
  "reasonCategory" "ClinicalTrialWithdrawalReasonCategory" NOT NULL,
  "reasonSummary" TEXT NOT NULL,
  "withdrawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedByPersona" "ClinicalResearchActorPersona" NOT NULL,
  "recordedByIdentityId" UUID,
  "preservesParticipationHistory" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_trial_withdrawals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinical_trial_phase_references_code_key" ON "clinical_trial_phase_references"("code");
CREATE UNIQUE INDEX "clinical_trial_condition_references_code_key" ON "clinical_trial_condition_references"("code");
CREATE UNIQUE INDEX "clinical_trial_intervention_references_code_key" ON "clinical_trial_intervention_references"("code");
CREATE UNIQUE INDEX "clinical_trial_sponsors_sponsorReference_key" ON "clinical_trial_sponsors"("sponsorReference");
CREATE UNIQUE INDEX "clinical_trials_trialNumber_key" ON "clinical_trials"("trialNumber");
CREATE UNIQUE INDEX "clinical_trials_currentTrialVersionId_key" ON "clinical_trials"("currentTrialVersionId");
CREATE UNIQUE INDEX "clinical_trials_currentProtocolVersionId_key" ON "clinical_trials"("currentProtocolVersionId");
CREATE UNIQUE INDEX "clinical_trial_versions_clinicalTrialId_versionNumber_key" ON "clinical_trial_versions"("clinicalTrialId", "versionNumber");
CREATE UNIQUE INDEX "clinical_trial_protocols_clinicalTrialId_protocolIdentifier_key" ON "clinical_trial_protocols"("clinicalTrialId", "protocolIdentifier");
CREATE UNIQUE INDEX "clinical_trial_protocol_versions_protocolId_versionNumber_key" ON "clinical_trial_protocol_versions"("protocolId", "versionNumber");
CREATE UNIQUE INDEX "clinical_trial_sites_clinicalTrialId_siteReference_key" ON "clinical_trial_sites"("clinicalTrialId", "siteReference");
CREATE UNIQUE INDEX "research_ethics_approvals_approvalReference_key" ON "research_ethics_approvals"("approvalReference");
CREATE UNIQUE INDEX "research_ethics_approvals_currentVersionId_key" ON "research_ethics_approvals"("currentVersionId");
CREATE UNIQUE INDEX "research_ethics_approval_versions_researchEthicsApprovalId_versionNumber_key" ON "research_ethics_approval_versions"("researchEthicsApprovalId", "versionNumber");
CREATE UNIQUE INDEX "clinical_regulatory_approvals_approvalReference_key" ON "clinical_regulatory_approvals"("approvalReference");
CREATE UNIQUE INDEX "clinical_research_participant_profiles_participantReference_key" ON "clinical_research_participant_profiles"("participantReference");
CREATE UNIQUE INDEX "clinical_research_participant_profiles_subjectIdentityId_key" ON "clinical_research_participant_profiles"("subjectIdentityId");
CREATE UNIQUE INDEX "clinical_trial_eligibility_criteria_clinicalTrialId_criterionCode_key" ON "clinical_trial_eligibility_criteria"("clinicalTrialId", "criterionCode");
CREATE UNIQUE INDEX "clinical_trial_consents_clinicalTrialId_consentCode_key" ON "clinical_trial_consents"("clinicalTrialId", "consentCode");
CREATE UNIQUE INDEX "clinical_trial_consent_versions_consentId_versionNumber_key" ON "clinical_trial_consent_versions"("consentId", "versionNumber");
CREATE UNIQUE INDEX "clinical_trial_enrollments_enrollmentReference_key" ON "clinical_trial_enrollments"("enrollmentReference");

CREATE INDEX "clinical_trials_jurisdictionId_idx" ON "clinical_trials"("jurisdictionId");
CREATE INDEX "clinical_trials_recruitmentStatus_idx" ON "clinical_trials"("recruitmentStatus");
CREATE INDEX "clinical_trials_listingLifecycleStatus_idx" ON "clinical_trials"("listingLifecycleStatus");
CREATE INDEX "clinical_trial_interests_participantProfileId_idx" ON "clinical_trial_interests"("participantProfileId");
CREATE INDEX "clinical_trial_enrollments_participantProfileId_idx" ON "clinical_trial_enrollments"("participantProfileId");
CREATE INDEX "clinical_trial_enrollments_clinicalTrialId_idx" ON "clinical_trial_enrollments"("clinicalTrialId");

ALTER TABLE "clinical_trial_sponsors" ADD CONSTRAINT "clinical_trial_sponsors_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_sponsors" ADD CONSTRAINT "clinical_trial_sponsors_organizationIdentityId_fkey" FOREIGN KEY ("organizationIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_trials" ADD CONSTRAINT "clinical_trials_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_trials" ADD CONSTRAINT "clinical_trials_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "clinical_trial_sponsors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_trials" ADD CONSTRAINT "clinical_trials_phaseReferenceId_fkey" FOREIGN KEY ("phaseReferenceId") REFERENCES "clinical_trial_phase_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinical_trials" ADD CONSTRAINT "clinical_trials_conditionReferenceId_fkey" FOREIGN KEY ("conditionReferenceId") REFERENCES "clinical_trial_condition_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinical_trials" ADD CONSTRAINT "clinical_trials_interventionReferenceId_fkey" FOREIGN KEY ("interventionReferenceId") REFERENCES "clinical_trial_intervention_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_versions" ADD CONSTRAINT "clinical_trial_versions_clinicalTrialId_fkey" FOREIGN KEY ("clinicalTrialId") REFERENCES "clinical_trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clinical_trials" ADD CONSTRAINT "clinical_trials_currentTrialVersionId_fkey" FOREIGN KEY ("currentTrialVersionId") REFERENCES "clinical_trial_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_protocols" ADD CONSTRAINT "clinical_trial_protocols_clinicalTrialId_fkey" FOREIGN KEY ("clinicalTrialId") REFERENCES "clinical_trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_protocol_versions" ADD CONSTRAINT "clinical_trial_protocol_versions_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "clinical_trial_protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clinical_trials" ADD CONSTRAINT "clinical_trials_currentProtocolVersionId_fkey" FOREIGN KEY ("currentProtocolVersionId") REFERENCES "clinical_trial_protocol_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_sites" ADD CONSTRAINT "clinical_trial_sites_clinicalTrialId_fkey" FOREIGN KEY ("clinicalTrialId") REFERENCES "clinical_trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_sites" ADD CONSTRAINT "clinical_trial_sites_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_investigators" ADD CONSTRAINT "clinical_trial_investigators_clinicalTrialSiteId_fkey" FOREIGN KEY ("clinicalTrialSiteId") REFERENCES "clinical_trial_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_investigators" ADD CONSTRAINT "clinical_trial_investigators_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_investigators" ADD CONSTRAINT "clinical_trial_investigators_professionalIdentityId_fkey" FOREIGN KEY ("professionalIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_principal_investigators" ADD CONSTRAINT "clinical_trial_principal_investigators_clinicalTrialId_fkey" FOREIGN KEY ("clinicalTrialId") REFERENCES "clinical_trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_principal_investigators" ADD CONSTRAINT "clinical_trial_principal_investigators_clinicalTrialSiteId_fkey" FOREIGN KEY ("clinicalTrialSiteId") REFERENCES "clinical_trial_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_principal_investigators" ADD CONSTRAINT "clinical_trial_principal_investigators_investigatorId_fkey" FOREIGN KEY ("investigatorId") REFERENCES "clinical_trial_investigators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_principal_investigators" ADD CONSTRAINT "clinical_trial_principal_investigators_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "research_ethics_approvals" ADD CONSTRAINT "research_ethics_approvals_clinicalTrialId_fkey" FOREIGN KEY ("clinicalTrialId") REFERENCES "clinical_trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "research_ethics_approval_versions" ADD CONSTRAINT "research_ethics_approval_versions_researchEthicsApprovalId_fkey" FOREIGN KEY ("researchEthicsApprovalId") REFERENCES "research_ethics_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "research_ethics_approval_versions" ADD CONSTRAINT "research_ethics_approval_versions_committeeInstitutionId_fkey" FOREIGN KEY ("committeeInstitutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "research_ethics_approval_versions" ADD CONSTRAINT "research_ethics_approval_versions_recordedByOfficeholderId_fkey" FOREIGN KEY ("recordedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "research_ethics_approvals" ADD CONSTRAINT "research_ethics_approvals_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "research_ethics_approval_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_regulatory_approvals" ADD CONSTRAINT "clinical_regulatory_approvals_clinicalTrialId_fkey" FOREIGN KEY ("clinicalTrialId") REFERENCES "clinical_trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_regulatory_statuses" ADD CONSTRAINT "clinical_regulatory_statuses_clinicalRegulatoryApprovalId_fkey" FOREIGN KEY ("clinicalRegulatoryApprovalId") REFERENCES "clinical_regulatory_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_regulatory_statuses" ADD CONSTRAINT "clinical_regulatory_statuses_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_external_registry_references" ADD CONSTRAINT "clinical_trial_external_registry_references_clinicalTrialId_fkey" FOREIGN KEY ("clinicalTrialId") REFERENCES "clinical_trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clinical_research_participant_profiles" ADD CONSTRAINT "clinical_research_participant_profiles_subjectIdentityId_fkey" FOREIGN KEY ("subjectIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_research_participant_profiles" ADD CONSTRAINT "clinical_research_participant_profiles_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_eligibility_criteria" ADD CONSTRAINT "clinical_trial_eligibility_criteria_clinicalTrialId_fkey" FOREIGN KEY ("clinicalTrialId") REFERENCES "clinical_trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_interests" ADD CONSTRAINT "clinical_trial_interests_clinicalTrialId_fkey" FOREIGN KEY ("clinicalTrialId") REFERENCES "clinical_trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_interests" ADD CONSTRAINT "clinical_trial_interests_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "clinical_research_participant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_screenings" ADD CONSTRAINT "clinical_trial_screenings_clinicalTrialId_fkey" FOREIGN KEY ("clinicalTrialId") REFERENCES "clinical_trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_screenings" ADD CONSTRAINT "clinical_trial_screenings_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "clinical_research_participant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_screenings" ADD CONSTRAINT "clinical_trial_screenings_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "clinical_trial_interests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_screening_reviews" ADD CONSTRAINT "clinical_trial_screening_reviews_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "clinical_trial_screenings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_screening_reviews" ADD CONSTRAINT "clinical_trial_screening_reviews_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_screening_reviews" ADD CONSTRAINT "clinical_trial_screening_reviews_reviewerProfessionalIdentityId_fkey" FOREIGN KEY ("reviewerProfessionalIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_eligibility_assessments" ADD CONSTRAINT "clinical_trial_eligibility_assessments_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "clinical_trial_screenings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_eligibility_assessments" ADD CONSTRAINT "clinical_trial_eligibility_assessments_assessorOfficeholderId_fkey" FOREIGN KEY ("assessorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_eligibility_assessments" ADD CONSTRAINT "clinical_trial_eligibility_assessments_assessorProfessionalIdentityId_fkey" FOREIGN KEY ("assessorProfessionalIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_eligibility_evidence" ADD CONSTRAINT "clinical_trial_eligibility_evidence_eligibilityAssessmentId_fkey" FOREIGN KEY ("eligibilityAssessmentId") REFERENCES "clinical_trial_eligibility_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_consents" ADD CONSTRAINT "clinical_trial_consents_clinicalTrialId_fkey" FOREIGN KEY ("clinicalTrialId") REFERENCES "clinical_trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_consent_versions" ADD CONSTRAINT "clinical_trial_consent_versions_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "clinical_trial_consents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_consent_signatures" ADD CONSTRAINT "clinical_trial_consent_signatures_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "clinical_research_participant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_consent_signatures" ADD CONSTRAINT "clinical_trial_consent_signatures_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES "clinical_trial_consent_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_enrollments" ADD CONSTRAINT "clinical_trial_enrollments_clinicalTrialId_fkey" FOREIGN KEY ("clinicalTrialId") REFERENCES "clinical_trials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_enrollments" ADD CONSTRAINT "clinical_trial_enrollments_clinicalTrialSiteId_fkey" FOREIGN KEY ("clinicalTrialSiteId") REFERENCES "clinical_trial_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_enrollments" ADD CONSTRAINT "clinical_trial_enrollments_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "clinical_research_participant_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_enrollments" ADD CONSTRAINT "clinical_trial_enrollments_protocolVersionId_fkey" FOREIGN KEY ("protocolVersionId") REFERENCES "clinical_trial_protocol_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_enrollments" ADD CONSTRAINT "clinical_trial_enrollments_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES "clinical_trial_consent_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_enrollments" ADD CONSTRAINT "clinical_trial_enrollments_eligibilityAssessmentId_fkey" FOREIGN KEY ("eligibilityAssessmentId") REFERENCES "clinical_trial_eligibility_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_enrollment_status_histories" ADD CONSTRAINT "clinical_trial_enrollment_status_histories_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "clinical_trial_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_enrollment_status_histories" ADD CONSTRAINT "clinical_trial_enrollment_status_histories_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_trial_withdrawals" ADD CONSTRAINT "clinical_trial_withdrawals_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "clinical_trial_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_trial_withdrawals" ADD CONSTRAINT "clinical_trial_withdrawals_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
