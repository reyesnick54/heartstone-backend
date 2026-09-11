/**
 * Evidence requirement status as supplied by external evidence systems.
 * Phase 4D does not judge authenticity — only evaluates configured status requirements.
 */
export enum EvidenceRequirementStatus {
  PRESENT = 'PRESENT',
  VERIFIED = 'VERIFIED',
  ACCEPTED = 'ACCEPTED',
  MISSING = 'MISSING',
  EXPIRED = 'EXPIRED',
  DISPUTED = 'DISPUTED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  UNRESOLVED = 'UNRESOLVED',
}
