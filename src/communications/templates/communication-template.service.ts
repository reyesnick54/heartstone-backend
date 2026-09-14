import { Injectable } from '@nestjs/common';
import {
  type CommunicationTemplate,
  type CommunicationTemplateVersion,
  CommunicationTemplateVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CommunicationTemplateNotFoundException,
  CommunicationTemplateVersionImmutableException,
} from '../common/communications.exceptions';
import {
  assertSafeTemplateContent,
  validateTemplateFields,
} from '../common/template-sanitizer.util';

export interface CreateCommunicationTemplateInput {
  code: string;
  name: string;
  description?: string;
  communicationType: string;
}

export interface CreateCommunicationTemplateVersionInput {
  templateId: string;
  subjectTemplate: string;
  bodyTemplate: string;
  fieldDefinitions: { key: string; source: string; required?: boolean }[];
  allowedChannels: CommunicationTemplateVersion['allowedChannels'];
  deliveryEffect?: CommunicationTemplateVersion['deliveryEffect'];
  requiresApproval?: boolean;
  certifiedTranslationRequired?: boolean;
}

@Injectable()
export class CommunicationTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(input: CreateCommunicationTemplateInput): Promise<CommunicationTemplate> {
    return this.prisma.communicationTemplate.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        communicationType: input.communicationType,
      },
    });
  }

  async createVersion(
    input: CreateCommunicationTemplateVersionInput,
  ): Promise<CommunicationTemplateVersion> {
    const template = await this.prisma.communicationTemplate.findUnique({
      where: { id: input.templateId },
    });

    if (!template) {
      throw new CommunicationTemplateNotFoundException(input.templateId);
    }

    assertSafeTemplateStrings(input.subjectTemplate, input.bodyTemplate);

    const latest = await this.prisma.communicationTemplateVersion.findFirst({
      where: { templateId: input.templateId },
      orderBy: { versionNumber: 'desc' },
    });

    const humanFieldKeys = input.fieldDefinitions
      .filter((field) => field.source === 'HUMAN_ENTERED_TEXT')
      .map((field) => field.key);

    validateTemplateFields({}, humanFieldKeys);

    return this.prisma.communicationTemplateVersion.create({
      data: {
        templateId: input.templateId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        subjectTemplate: input.subjectTemplate,
        bodyTemplate: input.bodyTemplate,
        fieldDefinitions: input.fieldDefinitions,
        allowedChannels: input.allowedChannels,
        deliveryEffect: input.deliveryEffect,
        requiresApproval: input.requiresApproval ?? true,
        certifiedTranslationRequired: input.certifiedTranslationRequired ?? false,
      },
    });
  }

  async activateVersion(
    versionId: string,
    activatedByIdentityId: string,
  ): Promise<CommunicationTemplateVersion> {
    const version = await this.prisma.communicationTemplateVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new CommunicationTemplateNotFoundException(versionId);
    }

    if (version.status === CommunicationTemplateVersionStatus.ACTIVE) {
      return version;
    }

    const activatedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.communicationTemplateVersion.updateMany({
        where: {
          templateId: version.templateId,
          status: CommunicationTemplateVersionStatus.ACTIVE,
        },
        data: { status: CommunicationTemplateVersionStatus.SUPERSEDED },
      });

      return tx.communicationTemplateVersion.update({
        where: { id: versionId },
        data: {
          status: CommunicationTemplateVersionStatus.ACTIVE,
          activatedAt,
          activatedByIdentityId,
        },
      });
    });
  }

  async assertVersionMutable(versionId: string): Promise<CommunicationTemplateVersion> {
    const version = await this.prisma.communicationTemplateVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new CommunicationTemplateNotFoundException(versionId);
    }

    if (version.status === CommunicationTemplateVersionStatus.ACTIVE) {
      throw new CommunicationTemplateVersionImmutableException(versionId);
    }

    return version;
  }
}

function assertSafeTemplateStrings(subjectTemplate: string, bodyTemplate: string): void {
  assertSafeTemplateContent('subjectTemplate', subjectTemplate);
  assertSafeTemplateContent('bodyTemplate', bodyTemplate);
}
