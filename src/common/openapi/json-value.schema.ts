import { type ApiPropertyOptions } from '@nestjs/swagger';

/**
 * OpenAPI schema for an arbitrary JSON value (a Prisma `Json` column or a configuration
 * payload whose structure is defined by government configuration rather than by code).
 *
 * Spread into `@ApiProperty({ ...jsonValueSchema() })` so generated clients type the field as
 * "any JSON" instead of an empty object.
 */
export function jsonValueSchema(): ApiPropertyOptions {
  return {
    oneOf: [
      { type: 'object', additionalProperties: true },
      { type: 'array', items: {} },
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
    ],
  };
}

/** Schema for a `Record<string, string>` map such as localized labels or route params. */
export const STRING_MAP_SCHEMA = {
  type: 'object',
  additionalProperties: { type: 'string' },
} as const satisfies ApiPropertyOptions;

/** Schema for a `Record<string, unknown>` object whose keys are configuration-defined. */
export const FREE_FORM_OBJECT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
} as const satisfies ApiPropertyOptions;
