import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { type AiGovernedDataClass, GovernmentAuditActorType } from '@prisma/client';

import { GOVERNMENT_AUDIT_EVENT_TYPES } from '../../../audit-governance/audit-governance.constants';
import { GovernmentAuditLedgerService } from '../../../audit-governance/ledger/government-audit-ledger.service';
import { PrismaService } from '../../../database/prisma.service';
import { AI_GOVERNANCE_AUDIT_ACTIONS, AI_POLICY_REASON_CODES } from '../governed-ai.constants';
import { type AiPolicyGateResult } from './ai-policy-gate.service';

export interface CreateAiCallAuditInput {
  correlationId: string;
  institutionId: string;
  aiAgentIdentityId: string;
  agentDefinitionId: string;
  modelDefinitionId: string;
  modelVersionId: string;
  providerRegistryId: string;
  initiatorIdentityId: string;
  purpose: string;
  dataClassification: AiGovernedDataClass;
  policy: AiPolicyGateResult;
  policyDecisionId: string;
  instructions: string;
  sourceReferences?: { sourceType: string; sourceId: string; sourceLabel?: string }[];
  promptRetentionClass?: string;
  auditAvailable: boolean;
}

@Injectable()
export class AiCallAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: GovernmentAuditLedgerService,
  ) {}

  async createCallAuditShell(input: CreateAiCallAuditInput): Promise<string> {
    if (!input.auditAvailable) {
      throw new ServiceUnavailableException({
        code: AI_POLICY_REASON_CODES.AUDIT_RECORD_REQUIRED,
        message: 'Cannot record AI call — audit subsystem unavailable.',
      });
    }

    const call = await this.prisma.aiCallRecord.create({
      data: {
        correlationId: input.correlationId,
        institutionId: input.institutionId,
        aiAgentIdentityId: input.aiAgentIdentityId,
        agentDefinitionId: input.agentDefinitionId,
        modelDefinitionId: input.modelDefinitionId,
        modelVersionId: input.modelVersionId,
        providerRegistryId: input.providerRegistryId,
        initiatorIdentityId: input.initiatorIdentityId,
        purpose: input.purpose,
        dataClassification: input.dataClassification,
        policyDecisionId: input.policyDecisionId,
        policyOutcome: input.policy.outcome,
        policyReference: input.policy.policyReference,
        inputRecord: {
          create: {
            instructions: input.instructions,
            promptRetentionClass: input.promptRetentionClass,
            promptStored: true,
          },
        },
        sourceReferences: {
          create: (input.sourceReferences ?? []).map((ref) => ({
            sourceType: ref.sourceType,
            sourceId: ref.sourceId,
            sourceLabel: ref.sourceLabel,
          })),
        },
      },
    });

    const ledgerEntry = await this.ledger.append({
      eventType: GOVERNMENT_AUDIT_EVENT_TYPES.AI_CALL,
      occurredAt: new Date(),
      actorType: GovernmentAuditActorType.AI_AGENT,
      actorIdentityId: input.initiatorIdentityId,
      institutionId: input.institutionId,
      action: AI_GOVERNANCE_AUDIT_ACTIONS.AI_CALL_REQUESTED,
      outcome: input.policy.outcome,
      resourceType: 'AiCallRecord',
      resourceId: call.id,
      correlationId: input.correlationId,
      metadata: {
        agentDefinitionId: input.agentDefinitionId,
        modelDefinitionId: input.modelDefinitionId,
        modelVersionId: input.modelVersionId,
        policyDecisionId: input.policyDecisionId,
        dataClassification: input.dataClassification,
      },
      sourceDomainEventType: 'AiCallRecord',
      sourceDomainEventId: call.id,
    });

    await this.prisma.aiCallRecord.update({
      where: { id: call.id },
      data: { governmentAuditLedgerEntryId: ledgerEntry.id },
    });

    return call.id;
  }

  recordAiCallDenied(input: {
    institutionId: string;
    initiatorIdentityId: string;
    correlationId: string;
    reasonCodes: string[];
  }): Promise<void> {
    return this.ledger.append({
      eventType: GOVERNMENT_AUDIT_EVENT_TYPES.AI_CALL,
      actorIdentityId: input.initiatorIdentityId,
      institutionId: input.institutionId,
      action: AI_GOVERNANCE_AUDIT_ACTIONS.AI_CALL_DENIED,
      outcome: 'DENY',
      correlationId: input.correlationId,
      metadata: { reasonCodes: input.reasonCodes },
    }).then(() => undefined);
  }
}
