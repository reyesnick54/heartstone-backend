import { ConflictException, Injectable } from '@nestjs/common';
import { AIModelDefinitionStatus, AIModelVersionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AiGovernanceBoundaryService } from '../common/ai-governance-boundary.service';
import { AiGovernanceValidationService } from '../common/ai-governance-validation.service';
import { CreateAiModelDefinitionDto } from '../dto/create-ai-model-definition.dto';
import { CreateAiModelVersionDto } from '../dto/create-ai-model-version.dto';

@Injectable()
export class AiModelDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: AiGovernanceBoundaryService,
    private readonly validation: AiGovernanceValidationService,
  ) {}

  async createDefinition(dto: CreateAiModelDefinitionDto) {
    this.boundary.rejectForbiddenModelDefinitionFields(dto as unknown as Record<string, unknown>);
    await this.validation.ensureInstitutionExists(dto.institutionId);
    await this.validation.ensureIdentityExists(dto.technicalOwnerId);

    try {
      return await this.prisma.aIModelDefinition.create({
        data: {
          institutionId: dto.institutionId,
          technicalOwnerId: dto.technicalOwnerId,
          code: dto.code,
          provider: dto.provider,
          modelFamily: dto.modelFamily,
          deploymentType: dto.deploymentType,
          description: dto.description,
          status: AIModelDefinitionStatus.DRAFT,
        },
      });
    } catch (error) {
      this.handleUniqueViolation(error, 'AI model definition code already exists for institution');
      throw error;
    }
  }

  async createVersion(aiModelDefinitionId: string, dto: CreateAiModelVersionDto) {
    await this.validation.ensureModelDefinitionExists(aiModelDefinitionId);

    return this.prisma.aIModelVersion.create({
      data: {
        aiModelDefinitionId,
        modelIdentifier: dto.modelIdentifier,
        providerVersion: dto.providerVersion,
        weightsReference: dto.weightsReference,
        deploymentHash: dto.deploymentHash,
        deploymentConfig: (dto.deploymentConfig ?? {}) as Prisma.InputJsonValue,
        contextTokenLimit: dto.contextTokenLimit,
        capabilities: dto.capabilities ?? [],
        knownLimitations: dto.knownLimitations ?? [],
        approvedEnvironment: dto.approvedEnvironment,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
        status: AIModelVersionStatus.DRAFT,
      },
    });
  }

  async findAllDefinitions(institutionId?: string) {
    return this.prisma.aIModelDefinition.findMany({
      where: institutionId ? { institutionId } : undefined,
      include: { versions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private handleUniqueViolation(error: unknown, message: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(message);
    }
  }
}
