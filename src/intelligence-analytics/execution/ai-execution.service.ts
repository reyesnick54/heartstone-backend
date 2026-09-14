import { Injectable } from '@nestjs/common';
import {
  AIExecutionStatus,
  AIHumanDispositionType,
  AISuspensionStatus,
  IdentityType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AiGovernanceBoundaryService } from '../common/ai-governance-boundary.service';
import { AiGovernanceValidationService } from '../common/ai-governance-validation.service';
import { RecordAiExecutionDto } from '../dto/record-ai-execution.dto';
import { RecordAiHumanDispositionDto } from '../dto/record-ai-human-disposition.dto';

export interface AiExecutionGateContext {
  actorType: IdentityType;
  actorAgentDefinitionId?: string | null;
  modelSuspended: boolean;
  useCaseSuspended: boolean;
  useCaseExpired: boolean;
  agentSuspended: boolean;
  entitledDatasets: string[];
  prohibitedDatasets: string[];
  entitledTools: string[];
  permittedToolActions: string[];
  permittedCaseReference: string;
  evidenceGateRequired: boolean;
  evidenceReferences: string[];
}

@Injectable()
export class AiExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: AiGovernanceBoundaryService,
    private readonly validation: AiGovernanceValidationService,
  ) {}

  assertExecutionGates(context: AiExecutionGateContext, dto: RecordAiExecutionDto): void {
    this.boundary.rejectForbiddenExecutionFields(dto as unknown as Record<string, unknown>);
    this.boundary.assertExecutionRequiresRecordedModelVersion(dto.aiModelVersionId);
    this.boundary.assertSuspendedModelBlocked(context.modelSuspended);
    this.boundary.assertSuspendedUseCaseBlocked(context.useCaseSuspended);
    this.boundary.assertExpiredUseCaseBlocked(context.useCaseExpired);
    this.boundary.assertSuspendedAgentBlocked(context.agentSuspended);
    this.boundary.assertAiCannotApproveOrRefuse(context.actorType);

    for (const untrusted of dto.untrustedDocumentContents ?? []) {
      this.boundary.assertDocumentInstructionsTreatedAsContent(
        untrusted,
        dto.policyReference ?? '',
      );
      this.boundary.assertNoEntitlementThroughPrompt(untrusted);
    }

    for (const dataset of dto.retrievedRecordReferences ?? []) {
      this.boundary.assertDatasetEntitlementPermitted(
        dataset,
        context.entitledDatasets,
        context.prohibitedDatasets,
      );
    }

    if (dto.requestedCaseReference && dto.permittedCaseReference) {
      this.boundary.assertCrossCaseRetrievalBlocked(
        dto.requestedCaseReference,
        context.permittedCaseReference,
      );
    }

    for (const toolCall of dto.toolsCalled ?? []) {
      this.boundary.assertToolEntitlementPermitted(
        toolCall.toolReference,
        context.entitledTools,
        context.permittedToolActions,
        toolCall.action,
      );
    }

    this.boundary.assertHighConfidenceCannotBypassEvidenceGate(
      dto.confidenceScore,
      context.evidenceGateRequired,
      context.evidenceReferences,
    );

    this.boundary.assertAiCannotFabricateAuthoritySource(dto.outputSummary);
    this.boundary.sanitizeExecutionLogContent(dto.outputSummary);

    if (dto.promptContent) {
      this.boundary.sanitizeExecutionLogContent(dto.promptContent);
    }
  }

  async recordExecution(dto: RecordAiExecutionDto, context: AiExecutionGateContext) {
    this.assertExecutionGates(context, dto);
    await this.validation.ensureIdentityExists(dto.actorIdentityId);

    return this.prisma.aIExecutionRecord.create({
      data: {
        aiUseCaseVersionId: dto.aiUseCaseVersionId,
        aiModelVersionId: dto.aiModelVersionId,
        aiAgentVersionId: dto.aiAgentVersionId,
        aiOutputContractId: dto.aiOutputContractId,
        aiPromptPolicyId: dto.aiPromptPolicyId,
        actorIdentityId: dto.actorIdentityId,
        humanReviewerIdentityId: dto.humanReviewerIdentityId,
        purpose: dto.purpose,
        promptPolicyVersion: dto.promptPolicyVersion,
        inputSourceReferences: dto.inputSourceReferences ?? [],
        toolsCalled: (dto.toolsCalled ?? []) as unknown as Prisma.InputJsonValue,
        retrievedRecordReferences: dto.retrievedRecordReferences ?? [],
        outputSummary: dto.outputSummary,
        outputReference: dto.outputReference,
        confidenceScore: dto.confidenceScore,
        limitations: dto.limitations ?? [],
        humanChangesSummary: dto.humanChangesSummary,
        decisionAffectedReference: dto.decisionAffectedReference,
        status: AIExecutionStatus.EXECUTED,
      },
    });
  }

  async recordBlockedExecution(dto: RecordAiExecutionDto, reason: string) {
    await this.validation.ensureIdentityExists(dto.actorIdentityId);

    return this.prisma.aIExecutionRecord.create({
      data: {
        aiUseCaseVersionId: dto.aiUseCaseVersionId,
        aiModelVersionId: dto.aiModelVersionId,
        aiAgentVersionId: dto.aiAgentVersionId,
        actorIdentityId: dto.actorIdentityId,
        purpose: dto.purpose,
        inputSourceReferences: dto.inputSourceReferences ?? [],
        toolsCalled: [],
        retrievedRecordReferences: [],
        outputSummary: reason,
        limitations: ['EXECUTION_BLOCKED'],
        status: AIExecutionStatus.BLOCKED,
      },
    });
  }
}

