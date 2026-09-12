import { EVIDENCE_RECORDS_EXPLANATION_CODES } from './evidence-records.constants';

export interface Phase7HInvariant {
  id: number;
  description: string;
  explanationCode: string;
}

export const PHASE_7H_INVARIANTS: readonly Phase7HInvariant[] = [
  {
    id: 1,
    description: 'Client cannot set evidence status to VERIFIED',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.CLIENT_CANNOT_SET_VERIFIED,
  },
  {
    id: 2,
    description: 'Client cannot set evidence status to ACCEPTED',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.CLIENT_CANNOT_SET_ACCEPTED,
  },
  {
    id: 3,
    description: 'Client cannot set packet sealedAt directly',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.CLIENT_CANNOT_SET_SEALED,
  },
  {
    id: 4,
    description: 'Client cannot set contentHash directly',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.CLIENT_CANNOT_SET_CONTENT_HASH,
  },
  {
    id: 5,
    description: 'Client cannot mass-assign classification to privileged levels',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.CLIENT_CANNOT_SET_CLASSIFICATION,
  },
  {
    id: 6,
    description: 'Client cannot mass-assign protected status fields',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.CLIENT_CANNOT_MASS_ASSIGN_STATUS,
  },
  {
    id: 7,
    description: 'Applicant cannot access unrelated master file',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.UNAUTHORIZED_MASTER_FILE_ACCESS,
  },
  {
    id: 8,
    description: 'Applicant cannot access unrelated evidence record',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.UNAUTHORIZED_EVIDENCE_ACCESS,
  },
  {
    id: 9,
    description: 'Applicant cannot access unrelated evidence packet',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.UNAUTHORIZED_PACKET_ACCESS,
  },
  {
    id: 10,
    description: 'Applicant cannot access legal hold records',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.UNAUTHORIZED_LEGAL_HOLD_ACCESS,
  },
  {
    id: 11,
    description: 'Applicant cannot verify evidence',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.APPLICANT_CANNOT_VERIFY,
  },
  {
    id: 12,
    description: 'Applicant cannot accept evidence for purpose',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.APPLICANT_CANNOT_ACCEPT,
  },
  {
    id: 13,
    description: 'Evidence cannot be accepted before verification',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.VERIFICATION_REQUIRED_BEFORE_ACCEPTANCE,
  },
  {
    id: 14,
    description: 'Disputed evidence cannot be accepted',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.DISPUTED_EVIDENCE_CANNOT_BE_ACCEPTED,
  },
  {
    id: 15,
    description: 'Withdrawn evidence cannot be accepted',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.WITHDRAWN_EVIDENCE_CANNOT_BE_ACCEPTED,
  },
  {
    id: 16,
    description: 'Superseded evidence cannot be modified',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.SUPERSEDED_EVIDENCE_CANNOT_BE_MODIFIED,
  },
  {
    id: 17,
    description: 'Quarantined evidence cannot enter packet',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.QUARANTINED_EVIDENCE_CANNOT_ENTER_PACKET,
  },
  {
    id: 18,
    description: 'Sealed packet cannot be modified',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.SEALED_PACKET_CANNOT_BE_MODIFIED,
  },
  {
    id: 19,
    description: 'Packet freeze is irreversible',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.PACKET_FREEZE_IS_IRREVERSIBLE,
  },
  {
    id: 20,
    description: 'Legal hold blocks disposition execution',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.LEGAL_HOLD_BLOCKS_DISPOSITION,
  },
  {
    id: 21,
    description: 'Record correction requires approval before apply',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.CORRECTION_REQUIRES_APPROVAL,
  },
  {
    id: 22,
    description: 'Record correction cannot overwrite original',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.CORRECTION_CANNOT_OVERWRITE_ORIGINAL,
  },
  {
    id: 23,
    description: 'Record integrity events are append-only',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.INTEGRITY_EVENTS_APPEND_ONLY,
  },
  {
    id: 24,
    description: 'Record access events are append-only',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.ACCESS_EVENTS_APPEND_ONLY,
  },
  {
    id: 25,
    description: 'Document versions are immutable after registration',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.DOCUMENT_VERSION_IMMUTABLE,
  },
  {
    id: 26,
    description: 'Evidence records cannot be deleted',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.EVIDENCE_RECORD_CANNOT_BE_DELETED,
  },
  {
    id: 27,
    description: 'Master file requires linked case',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.MASTER_FILE_REQUIRES_CASE,
  },
  {
    id: 28,
    description: 'Phase 7 cannot create GovernmentDecision',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.PHASE_7_CANNOT_CREATE_DECISION,
  },
  {
    id: 29,
    description: 'Phase 7 cannot issue license/permit/certificate',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.PHASE_7_CANNOT_ISSUE_INSTRUMENT,
  },
  {
    id: 30,
    description: 'AI-assisted actor cannot verify evidence independently',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.AI_CANNOT_VERIFY_INDEPENDENTLY,
  },
  {
    id: 31,
    description: 'Service identity cannot accept decision-support evidence',
    explanationCode:
      EVIDENCE_RECORDS_EXPLANATION_CODES.SERVICE_IDENTITY_CANNOT_ACCEPT_DECISION_SUPPORT,
  },
  {
    id: 32,
    description: 'Professional review does not constitute government decision',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.PROFESSIONAL_REVIEW_NOT_DECISION,
  },
  {
    id: 33,
    description: 'Government communication record does not mutate case status',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.GOVERNMENT_COMMUNICATION_NOT_CASE_STATUS,
  },
  {
    id: 34,
    description: 'Inspection custody chain must be maintained',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.CUSTODY_CHAIN_REQUIRED,
  },
  {
    id: 35,
    description: 'Custody events cannot be client-backdated',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.CUSTODY_EVENT_CANNOT_BE_BACKDATED,
  },
  {
    id: 36,
    description: 'Packet manifest hash must match items',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.PACKET_MANIFEST_HASH_MISMATCH,
  },
  {
    id: 37,
    description: 'Undisclosed requirement cannot be satisfied',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.UNDISCLOSED_REQUIREMENT_CANNOT_SATISFY,
  },
  {
    id: 38,
    description: 'Retention assignment cannot be client-set',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.RETENTION_ASSIGNMENT_CLIENT_FORBIDDEN,
  },
  {
    id: 39,
    description: 'Case reference fields cannot be client-written',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.CASE_REFERENCE_FIELDS_CLIENT_FORBIDDEN,
  },
  {
    id: 40,
    description: 'Decision-support packet cannot include non-accepted evidence',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.NON_ACCEPTED_EVIDENCE_IN_DECISION_PACKET,
  },
  {
    id: 41,
    description: 'Archival transfer cannot destroy records',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.ARCHIVAL_TRANSFER_CANNOT_DESTROY,
  },
  {
    id: 42,
    description: 'Integrity mismatch triggers safe halt',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.INTEGRITY_MISMATCH_SAFE_HALT,
  },
  {
    id: 43,
    description: 'Evidence acceptance is not government approval',
    explanationCode: EVIDENCE_RECORDS_EXPLANATION_CODES.EVIDENCE_ACCEPTANCE_NOT_APPROVAL,
  },
  {
    id: 44,
    description: 'Master file completeness UNRESOLVED when required evidence pending',
    explanationCode: 'MASTER_FILE_COMPLETENESS_UNRESOLVED',
  },
  {
    id: 45,
    description: 'Master file completeness INCOMPLETE when disputed items exist',
    explanationCode: 'MASTER_FILE_COMPLETENESS_INCOMPLETE',
  },
  {
    id: 46,
    description: 'Master file completeness SAFE_HALTED on integrity failure',
    explanationCode: 'MASTER_FILE_COMPLETENESS_SAFE_HALTED',
  },
  {
    id: 47,
    description: 'Master file completeness COMPLETE when all required satisfied',
    explanationCode: 'MASTER_FILE_COMPLETENESS_COMPLETE',
  },
  {
    id: 48,
    description: 'Phase 7 cannot transition case to DECIDED',
    explanationCode: 'PHASE_7_CANNOT_TRANSITION_CASE_DECIDED',
  },
  {
    id: 49,
    description: 'Restricted evidence cannot appear in applicant view',
    explanationCode: 'RESTRICTED_EVIDENCE_APPLICANT_VIEW_FORBIDDEN',
  },
  {
    id: 50,
    description: 'Phase 7 packet freeze does not issue instruments',
    explanationCode: 'PHASE_7_PACKET_FREEZE_NOT_ISSUANCE',
  },
] as const;
