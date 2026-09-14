import { Injectable, NotFoundException } from '@nestjs/common';
import { AIModelStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

export interface RegisterAiModelInput {
  institutionId: string;
  code: string;
  name: string;
  description?: string;
  provider?: string;
}

export interface CreateAiModelVersionInput {
  aiModelDefinitionId: string;
  modelIdentifier: string;
  limitations?: string;
  uncertaintyNotes?: string;
  capabilitySummary?: string;
}

@Injectable()
export class AiModelRegistryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async findById(id: string) {
    const model = await this.prisma.aIModelDefinition.findUnique({
      where: { id },
      include: { versions: true },
    });
    if (!model) {
      throw new NotFoundException(`AI model ${id} not found`);
    }
    return model;
  }

  async registerModel(input: RegisterAiModelInput) {
    return this.prisma.aIModelDefinition.create({
      data: {
        institutionId: input.institutionId,
        code: input.code,
        name: input.name,
        description: input.description,
        provider: input.provider,
        status: AIModelStatus.DRAFT,
      },
    });
  }

  async createVersion(input: CreateAiModelVersionInput) {
    const model = await this.findById(input.aiModelDefinitionId);
    const nextVersion =
      (model.versions.length > 0 ? Math.max(...model.versions.map((v) => v.versionNumber)) : 0) + 1;
    return this.prisma.aIModelVersion.create({
      data: {
        aiModelDefinitionId: input.aiModelDefinitionId,
        versionNumber: nextVersion,
        modelIdentifier: input.modelIdentifier,
        limitations: input.limitations,
        uncertaintyNotes: input.uncertaintyNotes,
        capabilitySummary: input.capabilitySummary,
        status: AIModelStatus.DRAFT,
      },
    });
  }

  async assertModelExecutable(modelVersionId: string): Promise<void> {
    const version = await this.prisma.aIModelVersion.findUnique({
      where: { id: modelVersionId },
      include: { suspensionRecords: { where: { liftedAt: null } } },
    });
    if (!version) {
      throw new NotFoundException(`AI model version ${modelVersionId} not found`);
    }
    this.boundary.assertSuspendedModelBlocked(version.status);
    if (version.suspensionRecords.length > 0) {
      this.boundary.assertSuspendedModelBlocked(AIModelStatus.SUSPENDED);
    }
  }
}
