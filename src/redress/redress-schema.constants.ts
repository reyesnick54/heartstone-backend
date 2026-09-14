export const PHASE_10E_MODEL_NAMES = [
  'ReviewRecordSnapshot',
  'ReconsiderationProceeding',
  'InternalAdministrativeReview',
  'ReviewIssue',
  'ReviewAssignment',
  'ReviewerIndependenceAssessment',
  'ReviewAuthorityAssessment',
  'ReviewSubmission',
  'ReviewEvidenceAdmission',
  'ReviewRecommendation',
] as const;

export const PHASE_10E_ENUM_NAMES = [
  'ReconsiderationReviewStandard',
  'ReviewProceedingStatus',
  'ReviewAssignmentStatus',
  'ReviewerIndependenceOutcome',
  'InternalAdministrativeReviewGround',
  'ReviewIssueStatus',
  'ReviewEvidenceClassification',
  'ReviewRecommendationType',
  'ReviewProceedingKind',
] as const;

export const PHASE_10G_MODEL_NAMES = [
  'RedressRouteVersion',
  'RedressMatter',
  'RedressReviewRecordSnapshot',
  'RedressDecision',
  'RedressFinding',
  'RedressReason',
  'RedressRemedy',
  'InterimReliefRequest',
  'InterimReliefDecision',
  'ReviewStayRecord',
  'RedressImplementationPlan',
  'RedressImplementationAction',
  'RedressImplementationVerification',
  'RedressNotice',
] as const;

export const PHASE_10F_MODEL_NAMES = [
  'ExternalReviewReferral',
  'ExternalReviewPackage',
  'ExternalReviewAcknowledgment',
  'ExternalReviewStatusRecord',
  'ExternalReviewDetermination',
  'ProfessionalChallengeReferral',
  'RegulatoryReviewReferral',
  'OmbudsOversightReferral',
  'JudicialReviewInformationRecord',
] as const;

export const PHASE_10F_ENUM_NAMES = [
  'ExternalReviewStatus',
  'ExternalReviewRouteType',
  'ExternalAuthorityBindingClass',
  'ExternalDeterminationAuthenticityStatus',
  'ProfessionalChallengeAuthorityType',
  'ExternalReviewTransmissionMethod',
  'RetainedAppealAuthorityClass',
] as const;

export const EXTERNAL_REVIEW_STATUSES = [
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
  'SAFE_HALTED',
] as const;

export const PHASE_10G_ENUM_NAMES = [
  'RedressRouteVersionStatus',
  'RedressMatterStatus',
  'RedressDecisionOutcome',
  'RedressReasonSectionType',
  'RedressRemedyType',
  'InterimReliefRequestType',
  'InterimReliefRequestStatus',
  'InterimReliefDecisionOutcome',
  'ReviewStayRecordStatus',
  'RedressImplementationTargetType',
  'RedressImplementationActionStatus',
  'RedressImplementationVerificationOutcome',
  'RedressNoticeStatus',
] as const;
