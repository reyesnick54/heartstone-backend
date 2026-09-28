import { createHash, randomUUID } from 'node:crypto';

import {
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AiCallStatus,
  AiCallUserDeliveryStatus,
  type AiGovernedDataClass,
  type AiHumanReviewOutcome,
  AiModelStatus,
  AiPolicyDecisionOutcome,
  Prisma,
} from '@prisma/client';

import { GOVERNMENT_AUDIT_EVENT_TYPES } from '../../../audit-governance/audit-governance.constants';
import { GovernmentAuditLedgerService } from '../../../audit-governance/ledger/government-audit-ledger.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  AI_GOVERNANCE_AUDIT_ACTIONS,
  AI_POLICY_REASON_CODES,
} from '../governed-ai.constants';
import { AI_MODEL_PORT, type AiModelPort } from '../ports/ai-model.port';
import { AiCallAuditService } from './ai-call-audit.service';
import { AiPolicyGateService } from './ai-policy-gate.service';
import { AiToolAuthorizationService } from './ai-tool-authorization.service';
import { AiUserOutputGateService } from './ai-user-output-gate.service';
import { GovernedAiProductionGateService } from './governed-ai-production-gate.service';

export interface ExecuteGovernedAiCallInput {
  agentDefinitionId: string;
  institutionId: string;
  initiatorIdentityId: string;
  purpose: string;
  instructions: string;
  dataClassification: AiGovernedDataClass;
  modelVersionId: string;
  requestedToolCode?: string;
  sourceReferences?: { sourceType: string; sourceId: string; sourceLabel?: string }[];
  correlationId?: string;
  policyServiceAvailable?: boolean;
  auditAvailable?: boolean;
}

export interface GovernedAiCallResult {
  callRecordId: string;
  correlationId: string;
  policyOutcome: AiPolicyDecisionOutcome;
  status: AiCallStatus;
  userDeliveryStatus: AiCallUserDeliveryStatus;
  output?: {
    rawOutput: string;
    outputHash: string;
    isBinding: false;
    confidence: number;
  };
  reasonCodes?: string[];
}

