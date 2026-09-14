export const INTEGRATION_MODEL_NAMES = [
  'Integration',
  'IntegrationVersion',
  'IntegrationCredential',
  'IntegrationRequest',
  'IntegrationExchange',
  'IntegrationMessage',
  'IntegrationDeliveryAttempt',
  'IntegrationResponseRecord',
  'IntegrationWebhookEvent',
  'IntegrationCorrelationRecord',
  'IntegrationDataTransformation',
  'IntegrationValidationResult',
] as const;

export const INTEGRATION_EXCHANGE_STATUSES = [
  'PREPARED',
  'SENT',
  'ACKNOWLEDGED',
  'RESPONSE_RECEIVED',
  'VALIDATED',
  'RECONCILIATION_REQUIRED',
  'FAILED',
  'TIMED_OUT',
  'RETRY_PENDING',
  'SAFE_HALTED',
  'CANCELLED',
] as const;

export const INTEGRATION_OPERATIONS = [
  'QUERY',
  'SUBMIT',
  'UPDATE',
  'SEND_EVENT',
  'RECEIVE_EVENT',
  'HEALTH_CHECK',
] as const;

export const FORBIDDEN_INTEGRATION_AUTHORITY_FIELDS = [
  'approved',
  'refused',
  'verified',
  'decisionOutcome',
  'authorityGranted',
  'officeholderId',
] as const;
