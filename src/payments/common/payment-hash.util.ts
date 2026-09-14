import { createHash } from 'node:crypto';

export function hashPaymentPayload(payload: unknown): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

export function containsForbiddenPciData(payload: Record<string, unknown>): boolean {
  const forbiddenKeys = ['pan', 'cvv', 'cvc', 'cardNumber', 'card_number', 'pin', 'magneticStripe'];
  for (const [key, value] of Object.entries(payload)) {
    if (forbiddenKeys.includes(key.toLowerCase())) {
      return true;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (containsForbiddenPciData(value as Record<string, unknown>)) {
        return true;
      }
    }
  }
  return false;
}
