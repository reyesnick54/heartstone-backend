export const EVIDENCE_PACKET_NUMBER_PREFIX = 'EPKT';
export const MASTER_ADMINISTRATIVE_FILE_PREFIX = 'MAF';

export const PHASE_7E_BOUNDARY_DISCLAIMER =
  'Evidence packets organize evidence for institutional review. Packet inclusion does not prove authenticity. Packet freeze does not constitute approval or refusal.';

export const FORBIDDEN_PACKET_DECISION_FIELDS = [
  'approved',
  'refused',
  'decisionOutcome',
  'approvalStatus',
] as const;

export const FROZEN_PACKET_IMMUTABLE_MESSAGE =
  'Frozen evidence packet versions are immutable. Corrections require a new packet version.';
