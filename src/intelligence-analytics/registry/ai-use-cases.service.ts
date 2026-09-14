import { ConflictException, Injectable } from '@nestjs/common';
import { AIUseCaseStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AiGovernanceBoundaryService } from '../common/ai-governance-boundary.service';
import { AiGovernanceValidationService } from '../common/ai-governance-validation.service';
import { CreateAiUseCaseDto } from '../dto/create-ai-use-case.dto';
import { CreateAiUseCaseVersionDto } from '../dto/create-ai-use-case-version.dto';

@Injectable()
export class AiUseCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: AiGovernanceBoundaryService,
    private readonly validation: AiGovernanceValidationService,
  ) {}

  async createUseCase(dto: CreateAiUseCaseDto) {
    this.boundary.rejectForbiddenUseCaseFields(dto as unknown as Record<string, unknown>);
    this.boundary.assertAutonomousFinalDecisionForbidden(
      dto.allowsAutonomousFinalDecision ?? false,
    );
    this.boundary.assertUseCaseRiskClassPermitted(dto.riskClass);

    await this.validation.ensureInstitutionExists(dto.institutionId);
    await this.validation.ensureIdentityExists(dto.humanReviewerIdentityId);

    try {
      return await this.prisma.aIUseCase.create({
        data: {
          institutionId: dto.institutionId,
          code: dto.code,
          purpose: dto.purpose,
          humanReviewerIdentityId: dto.humanReviewerIdentityId,
          riskClass: dto.riskClass,
          retentionPolicy: dto.retentionPolicy,
          escalationPolicy: dto.escalationPolicy,
          revalidationPolicy: dto.revalidationPolicy,
          allowsAutonomousFinalDecision: false,
          status: AIUseCaseStatus.DRAFT,
        },
      });
    } catch (error) {
      this.handleUniqueViolation(error, 'AI use case code already exists for institution');
      throw error;
    }
  }

  async createVersion(aiUseCaseId: string, dto: CreateAiUseCaseVersionDto) {
    await this.validation.ensureUseCaseExists(aiUseCaseId);

    return this.prisma.aIUseCaseVersion.create({
      data: {
        aiUseCaseId,
        versionNumber: dto.versionNumber,
        approvedUserReferences: dto.approvedUserReferences ?? [],
        approvedModelIds: dto.approvedModelIds ?? [],
        approvedDataReferences: dto.approvedDataReferences ?? [],
        approvedToolReferences: dto.approvedToolReferences ?? [],
        prohibitedUses: dto.prohibitedUses ?? [],
        aiOutputContractId: dto.aiOutputContractId,
        aiCapabilityDefinitionId: dto.aiCapabilityDefinitionId,
        approvedModelDefinitionId: dto.approvedModelDefinitionId,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
        status: AIUseCaseStatus.DRAFT,
      },
    });
  }

  private handleUniqueViolation(error: unknown, message: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(message);
    }
  }
}
