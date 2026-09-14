import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CommunicationChannelType,
  CommunicationTemplate,
  CommunicationTemplateStatus,
  CommunicationTemplateVersion,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  ALLOWED_TEMPLATE_VARIABLE_PATTERN,
  TEMPLATE_INJECTION_PATTERNS,
} from '../operational-support.constants';

export interface CreateCommunicationTemplateInput {
  code: string;
  name: string;
  channelType: CommunicationChannelType;
  institutionId?: string;
}

export interface CreateCommunicationTemplateVersionInput {
  communicationTemplateId: string;
  versionNumber: string;
  subjectTemplate: string;
  bodyTemplate: string;
  locale?: string;
}

export interface RenderTemplateInput {
  communicationTemplateVersionId: string;
  variables: Record<string, string>;
}

@Injectable()
export class CommunicationTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(input: CreateCommunicationTemplateInput): Promise<CommunicationTemplate> {
    return this.prisma.communicationTemplate.create({
      data: {
        code: input.code,
        name: input.name,
        channelType: input.channelType,
        institutionId: input.institutionId,
        status: CommunicationTemplateStatus.DRAFT,
      },
    });
  }

  async createVersion(
    input: CreateCommunicationTemplateVersionInput,
  ): Promise<CommunicationTemplateVersion> {
    this.assertTemplateContentSafe(input.subjectTemplate);
    this.assertTemplateContentSafe(input.bodyTemplate);

    const template = await this.prisma.communicationTemplate.findUnique({
      where: { id: input.communicationTemplateId },
    });

    if (!template) {
      throw new NotFoundException(
        `CommunicationTemplate ${input.communicationTemplateId} not found`,
      );
    }

    return this.prisma.communicationTemplateVersion.create({
      data: {
        communicationTemplateId: input.communicationTemplateId,
        versionNumber: input.versionNumber,
        subjectTemplate: input.subjectTemplate,
        bodyTemplate: input.bodyTemplate,
        locale: input.locale ?? 'en',
        status: CommunicationTemplateStatus.DRAFT,
      },
    });
  }

  async approveVersion(versionId: string): Promise<CommunicationTemplateVersion> {
    const version = await this.prisma.communicationTemplateVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`CommunicationTemplateVersion ${versionId} not found`);
    }

    this.assertTemplateContentSafe(version.subjectTemplate);
    this.assertTemplateContentSafe(version.bodyTemplate);

    const approvedAt = new Date();

    await this.prisma.communicationTemplate.update({
      where: { id: version.communicationTemplateId },
      data: { status: CommunicationTemplateStatus.APPROVED },
    });

    return this.prisma.communicationTemplateVersion.update({
      where: { id: versionId },
      data: {
        status: CommunicationTemplateStatus.APPROVED,
        approvedAt,
      },
    });
  }

  async activateVersion(versionId: string): Promise<CommunicationTemplateVersion> {
    const version = await this.prisma.communicationTemplateVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`CommunicationTemplateVersion ${versionId} not found`);
    }

    if (version.status !== CommunicationTemplateStatus.APPROVED) {
      throw new BadRequestException('Only approved template versions may be activated');
    }

    await this.prisma.communicationTemplateVersion.updateMany({
      where: {
        communicationTemplateId: version.communicationTemplateId,
        status: CommunicationTemplateStatus.ACTIVE,
      },
      data: { status: CommunicationTemplateStatus.SUPERSEDED },
    });

    await this.prisma.communicationTemplate.update({
      where: { id: version.communicationTemplateId },
      data: { status: CommunicationTemplateStatus.ACTIVE },
    });

    return this.prisma.communicationTemplateVersion.update({
      where: { id: versionId },
      data: {
        status: CommunicationTemplateStatus.ACTIVE,
        effectiveFrom: new Date(),
      },
    });
  }

  async renderTemplate(input: RenderTemplateInput): Promise<{ subject: string; body: string }> {
    const record = await this.prisma.communicationTemplateVersion.findUnique({
      where: { id: input.communicationTemplateVersionId },
    });

    if (!record) {
      throw new NotFoundException(
        `CommunicationTemplateVersion ${input.communicationTemplateVersionId} not found`,
      );
    }

    this.assertTemplateVariablesSafe(input.variables);

    return {
      subject: this.interpolate(record.subjectTemplate, input.variables),
      body: this.interpolate(record.bodyTemplate, input.variables),
    };
  }

  async getTemplate(templateId: string): Promise<CommunicationTemplate | null> {
    return this.prisma.communicationTemplate.findUnique({
      where: { id: templateId },
      include: { versions: { orderBy: { createdAt: 'desc' } } },
    });
  }

  assertTemplateContentSafe(content: string): void {
    for (const pattern of TEMPLATE_INJECTION_PATTERNS) {
      if (pattern.test(content)) {
        throw new BadRequestException('Template content rejected due to unsafe injection pattern');
      }
    }

    const openCount = (content.match(/\{\{/g) ?? []).length;
    const closeCount = (content.match(/\}\}/g) ?? []).length;
    if (openCount !== closeCount) {
      throw new BadRequestException('Template content rejected due to unbalanced placeholders');
    }
  }

  private assertTemplateVariablesSafe(variables: Record<string, string>): void {
    for (const [key, value] of Object.entries(variables)) {
      if (!ALLOWED_TEMPLATE_VARIABLE_PATTERN.test(key)) {
        throw new BadRequestException(`Template variable "${key}" is not permitted`);
      }
      this.assertTemplateContentSafe(value);
    }
  }

  private interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{([a-zA-Z][a-zA-Z0-9_.]*)\}\}/g, (match, key: string) => {
      if (!(key in variables)) {
        throw new BadRequestException(`Missing template variable "${key}"`);
      }
      return variables[key] ?? match;
    });
  }
}
