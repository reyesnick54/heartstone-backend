import { Injectable, NotFoundException } from '@nestjs/common';
import { AIUseCaseStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

export interface CreateAiUseCaseInput {
  institutionId: string;
  aiModelDefinitionId?: string;
  code: string;
  name: string;
  description?: string;
}

export interface CreateAiUseCaseVersionInput {
  aiUseCaseId: string;
  purpose: string;
  scope?: string;
  limitations?: string;
  humanOversightRequired?: boolean;
}

@Injectable()
export class AiUseCaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async findById(id: string) {
    const useCase = await this.prisma.aIUseCase.findUnique({
      where: { id },
      include: { versions: true },
    });
    if (!useCase) {
      throw new NotFoundException(`AI use case ${id} not found`);
    }
    return useCase;
  }

  async createUseCase(input: CreateAiUseCaseInput) {
    return this.prisma.aIUseCase.create({
      data: {
        institutionId: input.institutionId,
        aiModelDefinitionId: input.aiModelDefinitionId,
        code: input.code,
        name: input.name,
        description: input.description,
        status: AIUseCaseStatus.DRAFT,
      },
    });
  }

  async createVersion(input: CreateAiUseCaseVersionInput) {
    const useCase = await this.findById(input.aiUseCaseId);
    const nextVersion =
      (useCase.versions.length > 0 ? Math.max(...useCase.versions.map((v) => v.versionNumber)) : 0) + 1;
    return this.prisma.aIUseCaseVersion.create({
      data: {
        aiUseCaseId: input.aiUseCaseId,
        versionNumber: nextVersion,
        purpose: input.purpose,
        scope: input.scope,
        limitations: input.limitations,
        humanOversightRequired: input.humanOversightRequired ?? true,
        status: AIUseCaseStatus.DRAFT,
      },
    });
  }

  async assertUseCaseExecutable(useCaseVersionId: string): Promise<void> {
    const version = await this.prisma.aIUseCaseVersion.findUnique({
      where: { id: useCaseVersionId },
      include: { suspensionRecords: { where: { liftedAt: null } } },
    });
    if (!version) {
      throw new NotFoundException(`AI use case version ${useCaseVersionId} not found`);
    }
    this.boundary.assertSuspendedUseCaseBlocked(version.status);
    if (version.suspensionRecords.length > 0) {
      this.boundary.assertSuspendedUseCaseBlocked(AIUseCaseStatus.SUSPENDED);
    }
  }
}
