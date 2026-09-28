import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  AiAgentDefinitionStatus,
  AiAgentIdentityStatus,
  AiGovernedDataClass,
  AiModelProviderStatus,
  AiModelStatus,
  AiPolicyDecisionOutcome,
  AiSuspensionSubjectType,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { AI_POLICY_REASON_CODES } from '../governed-ai.constants';
import { AiDataBoundaryService } from './ai-data-boundary.service';
import { AiGovernanceSuspensionService } from './ai-governance-suspension.service';

export interface AiPolicyEvaluationFactorResult {
  allowed: boolean;
  reasonCodes: string[];
  detail?: string;
}

export interface AiPolicyGateInput {
  agentDefinitionId: string;
  institutionId: string;
  initiatorIdentityId: string;
  purpose: string;
  dataClassification: AiGovernedDataClass;
  requestedToolCode?: string;
  policyServiceAvailable: boolean;
}

export interface AiPolicyGateResult {
  outcome: AiPolicyDecisionOutcome;
  reasonCodes: string[];
  evaluatedFactors: Record<string, unknown>;
  policyReference?: string;
}

@Injectable()
export class AiPolicyGateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suspension: AiGovernanceSuspensionService,
    private readonly dataBoundary: AiDataBoundaryService,
  ) {}

  async evaluate(input: AiPolicyGateInput): Promise<AiPolicyGateResult> {
    if (!input.policyServiceAvailable) {
      throw new ServiceUnavailableException({
        code: AI_POLICY_REASON_CODES.POLICY_SERVICE_UNAVAILABLE,
        message: 'AI policy gate unavailable — failing closed.',
      });
    }

    const reasonCodes: string[] = [];
    const evaluatedFactors: Record<string, unknown> = {
      agentDefinitionId: input.agentDefinitionId,
      institutionId: input.institutionId,
      purpose: input.purpose,
      dataClassification: input.dataClassification,
    };

    const agent = await this.prisma.aiAgentDefinition.findUnique({
      where: { id: input.agentDefinitionId },
      include: {
        aiAgentIdentity: true,
        modelDefinition: { include: { provider: true } },
        toolAllowlist: true,
        dataClassAllowlist: true,
      },
    });

    if (!agent) {
      return this.deny([AI_POLICY_REASON_CODES.AGENT_NOT_REGISTERED], evaluatedFactors);
    }

    evaluatedFactors.agentStatus = agent.status;
    evaluatedFactors.agentIdentityStatus = agent.aiAgentIdentity.status;

    if (agent.ownerInstitutionId !== input.institutionId) {
      return this.deny([AI_POLICY_REASON_CODES.AGENT_NOT_REGISTERED], evaluatedFactors);
    }

    if (
      agent.status !== AiAgentDefinitionStatus.ACTIVE &&
      agent.status !== AiAgentDefinitionStatus.APPROVED
    ) {
      reasonCodes.push(AI_POLICY_REASON_CODES.AGENT_INACTIVE);
    }

    if (
      agent.aiAgentIdentity.status !== AiAgentIdentityStatus.ACTIVE &&
      agent.aiAgentIdentity.status !== AiAgentIdentityStatus.APPROVED
    ) {
      reasonCodes.push(AI_POLICY_REASON_CODES.AGENT_IDENTITY_INACTIVE);
    }

    const model = agent.modelDefinition;
    evaluatedFactors.modelStatus = model.status;
    if (model.status !== AiModelStatus.ACTIVE && model.status !== AiModelStatus.APPROVED) {
      reasonCodes.push(AI_POLICY_REASON_CODES.MODEL_NOT_APPROVED);
    }

    const provider = model.provider;
    evaluatedFactors.providerStatus = provider.status;
    if (
      provider.status !== AiModelProviderStatus.ACTIVE &&
      provider.status !== AiModelProviderStatus.APPROVED
    ) {
      reasonCodes.push(AI_POLICY_REASON_CODES.PROVIDER_NOT_APPROVED);
    }

    if (await this.suspension.isSubjectSuspended(AiSuspensionSubjectType.AGENT, agent.id)) {
      reasonCodes.push(AI_POLICY_REASON_CODES.AGENT_INACTIVE);
    }
    if (
      await this.suspension.isSubjectSuspended(
        AiSuspensionSubjectType.AGENT_IDENTITY,
        agent.aiAgentIdentityId,
      )
    ) {
      reasonCodes.push(AI_POLICY_REASON_CODES.AGENT_IDENTITY_INACTIVE);
    }
    if (await this.suspension.isSubjectSuspended(AiSuspensionSubjectType.MODEL, model.id)) {
      reasonCodes.push(AI_POLICY_REASON_CODES.MODEL_SUSPENDED);
    }
    if (
      await this.suspension.isSubjectSuspended(AiSuspensionSubjectType.MODEL_PROVIDER, provider.id)
    ) {
      reasonCodes.push(AI_POLICY_REASON_CODES.PROVIDER_SUSPENDED);
    }

    const dataEval = await this.dataBoundary.evaluateDataClass(
      agent.id,
      input.dataClassification,
      model.dataPolicyReference,
    );
    if (!dataEval.allowed) {
      reasonCodes.push(...dataEval.reasonCodes);
    }

    if (input.requestedToolCode) {
      const toolAllowed = agent.toolAllowlist.some((t) => t.toolCode === input.requestedToolCode);
      if (!toolAllowed) {
        reasonCodes.push(AI_POLICY_REASON_CODES.TOOL_NOT_ALLOWLISTED);
      }
    }

    if (reasonCodes.length > 0) {
      return this.deny(reasonCodes, evaluatedFactors, model.dataPolicyReference);
    }

    return {
      outcome: AiPolicyDecisionOutcome.ALLOW,
      reasonCodes: [],
      evaluatedFactors,
      policyReference: model.dataPolicyReference ?? agent.modelPolicyReference ?? undefined,
    };
  }

  private deny(
    reasonCodes: string[],
    evaluatedFactors: Record<string, unknown>,
    policyReference?: string | null,
  ): AiPolicyGateResult {
    return {
      outcome: reasonCodes.includes(AI_POLICY_REASON_CODES.POLICY_INDETERMINATE)
        ? AiPolicyDecisionOutcome.INDETERMINATE
        : AiPolicyDecisionOutcome.DENY,
      reasonCodes,
      evaluatedFactors,
      policyReference: policyReference ?? undefined,
    };
  }
}
