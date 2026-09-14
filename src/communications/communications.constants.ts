export const PHASE_11D_BOUNDARY_DISCLAIMER =
  'Notification is not a notice. A notice is not a decision. A delivery attempt is not delivery. Delivery is not receipt. Receipt does not create legal effect unless governing configuration establishes it.';

export const COMMUNICATION_NUMBER_PREFIX = 'COM';

export const FORBIDDEN_SUBSTANTIVE_NOTICE_TYPES = [
  'DecisionNotice',
  'RedressNotice',
  'DeficiencyNotice',
  'InspectionNotice',
  'ComplianceNotice',
] as const;

export const MANDATORY_COMMUNICATION_CATEGORIES = [
  'REQUIRED_DECISION_NOTICE',
  'APPEAL_NOTICE',
  'INSPECTION_NOTICE',
  'SECURITY_NOTIFICATION',
  'PRIVACY_NOTIFICATION',
  'OTHER_MANDATORY',
] as const;

export const OPTIONAL_COMMUNICATION_PREFERENCE_SCOPES = ['MARKETING', 'INFORMATIONAL'] as const;

export const RESTRICTED_COMMUNICATION_CLASSIFICATIONS = ['RESTRICTED', 'SECRET'] as const;

export const UNAPPROVED_CHANNELS_FOR_RESTRICTED = [
  'EMAIL',
  'SMS',
  'PUSH',
  'PARTNER_INTERFACE',
] as const;

export const FORBIDDEN_TEMPLATE_INJECTION_PATTERNS = [
  /<script\b/i,
  /<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /\{\{.*\}\}/,
  /<%/,
  /%>/,
] as const;

export const FORBIDDEN_CLIENT_COMMUNICATION_MESSAGE_FIELDS = [
  'status',
  'isOfficial',
  'messageNumber',
  'approvedByIdentityId',
] as const;

export const FORBIDDEN_CLIENT_DELIVERY_FIELDS = [
  'status',
  'sentAt',
  'deliveredAt',
  'failedAt',
  'providerReference',
] as const;

export const FORBIDDEN_CLIENT_RECEIPT_FIELDS = ['isLegalReceipt'] as const;

export const EMAIL_OPEN_RECEIPT_METHOD = 'EMAIL_OPEN_PIXEL' as const;

export const MAX_DELIVERY_RETRY_ATTEMPTS = 3;
