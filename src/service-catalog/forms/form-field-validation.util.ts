import { FormFieldType } from '@prisma/client';

import {
  type FormAnswers,
  type FormFieldValidationError,
  type LoadedFormField,
} from './types/form-engine.types';

const SAFE_PATTERN_PRESETS: Record<string, RegExp> = {
  ALPHANUMERIC: /^[A-Za-z0-9]+$/,
  NUMERIC: /^[0-9]+$/,
  POSTAL_CODE: /^[A-Za-z0-9 -]{3,12}$/,
};

const ISO_COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

function valueToString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  return '';
}

export function validateFieldValue(
  field: LoadedFormField,
  value: unknown,
  answers: FormAnswers,
): FormFieldValidationError[] {
  if (field.fieldType === FormFieldType.INFORMATION_DISPLAY) {
    return [];
  }

  const errors: FormFieldValidationError[] = [];
  const validation = field.validationDefinition;

  if (value === undefined || value === null || value === '') {
    return errors;
  }

  switch (field.fieldType) {
    case FormFieldType.EMAIL:
      if (!isValidEmail(valueToString(value))) {
        errors.push({
          fieldKey: field.fieldKey,
          code: 'INVALID_EMAIL',
          message: 'Value must be a valid email address',
        });
      }
      break;
    case FormFieldType.COUNTRY:
      if (!ISO_COUNTRY_CODE_PATTERN.test(valueToString(value))) {
        errors.push({
          fieldKey: field.fieldKey,
          code: 'INVALID_COUNTRY_CODE',
          message: 'Value must be a valid ISO 3166-1 alpha-2 country code',
        });
      }
      break;
    case FormFieldType.INTEGER:
      if (!Number.isInteger(Number(value))) {
        errors.push({
          fieldKey: field.fieldKey,
          code: 'INVALID_INTEGER',
          message: 'Value must be an integer',
        });
      }
      break;
    case FormFieldType.DECIMAL:
    case FormFieldType.NUMBER:
    case FormFieldType.CURRENCY:
      if (Number.isNaN(Number(value))) {
        errors.push({
          fieldKey: field.fieldKey,
          code: 'INVALID_NUMBER',
          message: 'Value must be a number',
        });
      }
      break;
    case FormFieldType.BOOLEAN:
      if (typeof value !== 'boolean') {
        errors.push({
          fieldKey: field.fieldKey,
          code: 'INVALID_BOOLEAN',
          message: 'Value must be a boolean',
        });
      }
      break;
    case FormFieldType.DATE:
    case FormFieldType.DATETIME:
      if (!isValidDateValue(valueToString(value))) {
        errors.push({
          fieldKey: field.fieldKey,
          code: 'INVALID_DATE',
          message: 'Value must be a valid date',
        });
      }
      break;
    case FormFieldType.MULTISELECT:
    case FormFieldType.CHECKBOX:
      if (!Array.isArray(value)) {
        errors.push({
          fieldKey: field.fieldKey,
          code: 'INVALID_ARRAY',
          message: 'Value must be an array',
        });
      }
      break;
    default:
      break;
  }

  if (typeof value === 'string') {
    if (validation.minLength !== undefined && value.length < validation.minLength) {
      errors.push({
        fieldKey: field.fieldKey,
        code: 'MIN_LENGTH',
        message: `Value must be at least ${String(validation.minLength)} characters`,
      });
    }

    if (validation.maxLength !== undefined && value.length > validation.maxLength) {
      errors.push({
        fieldKey: field.fieldKey,
        code: 'MAX_LENGTH',
        message: `Value must be at most ${String(validation.maxLength)} characters`,
      });
    }
  }

  if (validation.min !== undefined || validation.max !== undefined) {
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
      if (validation.min !== undefined && numericValue < validation.min) {
        errors.push({
          fieldKey: field.fieldKey,
          code: 'MIN_VALUE',
          message: `Value must be greater than or equal to ${String(validation.min)}`,
        });
      }
      if (validation.max !== undefined && numericValue > validation.max) {
        errors.push({
          fieldKey: field.fieldKey,
          code: 'MAX_VALUE',
          message: `Value must be less than or equal to ${String(validation.max)}`,
        });
      }
    }
  }

  if (validation.minDate || validation.maxDate) {
    const dateValue = new Date(valueToString(value));
    if (!Number.isNaN(dateValue.getTime())) {
      if (validation.minDate && dateValue < new Date(validation.minDate)) {
        errors.push({
          fieldKey: field.fieldKey,
          code: 'MIN_DATE',
          message: `Date must be on or after ${validation.minDate}`,
        });
      }
      if (validation.maxDate && dateValue > new Date(validation.maxDate)) {
        errors.push({
          fieldKey: field.fieldKey,
          code: 'MAX_DATE',
          message: `Date must be on or before ${validation.maxDate}`,
        });
      }
    }
  }

  if (validation.allowedValues && validation.allowedValues.length > 0) {
    const values = Array.isArray(value)
      ? value.map((entry) => valueToString(entry))
      : [valueToString(value)];
    const invalid = values.filter((entry) => !validation.allowedValues?.includes(entry));
    if (invalid.length > 0) {
      errors.push({
        fieldKey: field.fieldKey,
        code: 'INVALID_OPTION',
        message: `Value must be one of: ${validation.allowedValues.join(', ')}`,
      });
    }
  }

  if (validation.patternPreset) {
    const preset = SAFE_PATTERN_PRESETS[validation.patternPreset];
    if (preset && !preset.test(valueToString(value))) {
      errors.push({
        fieldKey: field.fieldKey,
        code: 'PATTERN_MISMATCH',
        message: `Value does not match required pattern preset ${validation.patternPreset}`,
      });
    }
  }

  if (validation.equalsField) {
    if (answers[validation.equalsField] !== value) {
      errors.push({
        fieldKey: field.fieldKey,
        code: 'FIELDS_NOT_EQUAL',
        message: `Value must equal field ${validation.equalsField}`,
      });
    }
  }

  if (validation.notEqualsField) {
    if (answers[validation.notEqualsField] === value) {
      errors.push({
        fieldKey: field.fieldKey,
        code: 'FIELDS_EQUAL',
        message: `Value must not equal field ${validation.notEqualsField}`,
      });
    }
  }

  if (validation.countryCode && !ISO_COUNTRY_CODE_PATTERN.test(valueToString(value))) {
    errors.push({
      fieldKey: field.fieldKey,
      code: 'INVALID_COUNTRY_CODE',
      message: 'Value must be a valid ISO 3166-1 alpha-2 country code',
    });
  }

  return errors;
}

export function isSensitiveDefaultValue(fieldType: FormFieldType, value: unknown): boolean {
  const sensitiveTypes = new Set<FormFieldType>([
    FormFieldType.EMAIL,
    FormFieldType.PHONE,
    FormFieldType.IDENTIFIER,
    FormFieldType.ADDRESS,
    FormFieldType.FILE_REFERENCE,
    FormFieldType.DECLARATION,
  ]);

  return sensitiveTypes.has(fieldType) && value !== undefined && value !== null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidDateValue(value: string): boolean {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}
