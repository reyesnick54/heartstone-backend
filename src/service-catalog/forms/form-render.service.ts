import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { isLocalizedText, resolveLocalizedText } from '../common/localized-text.types';
import { FormConditionalLogicService } from './form-conditional-logic.service';
import {
  mapFormVersionToLoadedFields,
  parseDeclarationOptions,
  parseFieldOptions,
  parseValidationDefinition,
} from './form-version-loader.util';
import { RenderedFormSchema, RenderedFormSectionSchema } from './types/form-engine.types';

@Injectable()
export class FormRenderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionalLogic: FormConditionalLogicService,
  ) {}

  async renderFormSchema(formVersionId: string, locale = 'default'): Promise<RenderedFormSchema> {
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

    mapFormVersionToLoadedFields(formVersion, this.conditionalLogic);

    const sections: RenderedFormSectionSchema[] = formVersion.sections.map((section) => ({
      sectionKey: section.sectionKey,
      title: this.toLocalizedRecord(section.title, locale),
      description: section.description
        ? this.toLocalizedRecord(section.description, locale)
        : undefined,
      displayOrder: section.displayOrder,
      fields: section.fields.map((field) => ({
        fieldKey: field.fieldKey,
        label: this.toLocalizedRecord(field.label, locale),
        description: field.description
          ? this.toLocalizedRecord(field.description, locale)
          : undefined,
        fieldType: field.fieldType,
        required: field.required,
        displayOrder: field.displayOrder,
        defaultValue: field.defaultValue ?? undefined,
        placeholder: field.placeholder
          ? this.toLocalizedRecord(field.placeholder, locale)
          : undefined,
        dataClassification: field.dataClassification,
        validation: parseValidationDefinition(field.validationDefinition),
        options: parseFieldOptions(field.options),
        declaration: parseDeclarationOptions(field.fieldType, field.options),
        sourceMetadata:
          typeof field.sourceMetadata === 'object' && field.sourceMetadata !== null
            ? (field.sourceMetadata as Record<string, unknown>)
            : undefined,
        conditionalRules: field.conditionalRules.map((rule) => ({
          action: rule.action,
          logic: rule.logic,
          conditions: Array.isArray(rule.conditions)
            ? (rule.conditions as unknown as RenderedFormSchema['sections'][number]['fields'][number]['conditionalRules'][number]['conditions'])
            : [],
        })),
      })),
    }));

    return {
      formVersionId: formVersion.id,
      formDefinitionId: formVersion.formDefinitionId,
      formDefinitionCode: formVersion.formDefinition.code,
      version: formVersion.version,
      title: this.toLocalizedRecord(formVersion.title, locale),
      instructions: formVersion.instructions
        ? this.toLocalizedRecord(formVersion.instructions, locale)
        : undefined,
      status: formVersion.status,
      effectiveFrom: formVersion.effectiveFrom?.toISOString(),
      effectiveUntil: formVersion.effectiveUntil?.toISOString(),
      sections,
    };
  }

  private toLocalizedRecord(value: Prisma.JsonValue, locale: string): Record<string, string> {
    if (!isLocalizedText(value)) {
      if (typeof value === 'string') {
        return { default: value };
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return { default: String(value) };
      }

      return { default: '' };
    }

    const record: Record<string, string> = {};
    if (typeof value.default === 'string') {
      record.default = value.default;
    }

    if (value.translations) {
      for (const [key, translation] of Object.entries(value.translations)) {
        record[key] = translation;
      }
    } else {
      for (const [key, translation] of Object.entries(value)) {
        if (key !== 'default' && typeof translation === 'string') {
          record[key] = translation;
        }
      }
    }

    record[locale] ??= resolveLocalizedText(value, locale);

    return record;
  }
}
