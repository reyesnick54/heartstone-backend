import { BadRequestException } from '@nestjs/common';

import { UNSAFE_CONDITION_KEYS } from '../workflow.constants';

const ALLOWED_CONDITION_OPERATORS = new Set([
  'equals',
  'notEquals',
  'in',
  'notIn',
  'isEmpty',
  'isNotEmpty',
  'greaterThan',
  'lessThan',
  'and',
  'or',
]);

export function assertSafeConditionStructure(
  value: unknown,
  path = 'condition',
  depth = 0,
): void {
  if (depth > 8) {
    throw new BadRequestException(`${path} exceeds maximum nesting depth`);
  }

  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      assertSafeConditionStructure(value[index], `${path}[${String(index)}]`, depth + 1);
    }
    return;
  }

  if (typeof value !== 'object') {
    if (typeof value === 'string' && value.length > 2048) {
      throw new BadRequestException(`${path} string value exceeds maximum length`);
    }
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase();
    if (UNSAFE_CONDITION_KEYS.includes(normalizedKey as (typeof UNSAFE_CONDITION_KEYS)[number])) {
      throw new BadRequestException(`${path}.${key} uses unsafe condition key "${key}"`);
    }

    if (path.endsWith('conditionConfig') || path.includes('Rules')) {
      if (!ALLOWED_CONDITION_OPERATORS.has(normalizedKey) && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        throw new BadRequestException(`${path}.${key} is not an allowed condition field`);
      }
    }

    assertSafeConditionStructure(nested, `${path}.${key}`, depth + 1);
  }
}
