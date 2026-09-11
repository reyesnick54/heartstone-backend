import { createHash } from 'node:crypto';

export interface ServiceConfigurationFingerprintInput {
  serviceVersionId: string;
  formVersionId: string | null;
  feeDefinitionIds: string[];
  eligibilityRuleIds: string[];
  checklistItemIds: string[];
}

export function buildServiceConfigurationFingerprint(
  input: ServiceConfigurationFingerprintInput,
): string {
  const payload = {
    serviceVersionId: input.serviceVersionId,
    formVersionId: input.formVersionId,
    feeDefinitionIds: [...input.feeDefinitionIds].sort(),
    eligibilityRuleIds: [...input.eligibilityRuleIds].sort(),
    checklistItemIds: [...input.checklistItemIds].sort(),
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
