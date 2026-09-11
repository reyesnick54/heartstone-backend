import { Injectable, NotFoundException } from '@nestjs/common';
import { FormFieldType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { FormConditionalLogicService } from './form-conditional-logic.service';
import { validateFieldValue } from './form-field-validation.util';
import { mapFormVersionToLoadedFields, parseFieldOptions } from './form-version-loader.util';
import {
  FormAnswers,
  FormFieldValidationError,
  FormResponseValidationResult,
} from './types/form-engine.types';

@Injectable()
export class FormResponseValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionalLogic: FormConditionalLogicService,
  ) {}

  async validateResponse(
    formVersionId: string,
    answers: FormAnswers,
  ): Promise<FormResponseValidationResult> {
    const formVersion = await this.prisma.formVersion.findUnique({
      where: { id: formVersionId },
      include: {
        formDefinition: true,
        sections: {
          orderBy: { displayOrder: 'asc' },
          include: {
            fields: {
              orderBy: { displayOrder: 'asc' },
              include: {
                conditionalRules: {
                  orderBy: { displayOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!formVersion) {
      throw new NotFoundException(`FormVersion "${formVersionId}" was not found`);
    }

    const fields = mapFormVersionToLoadedFields(formVersion, this.conditionalLogic);
    const knownFieldKeys = new Set(fields.map((field) => field.fieldKey));
    const unknownFields = Object.keys(answers).filter((key) => !knownFieldKeys.has(key));

    const fieldErrors: FormFieldValidationError[] = [];
    const missingRequiredFields: string[] = [];

    for (const unknownField of unknownFields) {
      fieldErrors.push({
        fieldKey: unknownField,
        code: 'UNKNOWN_FIELD',
        message: 'Field is not defined in this form version',
      });
    }

    for (const field of fields) {
      const visible = this.conditionalLogic.isFieldVisible(field, answers);
      if (!visible) {
        continue;
      }

      const required = this.conditionalLogic.isFieldRequired(field, answers);
      const value = answers[field.fieldKey];
      const isEmpty =
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0);

      if (required && isEmpty && field.fieldType !== FormFieldType.INFORMATION_DISPLAY) {
        missingRequiredFields.push(field.fieldKey);
        fieldErrors.push({
          fieldKey: field.fieldKey,
          code: 'REQUIRED',
          message: 'Field is required',
        });
        continue;
      }

      if (isEmpty) {
        continue;
      }

      fieldErrors.push(...validateFieldValue(field, value, answers));

      const optionFieldTypes: FormFieldType[] = [
        FormFieldType.SELECT,
        FormFieldType.RADIO,
        FormFieldType.MULTISELECT,
        FormFieldType.CHECKBOX,
      ];

      if (optionFieldTypes.includes(field.fieldType)) {
        const options = parseFieldOptions(field.options);
        if (options) {
          const allowed = new Set(options.map((option) => option.value));
          const values = Array.isArray(value)
            ? value.map((entry) =>
                typeof entry === 'string' ? entry : typeof entry === 'number' ? String(entry) : '',
              )
            : [typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''];
          const invalid = values.filter((entry) => !allowed.has(entry));
          if (invalid.length > 0) {
            fieldErrors.push({
              fieldKey: field.fieldKey,
              code: 'INVALID_OPTION',
              message: `Invalid option value(s): ${invalid.join(', ')}`,
            });
          }
        }
      }
    }

    const outcome = fieldErrors.length === 0 ? 'VALID' : 'INVALID';

    return {
      outcome,
      formVersionId: formVersion.id,
      formDefinitionId: formVersion.formDefinitionId,
      version: formVersion.version,
      fieldErrors,
      missingRequiredFields,
      unknownFields,
    };
  }
}
