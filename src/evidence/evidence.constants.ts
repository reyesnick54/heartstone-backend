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

export const FORBIDDEN_PHASE_7D_MODELS = [
  'EvidenceVault',
  'EvidencePacket',
  'DocumentRegister',
] as const;
