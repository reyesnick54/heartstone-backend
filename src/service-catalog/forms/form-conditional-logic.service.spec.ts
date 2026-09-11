import { BadRequestException } from '@nestjs/common';
import {
  FormConditionalAction,
  FormConditionalLogic,
  FormConditionalOperator,
  FormFieldType,
} from '@prisma/client';

import { FormConditionalLogicService } from './form-conditional-logic.service';
import { type LoadedFormField } from './types/form-engine.types';

describe('FormConditionalLogicService', () => {
  const service = new FormConditionalLogicService();

  const baseField = (overrides: Partial<LoadedFormField> = {}): LoadedFormField => ({
    id: 'field-id',
    fieldKey: 'target_field',
    fieldType: FormFieldType.TEXT,
    required: false,
    displayOrder: 1,
    defaultValue: null,
    validationDefinition: {},
    options: null,
    conditionalRules: [],
    sectionKey: 'section',
    ...overrides,
  });

  it('rejects circular conditional dependencies', () => {
    const fields: LoadedFormField[] = [
      baseField({
        fieldKey: 'a',
        conditionalRules: [
          {
            action: FormConditionalAction.SHOW,
            logic: FormConditionalLogic.AND,
            conditions: [{ fieldKey: 'b', operator: FormConditionalOperator.EQUALS, value: true }],
          },
        ],
      }),
      baseField({
        fieldKey: 'b',
        conditionalRules: [
          {
            action: FormConditionalAction.SHOW,
            logic: FormConditionalLogic.AND,
            conditions: [{ fieldKey: 'a', operator: FormConditionalOperator.EQUALS, value: true }],
          },
        ],
      }),
    ];

    expect(() => {
      service.assertNoCircularDependencies(fields);
    }).toThrow(BadRequestException);
  });

  it('evaluates show and hide rules deterministically', () => {
    const field = baseField({
      conditionalRules: [
        {
          action: FormConditionalAction.SHOW,
          logic: FormConditionalLogic.AND,
          conditions: [
            { fieldKey: 'flag', operator: FormConditionalOperator.EQUALS, value: 'yes' },
          ],
        },
        {
          action: FormConditionalAction.HIDE,
          logic: FormConditionalLogic.AND,
          conditions: [
            { fieldKey: 'hidden', operator: FormConditionalOperator.EQUALS, value: true },
          ],
        },
      ],
    });

    expect(service.isFieldVisible(field, { flag: 'yes', hidden: false })).toBe(true);
    expect(service.isFieldVisible(field, { flag: 'no', hidden: false })).toBe(false);
    expect(service.isFieldVisible(field, { flag: 'yes', hidden: true })).toBe(false);
  });

  it('evaluates require and optional rules', () => {
    const field = baseField({
      required: true,
      conditionalRules: [
        {
          action: FormConditionalAction.OPTIONAL,
          logic: FormConditionalLogic.AND,
          conditions: [{ fieldKey: 'skip', operator: FormConditionalOperator.EQUALS, value: true }],
        },
        {
          action: FormConditionalAction.REQUIRE,
          logic: FormConditionalLogic.AND,
          conditions: [{ fieldKey: 'must', operator: FormConditionalOperator.EQUALS, value: true }],
        },
      ],
    });

    expect(service.isFieldRequired(field, { skip: true })).toBe(false);
    expect(service.isFieldRequired(field, { must: true })).toBe(true);
    expect(service.isFieldRequired(field, {})).toBe(true);
  });
});
