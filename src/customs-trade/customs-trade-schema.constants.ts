export const FORBIDDEN_CUSTOMS_DECLARATION_CLIENT_FIELDS = [
  'status',
  'currentVersionId',
  'releaseStatus',
  'releasedAt',
] as const;

export const FORBIDDEN_CUSTOMS_RELEASE_CLIENT_FIELDS = [
  'status',
  'releasedAt',
  'releasedByOfficeholderId',
] as const;

export const FORBIDDEN_CUSTOMS_ASSESSMENT_CLIENT_FIELDS = ['status', 'paidAmountCents'] as const;

export const PUBLIC_CUSTOMS_VERIFICATION_FORBIDDEN_RESPONSE_KEYS = [
  'organizationId',
  'declarationData',
  'assessmentReference',
  'amountCents',
  'holdReason',
  'grounds',
  'paidAmountCents',
] as const;
