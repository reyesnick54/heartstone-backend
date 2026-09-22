export const FORBIDDEN_CLIENT_INCIDENT_VERIFICATION_FIELDS = [
  'verificationStatus',
  'verifiedAt',
  'verifiedByOfficeholderId',
] as const;

export const FORBIDDEN_CLIENT_NOTICE_PUBLISH_FIELDS = [
  'status',
  'publishedContent',
  'publishedAt',
  'publishedByOfficeholderId',
  'approvedContent',
  'approvedAt',
  'approvedByOfficeholderId',
] as const;

export const FORBIDDEN_CLIENT_EMERGENCY_DECLARATION_FIELDS = [
  'isOfficialDeclaration',
  'emergencyAuthorityReference',
  'emergencyAuthorityExpiresAt',
] as const;
