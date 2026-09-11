import {
  FormConditionalAction,
  FormConditionalLogic,
  FormConditionalOperator,
  FormFieldType,
} from '@prisma/client';

import { type PrismaService } from '../../database/prisma.service';
import { FormConditionalLogicService } from './form-conditional-logic.service';
import { FormResponseValidationService } from './form-response-validation.service';

describe('FormResponseValidationService', () => {
  const prisma = {
    formVersion: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new FormResponseValidationService(prisma, new FormConditionalLogicService());

  const baseFormVersion = {
    id: 'version-1',
    formDefinitionId: 'definition-1',
    version: 1,
    formDefinition: { code: 'test-form' },
    sections: [
      {
        sectionKey: 'main',
        displayOrder: 1,
        fields: [
          {
            id: 'field-1',
            fieldKey: 'full_name',
            fieldType: FormFieldType.TEXT,
            required: true,
            displayOrder: 1,
            defaultValue: null,
            validationDefinition: { minLength: 2, maxLength: 50 },
            options: null,
            conditionalRules: [],
          },
          {
            id: 'field-2',
            fieldKey: 'age',
            fieldType: FormFieldType.INTEGER,
            required: false,
            displayOrder: 2,
            defaultValue: null,
            validationDefinition: { min: 18, max: 120 },
            options: null,
            conditionalRules: [],
          },
          {
            id: 'field-3',
            fieldKey: 'country',
            fieldType: FormFieldType.SELECT,
            required: true,
            displayOrder: 3,
            defaultValue: null,
            validationDefinition: {},
            options: [
              { value: 'AG', label: { default: 'Antigua and Barbuda' } },
              { value: 'US', label: { default: 'United States' } },
            ],
            conditionalRules: [],
          },
          {
            id: 'field-4',
            fieldKey: 'partner_name',
            fieldType: FormFieldType.TEXT,
            required: false,
            displayOrder: 4,
            defaultValue: null,
            validationDefinition: {},
            options: null,
            conditionalRules: [
              {
                action: FormConditionalAction.REQUIRE,
                logic: FormConditionalLogic.AND,
                conditions: [
                  {
                    fieldKey: 'has_partner',
                    operator: FormConditionalOperator.EQUALS,
                    value: true,
                  },
                ],
              },
            ],
          },
          {
            id: 'field-5',
            fieldKey: 'has_partner',
            fieldType: FormFieldType.BOOLEAN,
            required: false,
            displayOrder: 5,
            defaultValue: null,
            validationDefinition: {},
            options: null,
            conditionalRules: [],
          },
          {
            id: 'field-6',
            fieldKey: 'declaration',
            fieldType: FormFieldType.DECLARATION,
            required: true,
            displayOrder: 6,
            defaultValue: null,
            validationDefinition: {},
            options: {
              declarationVersion: '1.0.0',
              declarationText: { en: 'I declare the information is accurate.' },
            },
            conditionalRules: [],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.formVersion.findUnique as jest.Mock).mockResolvedValue(baseFormVersion);
  });

  it('returns VALID for complete valid answers', async () => {
    const result = await service.validateResponse('version-1', {
      full_name: 'Jane Citizen',
      age: 30,
      country: 'AG',
      has_partner: false,
      declaration: true,
    });

    expect(result.outcome).toBe('VALID');
    expect(result.fieldErrors).toHaveLength(0);
    expect(result.missingRequiredFields).toHaveLength(0);
    expect(result.unknownFields).toHaveLength(0);
  });

  it('flags missing required and conditionally required fields', async () => {
    const result = await service.validateResponse('version-1', {
      has_partner: true,
      declaration: true,
    });

    expect(result.outcome).toBe('INVALID');
    expect(result.missingRequiredFields).toEqual(
      expect.arrayContaining(['full_name', 'partner_name', 'country']),
    );
  });

  it('rejects unknown fields', async () => {
    const result = await service.validateResponse('version-1', {
      full_name: 'Jane Citizen',
      country: 'AG',
      declaration: true,
      unexpected_field: 'value',
    });

    expect(result.outcome).toBe('INVALID');
    expect(result.unknownFields).toContain('unexpected_field');
  });

  it('rejects invalid select options and numeric bounds', async () => {
    const result = await service.validateResponse('version-1', {
      full_name: 'Jane Citizen',
      age: 10,
      country: 'ZZ',
      declaration: true,
    });

    expect(result.outcome).toBe('INVALID');
    expect(result.fieldErrors.some((error) => error.fieldKey === 'age')).toBe(true);
    expect(result.fieldErrors.some((error) => error.fieldKey === 'country')).toBe(true);
  });

  it('does not create application or case records', async () => {
    const result = await service.validateResponse('version-1', {
      full_name: 'Jane Citizen',
      country: 'AG',
      declaration: true,
    });

    expect(result).not.toHaveProperty('applicationId');
    expect(result).not.toHaveProperty('caseId');
    expect(result.formVersionId).toBe('version-1');
  });
});
