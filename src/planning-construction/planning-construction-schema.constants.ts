export const FORBIDDEN_CLIENT_PERMIT_ISSUANCE_FIELDS = [
  'status',
  'issuedAt',
  'issuedByOfficeholderId',
  'permitNumber',
] as const;

export const FORBIDDEN_CLIENT_OCCUPANCY_FIELDS = [
  'status',
  'issuedAt',
  'issuedByOfficeholderId',
  'governmentDecisionId',
] as const;

export const FORBIDDEN_CLIENT_INSPECTION_OUTCOME_FIELDS = ['outcome', 'outcomeLockedAt'] as const;
