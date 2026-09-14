import { redactSensitiveObject } from '../../common/logging/log-redaction';

export function buildIntegrationLogContext(
  context: Record<string, unknown>,
): Record<string, unknown> {
  return redactSensitiveObject(context);
}
