export const CITIZEN_EXPERIENCE_BOUNDARY_DISCLAIMER =
  'Citizen experience endpoints provide read-only projections and orchestration over official records. ' +
  'Displayed data does not create, alter, or substitute for government decisions, legal authority, or official instruments.';

export const CITIZEN_PAYMENT_PROJECTION_DISCLAIMER =
  'Payment records reflect fee settlement only. Payment or receipt does not constitute application approval, ' +
  'case disposition, or issuance of a government decision.';

export const CITIZEN_MESSAGE_ACKNOWLEDGMENT_DISCLAIMER =
  'Message acknowledgment records receipt only. Acknowledgment does not constitute consent to underlying government action.';

export const CITIZEN_RENEWAL_PROJECTION_DISCLAIMER =
  'Renewal eligibility is derived from authoritative instrument lifecycle configuration. ' +
  'Projection does not establish eligibility or authorize renewal without a separate official process.';

export const CITIZEN_EXPERIENCE_REASON_CODES = {
  CROSS_CITIZEN_ACCESS_DENIED: 'CROSS_CITIZEN_ACCESS_DENIED',
  RESTRICTED_EVIDENCE_EXCLUDED: 'RESTRICTED_EVIDENCE_EXCLUDED',
  MESSAGE_NOT_ACKNOWLEDGABLE: 'MESSAGE_NOT_ACKNOWLEDGABLE',
  REPRESENTATION_SCOPE_DENIED: 'REPRESENTATION_SCOPE_DENIED',
} as const;

export const CITIZEN_VISIBLE_MESSAGE_STATUSES = ['DELIVERED', 'PARTIALLY_DELIVERED'] as const;

export const CITIZEN_ACKNOWLEDGABLE_CHANNELS = ['PORTAL'] as const;

export const CITIZEN_RESTRICTED_DOCUMENT_CLASSIFICATIONS = [
  'CONFIDENTIAL',
  'RESTRICTED',
  'HIGHLY_RESTRICTED',
] as const;

export const CITIZEN_BLOCKED_MALWARE_STATUSES = ['MALICIOUS', 'QUARANTINED', 'SUSPICIOUS'] as const;

export const CITIZEN_PAYABLE_INVOICE_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] as const;

export const RENEWAL_ELIGIBLE_INSTRUMENT_STATUSES = [
  'ISSUED',
  'EFFECTIVE',
  'RENEWED',
  'AMENDED',
  'VARIED',
  'EXPIRED',
] as const;
