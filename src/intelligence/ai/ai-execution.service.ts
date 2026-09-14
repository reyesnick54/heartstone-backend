import { Injectable, NotFoundException } from '@nestjs/common';
import { AIExecutionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { AI_EXECUTION_REFERENCE_PREFIX } from '../intelligence.constants';
import { AiAgentService } from './ai-agent.service';
import { AiModelRegistryService } from './ai-model-registry.service';
import { AiUseCaseService } from './ai-use-case.service';
import { DeterministicAiAdapter } from './deterministic-ai.adapter';

export interface ExecuteAiInput {
  institutionId: string;
  aiUseCaseVersionId?: string;
  aiAgentVersionId?: string;
  aiModelVersionId?: string;
  caseId?: string;
  inputsSnapshot?: Record<string, unknown>;
  consequential?: boolean;
}

@Injectable()
export class AiExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
    private readonly modelRegistry: AiModelRegistryService,
    private readonly useCaseService: AiUseCaseService,
    private readonly agentService: AiAgentService,
    private readonly adapter: DeterministicAiAdapter,
  ) {}

  private generateReference(): string {
    return `${AI_EXECUTION_REFERENCE_PREFIX}-${String(Date.now())}`;
  }

  async execute(input: ExecuteAiInput) {
    this.boundary.rejectClientAiExecutionFields(input as unknown as Record<string, unknown>);
    this.boundary.assertAiAssistanceNotOfficialActor('AI_ASSISTANCE');

    if (input.aiModelVersionId) {
      await this.modelRegistry.assertModelExecutable(input.aiModelVersionId);
    }
    if (input.aiUseCaseVersionId) {
      await this.useCaseService.assertUseCaseExecutable(input.aiUseCaseVersionId);
    }
    if (input.aiAgentVersionId) {
      await this.agentService.assertAgentExecutable(input.aiAgentVersionId);
    }

    this.boundary.assertCrossCaseRetrievalBlocked(input.caseId, input.caseId);

    const execution = await this.prisma.aIExecutionRecord.create({
      data: {
        institutionId: input.institutionId,
        executionReference: this.generateReference(),
        aiUseCaseVersionId: input.aiUseCaseVersionId,
        aiAgentVersionId: input.aiAgentVersionId,
        aiModelVersionId: input.aiModelVersionId,
        caseId: input.caseId,
        status: AIExecutionStatus.RUNNING,
        startedAt: new Date(),
        inputsSnapshot: (input.inputsSnapshot ?? {}) as Prisma.InputJsonValue,
        isRecommendatoryOnly: true,
      },
    });

    const output = this.adapter.execute({
      inputs: input.inputsSnapshot ?? {},
      executionReference: execution.executionReference,
    });

    this.boundary.assertAiRecommendationNotDecision();
    this.boundary.assertHumanDispositionRequiredForConsequentialAi(
      input.consequential ?? false,
      false,
    );

    return this.prisma.aIExecutionRecord.update({
      where: { id: execution.id },
      data: {
        status: AIExecutionStatus.COMPLETED,
        completedAt: new Date(),
        outputsSnapshot: output as Prisma.InputJsonValue,
      },
    });
  }

  async findByReference(executionReference: string) {
    const record = await this.prisma.aIExecutionRecord.findUnique({
      where: { executionReference },
      include: { humanDispositions: true },
    });
    if (!record) {
      throw new NotFoundException(`AI execution ${executionReference} not found`);
    }
    return record;
  }

  rejectForbiddenAction(action: string): void {
    this.boundary.rejectAiAction(action);
  }
}
