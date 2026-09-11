import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DeclarationDefinition,
  DeclarationDefinitionVersion,
  DeclarationVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SERVICE_CHECKLIST_EXPLANATION_CODES } from '../services.constants';

export interface CreateDeclarationDefinitionInput {
  code: string;
  name: string;
  description?: string;
}

export interface CreateDeclarationVersionInput {
  declarationDefinitionId: string;
  versionLabel: string;
  declarationText: string;
}

@Injectable()
export class DeclarationDefinitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDefinition(input: CreateDeclarationDefinitionInput): Promise<DeclarationDefinition> {
    return this.prisma.declarationDefinition.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
      },
    });
  }

  async createVersion(input: CreateDeclarationVersionInput): Promise<DeclarationDefinitionVersion> {
    const definition = await this.prisma.declarationDefinition.findUnique({
      where: { id: input.declarationDefinitionId },
    });

    if (!definition) {
      throw new NotFoundException(
        `Declaration definition "${input.declarationDefinitionId}" was not found`,
      );
    }

    return this.prisma.declarationDefinitionVersion.create({
      data: {
        declarationDefinitionId: input.declarationDefinitionId,
        versionLabel: input.versionLabel,
        declarationText: input.declarationText,
      },
    });
  }

  async publishVersion(versionId: string): Promise<DeclarationDefinitionVersion> {
    const version = await this.prisma.declarationDefinitionVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Declaration version "${versionId}" was not found`);
    }

    if (version.status === DeclarationVersionStatus.PUBLISHED) {
      return version;
    }

    return this.prisma.declarationDefinitionVersion.update({
      where: { id: versionId },
      data: {
        status: DeclarationVersionStatus.PUBLISHED,
        publishedAt: new Date(),
        isImmutable: true,
      },
    });
  }

  async updateDeclarationText(
    versionId: string,
    declarationText: string,
  ): Promise<DeclarationDefinitionVersion> {
    const version = await this.prisma.declarationDefinitionVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Declaration version "${versionId}" was not found`);
    }

    if (version.isImmutable) {
      throw new BadRequestException(
        `${SERVICE_CHECKLIST_EXPLANATION_CODES.PUBLISHED_VERSION_IMMUTABLE}: declaration text cannot be changed after publication`,
      );
    }

    return this.prisma.declarationDefinitionVersion.update({
      where: { id: versionId },
      data: { declarationText },
    });
  }
}
