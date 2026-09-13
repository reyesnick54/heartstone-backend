import { FORBIDDEN_PRIVATE_KEY_PATTERNS } from '../../decisions-issuance.constants';

export function assertNoPrivateKeyMaterial(value: string, fieldName: string): void {
  for (const pattern of FORBIDDEN_PRIVATE_KEY_PATTERNS) {
    if (pattern.test(value)) {
      throw new Error(`Private key material must never be persisted (${fieldName})`);
    }
  }
}

export function scanObjectForPrivateKeyMaterial(value: unknown, path = 'root'): string[] {
  const violations: string[] = [];

  if (typeof value === 'string') {
    for (const pattern of FORBIDDEN_PRIVATE_KEY_PATTERNS) {
      if (pattern.test(value)) {
        violations.push(path);
      }
    }
    return violations;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      violations.push(...scanObjectForPrivateKeyMaterial(item, `${path}[${String(index)}]`));
    });
    return violations;
  }

  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (/privateKey|secretKey|pkcs8/i.test(key)) {
        violations.push(`${path}.${key}`);
      }
      violations.push(...scanObjectForPrivateKeyMaterial(nested, `${path}.${key}`));
    }
  }

  return violations;
}
