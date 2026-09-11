import { BadRequestException } from '@nestjs/common';
import { FormFieldType, type Prisma } from '@prisma/client';

import { type FormConditionalLogicService } from './form-conditional-logic.service';
import { isSensitiveDefaultValue } from './form-field-validation.util';
import {
  type FormConditionalRuleDefinition,
  type FormDeclarationOptions,
  type FormFieldOptionDefinition,
  type FormValidationDefinition,
  type LoadedFormField,
} from './types/form-engine.types';

export type FormVersionWithStructure = Prisma.FormVersionGetPayload<{
  include: {
    formDefinition: true;
    sections: {
      orderBy: { displayOrder: 'asc' };
      include: {
        fields: {
          orderBy: { displayOrder: 'asc' };
          include: {
            conditionalRules: {
              orderBy: { displayOrder: 'asc' };
            };
          };
        };
      };
    };
  };
}>;

export function mapFormVersionToLoadedFields(
  formVersion: FormVersionWithStructure,
  conditionalLogic: FormConditionalLogicService,
): LoadedFormField[] {
  const fields: LoadedFormField[] = [];

  for (const section of formVersion.sections) {
    for (const field of section.fields) {
      if (isSensitiveDefaultValue(field.fieldType, field.defaultValue)) {
        throw new BadRequestException(
          `Field "${field.fieldKey}" cannot store sensitive default values`,
        );
      }

      fields.push({
        id: field.id,
        fieldKey: field.fieldKey,
        fieldType: field.fieldType,
        required: field.required,
        displayOrder: field.displayOrder,
        defaultValue: field.defaultValue,
        validationDefinition: parseValidationDefinition(field.validationDefinition),
        options: field.options,
        conditionalRules: field.conditionalRules.map((rule) => ({
          action: rule.action,
          logic: rule.logic,
          conditions: parseConditions(rule.conditions),
        })),
        sectionKey: section.sectionKey,
      });
    }
  }

  conditionalLogic.assertNoCircularDependencies(fields);
  return fields;
}

export function parseValidationDefinition(value: Prisma.JsonValue): FormValidationDefinition {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const validation: FormValidationDefinition = {};

  if (typeof record.minLength === 'number') validation.minLength = record.minLength;
  if (typeof record.maxLength === 'number') validation.maxLength = record.maxLength;
  if (typeof record.min === 'number') validation.min = record.min;
  if (typeof record.max === 'number') validation.max = record.max;
  if (typeof record.minDate === 'string') validation.minDate = record.minDate;
  if (typeof record.maxDate === 'string') validation.maxDate = record.maxDate;
  if (Array.isArray(record.allowedValues)) {
    validation.allowedValues = record.allowedValues.map(String);
  }
  if (typeof record.patternPreset === 'string') {
    validation.patternPreset = record.patternPreset as FormValidationDefinition['patternPreset'];
  }
  if (typeof record.equalsField === 'string') validation.equalsField = record.equalsField;
  if (typeof record.notEqualsField === 'string') validation.notEqualsField = record.notEqualsField;
  if (record.countryCode === true) validation.countryCode = true;

  return validation;
}

export function parseFieldOptions(value: unknown): FormFieldOptionDefinition[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new BadRequestException(`Field option at index ${String(index)} must be an object`);
    }

    const record = entry as Record<string, unknown>;
    if (typeof record.value !== 'string') {
      throw new BadRequestException(`Field option at index ${String(index)} requires value`);
    }

    const label = record.label;
    if (typeof label !== 'object' || label === null || Array.isArray(label)) {
      throw new BadRequestException(
        `Field option at index ${String(index)} requires localized label`,
      );
    }

    const localizedLabel: Record<string, string> = {};
    for (const [key, labelValue] of Object.entries(label as Record<string, unknown>)) {
      if (typeof labelValue !== 'string') {
        throw new BadRequestException(
          `Field option at index ${String(index)} has invalid label entry`,
        );
      }
      localizedLabel[key] = labelValue;
    }

    return {
      value: record.value,
      label: localizedLabel,
    };
  });
}

export function parseDeclarationOptions(
  fieldType: FormFieldType,
  options: unknown,
): FormDeclarationOptions | undefined {
  if (fieldType !== FormFieldType.DECLARATION) {
    return undefined;
  }

  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new BadRequestException('Declaration fields require declaration options');
  }

  const record = options as Record<string, unknown>;
  const declarationVersion = record.declarationVersion;
  const declarationText = record.declarationText;

  if (typeof declarationVersion !== 'string' || declarationVersion.length === 0) {
    throw new BadRequestException('Declaration fields require declarationVersion');
  }

  if (
    typeof declarationText !== 'object' ||
    declarationText === null ||
    Array.isArray(declarationText)
  ) {
    throw new BadRequestException('Declaration fields require declarationText');
  }

  const localizedText: Record<string, string> = {};
  for (const [locale, text] of Object.entries(declarationText as Record<string, unknown>)) {
    if (typeof text !== 'string') {
      throw new BadRequestException('Declaration text entries must be strings');
    }
    localizedText[locale] = text;
  }

  return {
    declarationVersion,
    declarationText: localizedText,
  };
}

function parseConditions(value: Prisma.JsonValue): FormConditionalRuleDefinition['conditions'] {
  if (!Array.isArray(value)) {
    throw new BadRequestException('Conditional rule conditions must be an array');
  }

  return value.map((condition, index) => {
    if (typeof condition !== 'object' || condition === null) {
      throw new BadRequestException(`Condition at index ${String(index)} must be an object`);
    }

    const record = condition as Record<string, unknown>;
    if (typeof record.fieldKey !== 'string') {
      throw new BadRequestException(`Condition at index ${String(index)} requires fieldKey`);
    }

    if (typeof record.operator !== 'string') {
      throw new BadRequestException(`Condition at index ${String(index)} requires operator`);
    }

    return {
      fieldKey: record.fieldKey,
      operator: record.operator as FormConditionalRuleDefinition['conditions'][number]['operator'],
      value: record.value,
    };
  });
}
