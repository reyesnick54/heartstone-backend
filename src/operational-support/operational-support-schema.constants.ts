export const PHASE_11_FINANCIAL_MODEL_NAMES = [
  'FeeSchedule',
  'FeeScheduleVersion',
  'FeeScheduleItem',
  'FeeAssessment',
  'Invoice',
  'InvoiceLine',
  'PaymentChannelDefinition',
  'PaymentProviderConfiguration',
  'PaymentIntent',
  'PaymentTransaction',
  'PaymentAllocation',
  'PaymentProviderWebhookEvent',
  'FeeAdjustmentRequest',
  'FeeAdjustmentDecision',
  'RefundRequest',
  'RefundAuthorization',
  'RefundTransaction',
  'ReconciliationBatch',
  'ReconciliationItem',
  'FinancialDispute',
  'ArrearsRecord',
  'FinancialApprovalRecord',
] as const;

export const PHASE_11_COMMUNICATIONS_MODEL_NAMES = [
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
] as const;

export const PHASE_11_INTEGRATIONS_MODEL_NAMES = [
  'TechnologyDependency',
  'IntegrationDefinition',
  'IntegrationVersion',
  'IntegrationEndpoint',
  'DataExchangeContract',
  'DataExchangeField',
  'AuthoritativeSourceDesignation',
  'FieldAuthorityMapping',
  'IntegrationCredentialReference',
  'IntegrationAcceptanceRecord',
  'IntegrationRequest',
  'IntegrationExchange',
  'IntegrationMessage',
  'IntegrationWebhookEvent',
  'IntegrationDataTransformation',
  'IntegrationValidationResult',
  'ExternalRecordReference',
  'RegistryQuery',
  'RegistrySynchronization',
  'SourceDiscrepancy',
  'SourceDiscrepancyResolution',
  'IntegrationReconciliationRecord',
  'IntegrationDeadLetterRecord',
  'IntegrationOutage',
  'IntegrationFallbackActivation',
  'IntegrationRecoveryEvent',
] as const;

export const PHASE_11_MODEL_NAMES = [
  ...PHASE_11_FINANCIAL_MODEL_NAMES,
  ...PHASE_11_COMMUNICATIONS_MODEL_NAMES,
  ...PHASE_11_INTEGRATIONS_MODEL_NAMES,
] as const;

export const PHASE_11_FINANCIAL_ENUM_NAMES = [
  'FeeScheduleStatus',
  'FeeAssessmentStatus',
  'InvoiceStatus',
  'FinancialApprovalType',
  'FinancialApprovalStatus',
  'PaymentChannelType',
  'PaymentIntentStatus',
  'PaymentTransactionStatus',
  'PaymentWebhookProcessingStatus',
  'FeeAdjustmentRequestStatus',
  'RefundRequestStatus',
  'ReconciliationBatchStatus',
  'ReconciliationItemStatus',
  'FinancialDisputeStatus',
  'ArrearsRecordStatus',
] as const;

export const PHASE_11_COMMUNICATIONS_ENUM_NAMES = [
  'CommunicationTemplateStatus',
  'CommunicationChannelType',
  'CommunicationMessageStatus',
  'CommunicationDeliveryStatus',
  'CommunicationReceiptType',
  'MandatoryCommunicationRuleStatus',
] as const;

export const PHASE_11_INTEGRATIONS_ENUM_NAMES = [
  'IntegrationAcceptanceStatus',
  'IntegrationDefinitionStatus',
  'IntegrationEndpointDirection',
  'DataExchangeFieldDirection',
  'AuthoritativeSourceStatus',
  'IntegrationRequestStatus',
  'IntegrationExchangeStatus',
  'IntegrationMessageDirection',
  'IntegrationWebhookProcessingStatus',
  'SourceDiscrepancyStatus',
  'IntegrationOutageStatus',
  'IntegrationFallbackStatus',
  'IntegrationReconciliationStatus',
  'RegistryQueryStatus',
  'RegistrySynchronizationResult',
] as const;

export const PHASE_11_ENUM_NAMES = [
  ...PHASE_11_FINANCIAL_ENUM_NAMES,
  ...PHASE_11_COMMUNICATIONS_ENUM_NAMES,
  ...PHASE_11_INTEGRATIONS_ENUM_NAMES,
] as const;

export const INTEGRATION_ACCEPTANCE_STATUSES = [
  'TECHNICALLY_CONNECTED',
  'TESTED',
  'TECHNICALLY_READY',
  'INSTITUTIONALLY_ACCEPTED',
  'OPERATIONALLY_ACTIVE',
  'SUSPENDED',
  'REVALIDATION_REQUIRED',
] as const;
