export const PHASE_11D_MODEL_NAMES = [
  'CommunicationTemplate',
  'CommunicationTemplateVersion',
  'CommunicationMessage',
  'CommunicationRecipient',
  'CommunicationDelivery',
  'CommunicationDeliveryAttempt',
  'CommunicationReceipt',
  'CommunicationPreference',
  'MandatoryCommunicationRule',
  'TranslationRecord',
  'AccessibilityAccommodation',
  'CommunicationFailureRecord',
  'CommunicationMafIndexEntry',
] as const;

export const PHASE_11D_ENUM_NAMES = [
  'CommunicationChannel',
  'CommunicationDeliveryStatus',
  'CommunicationDeliveryEffect',
  'CommunicationTemplateVersionStatus',
  'CommunicationTemplateFieldSource',
  'CommunicationMessageStatus',
  'CommunicationClassification',
  'CommunicationMandatoryCategory',
  'CommunicationPreferenceScope',
  'TranslationReviewStatus',
  'TranslationMethod',
  'AccessibilityAccommodationType',
  'CommunicationFailureRetryState',
  'CommunicationReceiptMethod',
  'CommunicationRecipientRole',
  'CommunicationServiceCapacity',
  'CommunicationProviderType',
  'CommunicationAiDraftStatus',
] as const;

export const COMMUNICATION_CHANNELS = [
  'PORTAL',
  'EMAIL',
  'SMS',
  'PUSH',
  'SECURE_MESSAGE',
  'GOVERNMENT_INTERFACE',
  'PARTNER_INTERFACE',
  'POSTAL_REFERENCE',
  'IN_PERSON_REFERENCE',
  'OTHER_APPROVED_CHANNEL',
] as const;

export const COMMUNICATION_DELIVERY_STATUSES = [
  'PREPARED',
  'QUEUED',
  'SENT',
  'DELIVERED',
  'FAILED',
  'BOUNCED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
] as const;

export const COMMUNICATION_DELIVERY_EFFECTS = [
  'INFORMATIONAL_ONLY',
  'EFFECTIVE_ON_ISSUE',
  'EFFECTIVE_ON_SEND',
  'EFFECTIVE_ON_DELIVERY',
  'EFFECTIVE_ON_RECEIPT',
  'EFFECTIVE_BY_SEPARATE_RULE',
] as const;
