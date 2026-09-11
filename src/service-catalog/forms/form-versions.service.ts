import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FormVersion, FormVersionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { CreateFormSectionDto } from './dto/create-form-section.dto';
import {
  CreateFormVersionDto,
  CreateNextFormVersionDto,
  UpdateDraftFormVersionDto,
} from './dto/create-form-version.dto';
import { FormConditionalLogicService } from './form-conditional-logic.service';
import { isSensitiveDefaultValue } from './form-field-validation.util';
import { mapFormVersionToLoadedFields, parseDeclarationOptions } from './form-version-loader.util';

@Injectable()
export class FormVersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionalLogic: FormConditionalLogicService,
  ) {}

  async create(dto: CreateFormVersionDto): Promise<FormVersion> {
    const definition = await this.prisma.formDefinition.findUnique({
      where: { id: dto.formDefinitionId },
    });

    if (!definition) {
      throw new NotFoundException(`FormDefinition "${dto.formDefinitionId}" was not found`);
    }

    const versionNumber = dto.version ?? (await this.getNextVersionNumber(dto.formDefinitionId));

    this.validateSections(dto.sections);

    const formVersion = await this.prisma.formVersion.create({
      data: {
        formDefinitionId: dto.formDefinitionId,
        version: versionNumber,
        title: dto.title as Prisma.InputJsonValue,
        instructions: dto.instructions as Prisma.InputJsonValue | undefined,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
        status: FormVersionStatus.DRAFT,
        sections: {
          create: dto.sections.map((section) => this.mapSectionCreate(section)),
        },
      },
    });

    await this.assertConditionalIntegrity(formVersion.id);
    return formVersion;
  }

  async createNextVersion(
    formDefinitionId: string,
    dto: CreateNextFormVersionDto,
  ): Promise<FormVersion> {
    const latestAny = await this.prisma.formVersion.findFirst({
      where: { formDefinitionId },
      orderBy: { version: 'desc' },
    });

    if (!latestAny) {
      throw new BadRequestException('Cannot create next version without an existing form version');
    }

    const nextVersionNumber = latestAny.version + 1;
    this.validateSections(dto.sections);

    const newVersion = await this.prisma.formVersion.create({
      data: {
        formDefinitionId,
        version: nextVersionNumber,
        title: dto.title as Prisma.InputJsonValue,
        instructions: dto.instructions as Prisma.InputJsonValue | undefined,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
        status: FormVersionStatus.DRAFT,
        sections: {
          create: dto.sections.map((section) => this.mapSectionCreate(section)),
        },
      },
    });

    await this.assertConditionalIntegrity(newVersion.id);
    return newVersion;
  }

  async updateDraft(id: string, dto: UpdateDraftFormVersionDto): Promise<FormVersion> {
    const existing = await this.findOne(id);
    this.assertMutable(existing);

    return this.prisma.formVersion.update({
      where: { id },
      data: {
        title: dto.title as Prisma.InputJsonValue,
        instructions: dto.instructions as Prisma.InputJsonValue | undefined,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
      },
    });
  }

  async publish(id: string): Promise<FormVersion> {
    const existing = await this.findOne(id);
    if (existing.status !== FormVersionStatus.DRAFT) {
      throw new BadRequestException('Only draft form versions can be published');
    }

    await this.assertConditionalIntegrity(id);

    const latestPublished = await this.prisma.formVersion.findFirst({
      where: {
        formDefinitionId: existing.formDefinitionId,
        status: FormVersionStatus.PUBLISHED,
      },
      orderBy: { version: 'desc' },
    });

    const published = await this.prisma.formVersion.update({
      where: { id },
      data: {
        status: FormVersionStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    if (latestPublished) {
      await this.prisma.formVersion.update({
        where: { id: latestPublished.id },
        data: {
          status: FormVersionStatus.SUPERSEDED,
          supersededById: published.id,
        },
      });
    }

    return published;
  }

  async findOne(id: string): Promise<FormVersion> {
    const formVersion = await this.prisma.formVersion.findUnique({ where: { id } });
    if (!formVersion) {
      throw new NotFoundException(`FormVersion "${id}" was not found`);
    }
    return formVersion;
  }

  async findByDefinition(formDefinitionId: string): Promise<FormVersion[]> {
    return this.prisma.formVersion.findMany({
      where: { formDefinitionId },
      orderBy: { version: 'asc' },
    });
  }

  async getReconstructableVersion(id: string): Promise<FormVersion> {
    const formVersion = await this.prisma.formVersion.findUnique({
      where: { id },
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
      throw new NotFoundException(`FormVersion "${id}" was not found`);
    }

    mapFormVersionToLoadedFields(formVersion, this.conditionalLogic);
    return formVersion;
  }

  private async getNextVersionNumber(formDefinitionId: string): Promise<number> {
    const latest = await this.prisma.formVersion.findFirst({
      where: { formDefinitionId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return (latest?.version ?? 0) + 1;
  }

  private validateSections(sections: CreateFormSectionDto[]): void {
    const fieldKeys = new Set<string>();

    for (const section of sections) {
      for (const field of section.fields) {
        if (fieldKeys.has(field.fieldKey)) {
          throw new BadRequestException(`Duplicate field key "${field.fieldKey}"`);
        }
        fieldKeys.add(field.fieldKey);

        if (isSensitiveDefaultValue(field.fieldType, field.defaultValue)) {
          throw new BadRequestException(
            `Field "${field.fieldKey}" cannot store sensitive default values`,
          );
        }

        parseDeclarationOptions(field.fieldType, field.options);

        if (field.conditionalRules) {
          for (const rule of field.conditionalRules) {
            this.conditionalLogic.parseConditionalRules([rule]);
          }
        }
      }
    }

    const loadedFields = sections.flatMap((section) =>
      section.fields.map((field) => ({
        id: field.fieldKey,
        fieldKey: field.fieldKey,
        fieldType: field.fieldType,
        required: field.required ?? false,
        displayOrder: field.displayOrder,
        defaultValue: field.defaultValue,
        validationDefinition: field.validationDefinition ?? {},
        options: field.options,
        conditionalRules: (field.conditionalRules ?? []).map((rule) => ({
          action: rule.action,
          logic: rule.logic ?? 'AND',
          conditions: rule.conditions,
        })),
        sectionKey: section.sectionKey,
      })),
    );

    this.conditionalLogic.assertNoCircularDependencies(loadedFields);
  }

  private mapSectionCreate(
    section: CreateFormSectionDto,
  ): Prisma.FormSectionCreateWithoutFormVersionInput {
    return {
      sectionKey: section.sectionKey,
      title: section.title as Prisma.InputJsonValue,
      description: section.description as Prisma.InputJsonValue | undefined,
      displayOrder: section.displayOrder,
      fields: {
        create: section.fields.map((field) => this.mapFieldCreate(field)),
      },
    };
  }

  private mapFieldCreate(field: CreateFormFieldDto): Prisma.FormFieldCreateWithoutFormSectionInput {
    return {
      fieldKey: field.fieldKey,
      label: field.label as Prisma.InputJsonValue,
      description: field.description as Prisma.InputJsonValue | undefined,
      fieldType: field.fieldType,
      required: field.required ?? false,
      displayOrder: field.displayOrder,
      defaultValue: field.defaultValue as Prisma.InputJsonValue | undefined,
      placeholder: field.placeholder as Prisma.InputJsonValue | undefined,
      dataClassification: field.dataClassification,
      validationDefinition: (field.validationDefinition ?? {}) as Prisma.InputJsonValue,
      options: field.options as Prisma.InputJsonValue | undefined,
      sourceMetadata: field.sourceMetadata as Prisma.InputJsonValue | undefined,
      conditionalRules: field.conditionalRules
        ? {
            create: field.conditionalRules.map((rule) => ({
              action: rule.action,
              logic: rule.logic,
              displayOrder: rule.displayOrder ?? 0,
              conditions: rule.conditions as unknown as Prisma.InputJsonValue,
            })),
          }
        : undefined,
    };
  }

  private async assertConditionalIntegrity(formVersionId: string): Promise<void> {
    const formVersion = await this.prisma.formVersion.findUnique({
      where: { id: formVersionId },
      include: {
        formDefinition: true,
        sections: {
          include: {
            fields: {
              include: {
                conditionalRules: true,
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
  }

  private assertMutable(formVersion: FormVersion): void {
    if (formVersion.status === FormVersionStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published form versions are immutable; create a new version instead',
      );
    }

    if (formVersion.status === FormVersionStatus.SUPERSEDED) {
      throw new BadRequestException('Superseded form versions cannot be modified');
    }
  }
}