@Injectable()
export class AiCallRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyGate: AiPolicyGateService,
    private readonly audit: AiCallAuditService,
    private readonly toolAuth: AiToolAuthorizationService,
    private readonly outputGate: AiUserOutputGateService,
    private readonly productionGate: GovernedAiProductionGateService,
    private readonly ledger: GovernmentAuditLedgerService,
    @Inject(AI_MODEL_PORT) private readonly modelPort: AiModelPort,
  ) {}

  async execute(input: ExecuteGovernedAiCallInput): Promise<GovernedAiCallResult> {
    const correlationId = input.correlationId ?? randomUUID();
    const policyServiceAvailable = input.policyServiceAvailable ?? true;
    const auditAvailable = input.auditAvailable ?? true;

    const agent = await this.prisma.aiAgentDefinition.findUnique({
      where: { id: input.agentDefinitionId },
      include: {
        modelDefinition: { include: { provider: true } },
      },
    });

    if (!agent) {
      throw new ForbiddenException({
        code: AI_POLICY_REASON_CODES.AGENT_NOT_REGISTERED,
        message: 'AI agent is not registered.',
      });
    }

    const modelVersion = await this.prisma.aiModelVersion.findUnique({
      where: { id: input.modelVersionId },
    });

    if (modelVersion?.modelDefinitionId !== agent.modelDefinitionId) {
      throw new ForbiddenException({
        code: AI_POLICY_REASON_CODES.MODEL_NOT_APPROVED,
        message: 'Model version is not registered for this agent.',
      });
    }

    if (
      modelVersion.status !== AiModelStatus.ACTIVE &&
      modelVersion.status !== AiModelStatus.APPROVED
    ) {
      throw new ForbiddenException({
        code: AI_POLICY_REASON_CODES.MODEL_NOT_APPROVED,
        message: 'Model version is not approved for use.',
      });
    }

    if (input.requestedToolCode) {
      await this.toolAuth.assertToolAllowlisted(input.agentDefinitionId, input.requestedToolCode);
    }

    const policy = await this.policyGate.evaluate({
      agentDefinitionId: input.agentDefinitionId,
      institutionId: input.institutionId,
      initiatorIdentityId: input.initiatorIdentityId,
      purpose: input.purpose,
      dataClassification: input.dataClassification,
      requestedToolCode: input.requestedToolCode,
      policyServiceAvailable,
    });

    const policyDecision = await this.prisma.aiPolicyDecisionRecord.create({
      data: {
        outcome: policy.outcome,
        reasonCodes: policy.reasonCodes,
        evaluatedFactors: policy.evaluatedFactors as Prisma.InputJsonValue,
        policyReference: policy.policyReference,
      },
    });

    if (policy.outcome !== AiPolicyDecisionOutcome.ALLOW) {
      if (auditAvailable) {
        await this.audit.recordAiCallDenied({
          institutionId: input.institutionId,
          initiatorIdentityId: input.initiatorIdentityId,
          correlationId,
          reasonCodes: policy.reasonCodes,
        });
      }

      return {
        callRecordId: '',
        correlationId,
        policyOutcome: policy.outcome,
        status: AiCallStatus.POLICY_DENIED,
        userDeliveryStatus: AiCallUserDeliveryStatus.BLOCKED,
        reasonCodes: policy.reasonCodes,
      };
    }

    const callRecordId = await this.audit.createCallAuditShell({
      correlationId,
      institutionId: input.institutionId,
      aiAgentIdentityId: agent.aiAgentIdentityId,
      agentDefinitionId: agent.id,
      modelDefinitionId: agent.modelDefinitionId,
      modelVersionId: modelVersion.id,
      providerRegistryId: agent.modelDefinition.providerRegistryId,
      initiatorIdentityId: input.initiatorIdentityId,
      purpose: input.purpose,
      dataClassification: input.dataClassification,
      policy,
      policyDecisionId: policyDecision.id,
      instructions: input.instructions,
      sourceReferences: input.sourceReferences,
      auditAvailable,
    });

    const provider = agent.modelDefinition.provider;
    const wantsExternal =
      this.productionGate.getConfig().externalProviderEnabled &&
      provider.secretConfigurationKey !== null;

    if (wantsExternal && !this.productionGate.isExternalInvocationAllowed()) {
      await this.prisma.aiCallRecord.update({
        where: { id: callRecordId },
        data: {
          status: AiCallStatus.PROVIDER_FAILED,
          completedAt: new Date(),
        },
      });

      return {
        callRecordId,
        correlationId,
        policyOutcome: policy.outcome,
        status: AiCallStatus.PROVIDER_FAILED,
        userDeliveryStatus: AiCallUserDeliveryStatus.BLOCKED,
        reasonCodes: [AI_POLICY_REASON_CODES.EXTERNAL_PROVIDER_DISABLED],
      };
    }

    let modelResponse;
    try {
      modelResponse = await this.modelPort.complete({
        correlationId,
        providerCode: provider.providerCode,
        modelIdentifier: agent.modelDefinition.providerModelIdentifier,
        modelVersionLabel: modelVersion.versionLabel,
        instructions: input.instructions,
      });
    } catch {
      await this.prisma.aiCallRecord.update({
        where: { id: callRecordId },
        data: {
          status: AiCallStatus.PROVIDER_FAILED,
          completedAt: new Date(),
        },
      });

      return {
        callRecordId,
        correlationId,
        policyOutcome: policy.outcome,
        status: AiCallStatus.PROVIDER_FAILED,
        userDeliveryStatus: AiCallUserDeliveryStatus.BLOCKED,
      };
    }

    const outputHash = createHash('sha256').update(modelResponse.rawOutput).digest('hex');

    await this.prisma.aiCallOutputRecord.create({
      data: {
        callRecordId,
        rawOutput: modelResponse.rawOutput,
        outputHash,
        policyOutcome: policy.outcome,
        outputDisposition: 'RECOMMENDATORY_ONLY',
      },
    });

    const userDeliveryStatus =
      agent.humanOversightRequired
        ? AiCallUserDeliveryStatus.PENDING_REVIEW
        : AiCallUserDeliveryStatus.BLOCKED;

    await this.prisma.aiCallRecord.update({
      where: { id: callRecordId },
      data: {
        status: AiCallStatus.COMPLETED,
        completedAt: new Date(),
        userDeliveryStatus,
      },
    });

    await this.ledger.append({
      eventType: GOVERNMENT_AUDIT_EVENT_TYPES.AI_CALL,
      actorIdentityId: input.initiatorIdentityId,
      institutionId: input.institutionId,
      action: AI_GOVERNANCE_AUDIT_ACTIONS.AI_CALL_COMPLETED,
      outcome: 'COMPLETED',
      resourceType: 'AiCallRecord',
      resourceId: callRecordId,
      correlationId,
      metadata: {
        modelVersionId: modelVersion.id,
        outputHash,
      },
      sourceDomainEventType: 'AiCallRecord',
      sourceDomainEventId: `${callRecordId}:completed`,
    });

    return {
      callRecordId,
      correlationId,
      policyOutcome: policy.outcome,
      status: AiCallStatus.COMPLETED,
      userDeliveryStatus,
      output: {
        rawOutput: modelResponse.rawOutput,
        outputHash,
        isBinding: false,
        confidence: modelResponse.confidence,
      },
    };
  }

  async recordHumanEdit(input: {
    callRecordId: string;
    editorIdentityId: string;
    editedOutput: string;
    editReason?: string;
  }): Promise<void> {
    const output = await this.prisma.aiCallOutputRecord.findUnique({
      where: { callRecordId: input.callRecordId },
    });
    if (!output) {
      throw new ServiceUnavailableException('AI call output record not found.');
    }

    await this.prisma.aiCallOutputEdit.create({
      data: {
        outputRecordId: output.id,
        editorIdentityId: input.editorIdentityId,
        editedOutput: input.editedOutput,
        editReason: input.editReason,
      },
    });
  }

  async recordHumanReview(input: {
    callRecordId: string;
    reviewerIdentityId: string;
    reviewOutcome: AiHumanReviewOutcome;
    governmentRecordReference?: string;
  }): Promise<void> {
    await this.prisma.aiCallReviewRecord.create({
      data: {
        callRecordId: input.callRecordId,
        reviewerIdentityId: input.reviewerIdentityId,
        reviewOutcome: input.reviewOutcome,
        governmentRecordReference: input.governmentRecordReference,
      },
    });
  }

  async getUserFacingOutput(callRecordId: string): Promise<{ rawOutput: string; outputHash: string }> {
    await this.outputGate.assertDeliverableToUser(callRecordId);
    await this.outputGate.markDelivered(callRecordId);

    const output = await this.prisma.aiCallOutputRecord.findUniqueOrThrow({
      where: { callRecordId },
      include: { edits: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    const latestEdit = output.edits[0];
    return {
      rawOutput: latestEdit?.editedOutput ?? output.rawOutput ?? '',
      outputHash: output.outputHash,
    };
  }
}