@Injectable()
export class AiHumanDispositionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: AiGovernanceBoundaryService,
    private readonly validation: AiGovernanceValidationService,
  ) {}

  async recordDisposition(dto: RecordAiHumanDispositionDto) {
    await this.validation.ensureExecutionRecordExists(dto.aiExecutionRecordId);
    await this.validation.ensureIdentityExists(dto.recorderIdentityId);

    if (dto.notes) {
      this.boundary.assertAcceptanceNotGovernmentDecision(dto.notes);
    }

    this.boundary.assertHumanDispositionRequiredForAssistiveAcceptance(
      true,
      dto.disposition === AIHumanDispositionType.ACCEPTED_FOR_ASSISTIVE_USE,
    );

    return this.prisma.aIHumanDisposition.create({
      data: {
        aiExecutionRecordId: dto.aiExecutionRecordId,
        recorderIdentityId: dto.recorderIdentityId,
        disposition: dto.disposition,
        notes: dto.notes,
        revisedOutputReference: dto.revisedOutputReference,
      },
    });
  }
}

@Injectable()
export class AiSuspensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: AiGovernanceValidationService,
  ) {}

  async suspendModelDefinition(input: {
    aiModelDefinitionId: string;
    issuedByIdentityId: string;
    reason: string;
  }) {
    await this.validation.ensureModelDefinitionExists(input.aiModelDefinitionId);
    await this.validation.ensureIdentityExists(input.issuedByIdentityId);

    return this.prisma.$transaction([
      this.prisma.aISuspensionRecord.create({
        data: {
          scope: 'MODEL_DEFINITION',
          reason: input.reason,
          aiModelDefinitionId: input.aiModelDefinitionId,
          issuedByIdentityId: input.issuedByIdentityId,
          status: AISuspensionStatus.ACTIVE,
        },
      }),
      this.prisma.aIModelDefinition.update({
        where: { id: input.aiModelDefinitionId },
        data: { status: 'SUSPENDED' },
      }),
    ]);
  }

  async hasActiveModelSuspension(aiModelDefinitionId: string): Promise<boolean> {
    const active = await this.prisma.aISuspensionRecord.findFirst({
      where: {
        aiModelDefinitionId,
        status: AISuspensionStatus.ACTIVE,
      },
      select: { id: true },
    });
    return Boolean(active);
  }
}
