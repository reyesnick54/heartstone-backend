export const EVIDENCE_NUMBER_PREFIX = 'EVD';

export const NON_PRODUCTION_EVIDENCE_FIXTURE_MARKER = 'NON_PRODUCTION_PHASE_7C';

export const EVIDENCE_BOUNDARY_DISCLAIMER =
  'Evidence records represent what was received and what verification or acceptance steps have been recorded. They do not by themselves constitute a government decision.';

export const FORBIDDEN_CLIENT_EVIDENCE_FIELDS = [
  'verified',
  'isVerified',
  'verificationStatus',
  'accepted',
  'isAccepted',
  'acceptanceStatus',
  'qualityScore',
  'aiConfidence',
] as const;

export const FORBIDDEN_AI_FINALIZATION_CATEGORIES = ['AUTHENTICITY', 'CONTENT_FACT'] as const;

export const CONTROLLED_VERIFICATION_METHODS = [
  'CHECKSUM_MATCH',
  'DIGITAL_SIGNATURE_VALIDATION',
  'REGISTRY_LOOKUP',
  'ISSUER_CONFIRMATION',
  'PROFESSIONAL_REGISTER_LOOKUP',
  'VISUAL_INSPECTION',
  'OTHER_CONTROLLED_METHOD',
] as const;

export const GOVERNMENT_COMMUNICATION_NON_APPROVAL_CATEGORIES = [
  'RECEIPT',
  'ACKNOWLEDGMENT',
  'INFORMATION',
  'GUIDANCE',
  'CONSULTATION',
] as const;

export const GOVERNMENT_COMMUNICATION_CONSEQUENCE_CATEGORIES = [
  'CONCURRENCE',
  'OBJECTION',
  'RETAINED_DETERMINATION',
  'SUPERVISORY_FINDING',
] as const;

export const EVIDENCE_PACKET_NUMBER_PREFIX = 'EPKT';

export const PACKET_BOUNDARY_DISCLAIMER =
  'Evidence packets organize evidence for institutional review. Packet inclusion does not prove authenticity. Packet freeze does not constitute approval or refusal.';

export const FROZEN_PACKET_IMMUTABLE_MESSAGE =
  'Frozen evidence packet versions are immutable. Corrections require a new packet version.';

export const FORBIDDEN_PACKET_DECISION_FIELDS = [
  'approved',
  'refused',
  'decisionOutcome',
  'approvalStatus',
] as const;

export const FORBIDDEN_PHASE_7D_MODELS = [
  'EvidenceVault',
  'DocumentRegister',
] as const;
