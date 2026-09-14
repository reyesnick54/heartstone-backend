import { Injectable, NotFoundException } from '@nestjs/common';
import { AIAgentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

export interface CreateAiAgentInput {
  institutionId: string;
  code: string;
  name: string;
  description?: string;
}

export interface CreateAiAgentVersionInput {
  aiAgentDefinitionId: string;
  agentConfig?: Record<string, unknown>;
  toolsAllowed?: string[];
  limitations?: string;
}

@Injectable()
export class AiAgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async findById(id: string) {
    const agent = await this.prisma.aIAgentDefinition.findUnique({
      where: { id },
      include: { versions: { include: { toolEntitlements: true } } },
    });
    if (!agent) {
      throw new NotFoundException(`AI agent ${id} not found`);
    }
    return agent;
  }

  async createAgent(input: CreateAiAgentInput) {
    return this.prisma.aIAgentDefinition.create({
      data: {
        institutionId: input.institutionId,
        code: input.code,
        name: input.name,
        description: input.description,
        status: AIAgentStatus.DRAFT,
      },
    });
  }

  async createVersion(input: CreateAiAgentVersionInput) {
    const agent = await this.findById(input.aiAgentDefinitionId);
    const nextVersion =
      (agent.versions.length > 0 ? Math.max(...agent.versions.map((v) => v.versionNumber)) : 0) + 1;
    return this.prisma.aIAgentVersion.create({
      data: {
        aiAgentDefinitionId: input.aiAgentDefinitionId,
        versionNumber: nextVersion,
        agentConfig: (input.agentConfig ?? {}) as Prisma.InputJsonValue,
        toolsAllowed: input.toolsAllowed ?? [],
        limitations: input.limitations,
        status: AIAgentStatus.DRAFT,
      },
    });
  }

  async assertAgentExecutable(agentVersionId: string): Promise<void> {
    const version = await this.prisma.aIAgentVersion.findUnique({
      where: { id: agentVersionId },
      include: { suspensionRecords: { where: { liftedAt: null } } },
    });
    if (!version) {
      throw new NotFoundException(`AI agent version ${agentVersionId} not found`);
    }
    this.boundary.assertSuspendedAgentBlocked(version.status);
    if (version.suspensionRecords.length > 0) {
      this.boundary.assertSuspendedAgentBlocked(AIAgentStatus.SUSPENDED);
    }
    this.boundary.assertAiToolEntitlementNotAuthority();
  }
}
