import { registerAs } from '@nestjs/config';

export const OPERATIONAL_PROVIDERS_CONFIG_KEY = 'operationalProviders';

export type OperationalProviderSelection = 'test' | 'configured';

export interface OperationalProvidersConfig {
  paymentProvider: OperationalProviderSelection;
  emailProvider: OperationalProviderSelection;
  smsProvider: OperationalProviderSelection;
  paymentProviderEndpoint: string | null;
  paymentProviderApiKeyVaultReference: string | null;
  paymentWebhookSecretVaultReference: string | null;
  emailProviderEndpoint: string | null;
  emailProviderApiKeyVaultReference: string | null;
  emailSenderIdentity: string | null;
  smsProviderEndpoint: string | null;
  smsProviderApiKeyVaultReference: string | null;
  smsSenderIdentity: string | null;
  integrationCredentialVaultPrefix: string | null;
  operationalReadinessDeclarationReference: string | null;
}

export default registerAs(OPERATIONAL_PROVIDERS_CONFIG_KEY, (): OperationalProvidersConfig => {
  const selection = (value: string | undefined): OperationalProviderSelection =>
    value === 'configured' ? 'configured' : 'test';

  return {
    paymentProvider: selection(process.env.OPERATIONAL_PAYMENT_PROVIDER),
    emailProvider: selection(process.env.OPERATIONAL_EMAIL_PROVIDER),
    smsProvider: selection(process.env.OPERATIONAL_SMS_PROVIDER),
    paymentProviderEndpoint: process.env.OPERATIONAL_PAYMENT_PROVIDER_ENDPOINT?.trim() ?? null,
    paymentProviderApiKeyVaultReference:
      process.env.OPERATIONAL_PAYMENT_API_KEY_VAULT_REF?.trim() ?? null,
    paymentWebhookSecretVaultReference:
      process.env.OPERATIONAL_PAYMENT_WEBHOOK_SECRET_VAULT_REF?.trim() ?? null,
    emailProviderEndpoint: process.env.OPERATIONAL_EMAIL_PROVIDER_ENDPOINT?.trim() ?? null,
    emailProviderApiKeyVaultReference:
      process.env.OPERATIONAL_EMAIL_API_KEY_VAULT_REF?.trim() ?? null,
    emailSenderIdentity: process.env.OPERATIONAL_EMAIL_SENDER_IDENTITY?.trim() ?? null,
    smsProviderEndpoint: process.env.OPERATIONAL_SMS_PROVIDER_ENDPOINT?.trim() ?? null,
    smsProviderApiKeyVaultReference:
      process.env.OPERATIONAL_SMS_API_KEY_VAULT_REF?.trim() ?? null,
    smsSenderIdentity: process.env.OPERATIONAL_SMS_SENDER_IDENTITY?.trim() ?? null,
    integrationCredentialVaultPrefix:
      process.env.OPERATIONAL_INTEGRATION_CREDENTIAL_VAULT_PREFIX?.trim() ?? null,
    operationalReadinessDeclarationReference:
      process.env.OPERATIONAL_READINESS_DECLARATION_REF?.trim() ?? null,
  };
});

export function isOperationalProviderConfigured(
  config: OperationalProvidersConfig,
  kind: 'payment' | 'email' | 'sms',
): boolean {
  switch (kind) {
    case 'payment':
      return Boolean(
        config.paymentProviderEndpoint &&
          config.paymentProviderApiKeyVaultReference &&
          config.paymentWebhookSecretVaultReference,
      );
    case 'email':
      return Boolean(
        config.emailProviderEndpoint &&
          config.emailProviderApiKeyVaultReference &&
          config.emailSenderIdentity,
      );
    case 'sms':
      return Boolean(
        config.smsProviderEndpoint &&
          config.smsProviderApiKeyVaultReference &&
          config.smsSenderIdentity,
      );
    default:
      return false;
  }
}

export type OperationalReadinessState = 'READY' | 'BLOCKED' | 'TEST_ONLY';

export function resolveOperationalReadinessState(
  config: OperationalProvidersConfig,
  kind: 'payment' | 'email' | 'sms',
): OperationalReadinessState {
  const selection =
    kind === 'payment'
      ? config.paymentProvider
      : kind === 'email'
        ? config.emailProvider
        : config.smsProvider;

  if (selection === 'test') {
    return 'TEST_ONLY';
  }

  return isOperationalProviderConfigured(config, kind) ? 'READY' : 'BLOCKED';
}
