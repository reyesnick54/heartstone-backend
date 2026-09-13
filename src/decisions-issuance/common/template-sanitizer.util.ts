import { FORBIDDEN_TEMPLATE_INJECTION_PATTERNS } from '../decisions-issuance.constants';
import { TemplateInjectionException } from './exceptions/issuance.exceptions';

export function assertSafeTemplateContent(fieldName: string, value: string): void {
  for (const pattern of FORBIDDEN_TEMPLATE_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      throw new TemplateInjectionException(fieldName);
    }
  }
}

export function sanitizeFreeFormFieldValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.replace(/[<>&]/g, (char) => {
      switch (char) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        default:
          return char;
      }
    });
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (value === null || value === undefined) {
    return '';
  }

  return '';
}

export function validateFreeFormFields(
  fields: Record<string, unknown>,
  allowedKeys: string[],
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const key of allowedKeys) {
    const value = fields[key];
    if (value === undefined) {
      continue;
    }
    const stringValue = sanitizeFreeFormFieldValue(value);
    assertSafeTemplateContent(key, stringValue);
    sanitized[key] = stringValue;
  }
  return sanitized;
}
