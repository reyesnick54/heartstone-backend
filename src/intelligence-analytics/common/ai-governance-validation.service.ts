import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AiGovernanceValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureInstitutionExists(institutionId: string): Promise<void> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });
    if (!institution) {
      throw new NotFoundException(`Institution not found: ${institutionId}`);
    }
  }

  async ensureIdentityExists(identityId: string): Promise<void> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: { id: true },
    });
    if (!identity) {
      throw new NotFoundException(`Identity not found: ${identityId}`);
    }
  }

  async ensureModelDefinitionExists(aiModelDefinitionId: string): Promise<void> {
    const record = await this.prisma.aIModelDefinition.findUnique({
      where: { id: aiModelDefinitionId },
      select: { id: true },
    });
    if (!record) {
      throw new NotFoundException(`AI model definition not found: ${aiModelDefinitionId}`);
    }
  }

  async ensureUseCaseExists(aiUseCaseId: string): Promise<void> {
    const record = await this.prisma.aIUseCase.findUnique({
      where: { id: aiUseCaseId },
      select: { id: true },
    });
    if (!record) {
      throw new NotFoundException(`AI use case not found: ${aiUseCaseId}`);
    }
  }

  async ensureExecutionRecordExists(aiExecutionRecordId: string): Promise<void> {
    const record = await this.prisma.aIExecutionRecord.findUnique({
      where: { id: aiExecutionRecordId },
      select: { id: true },
    });
    if (!record) {
      throw new NotFoundException(`AI execution record not found: ${aiExecutionRecordId}`);
    }
  }
}
