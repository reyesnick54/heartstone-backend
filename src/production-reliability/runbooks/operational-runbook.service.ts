import { Injectable } from '@nestjs/common';
import { OperationalRunbookStatus, SupportEscalationRuleStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CorrelationIdService } from '../common/correlation-id.service';
import { RUNBOOK_SCENARIOS } from '../production-reliability-schema.constants';

export interface CreateRunbookInput {
  reliabilityDefinitionId: string;
  code: string;
  name: string;
  scenarioType: string;
  procedureMarkdown: string;
  escalationNotes?: string;
}

export interface CreateEscalationRuleInput {
  reliabilityDefinitionId: string;
  code: string;
  name: string;
  triggerCondition: string;
  escalationTarget: string;
  mandatoryProcessFallback?: string;
  runbookId?: string;
}

const DEFAULT_RUNBOOKS: Record<string, { name: string; procedure: string }> = {
  API_DEGRADATION: {
    name: 'API Degradation Response',
    procedure:
      '1. Confirm technical health state is DEGRADED.\n2. Identify affected endpoints.\n3. Enable rate limiting protections.\n4. Escalate if mandatory processes lack fallback.',
  },
  DATABASE_DEGRADATION: {
    name: 'Database Degradation Response',
    procedure:
      '1. Check database dependency health.\n2. Assess connection pool saturation.\n3. Enable safe-fail for non-critical writes.\n4. Do not waive mandatory requirements.',
  },
  QUEUE_BACKLOG: {
    name: 'Queue Backlog Response',
    procedure:
      '1. Measure queue depth SLI.\n2. Scale workers if safe.\n3. Verify idempotency on retries.\n4. Escalate if consequential actions at risk.',
  },
  INTEGRATION_OUTAGE: {
    name: 'Integration Outage Response',
    procedure:
      '1. Record dependency outage event.\n2. Surface stale integration state.\n3. Isolate unrelated capabilities.\n4. Activate configured fallback if available.',
  },
  NOTIFICATION_OUTAGE: {
    name: 'Notification Outage Response',
    procedure:
      '1. Confirm notification provider health.\n2. Queue mandatory communications.\n3. Provide alternate delivery channel.\n4. Do not treat outage as approval bypass.',
  },
  PAYMENT_OUTAGE: {
    name: 'Payment Outage Response',
    procedure:
      '1. Confirm payment provider health.\n2. Halt new payment captures.\n3. Preserve idempotency keys.\n4. Payment success does not equal approval.',
  },
  STORAGE_EXHAUSTION: {
    name: 'Storage Exhaustion Response',
    procedure:
      '1. Record saturation at EXHAUSTED level.\n2. Apply safe-fail for uploads.\n3. Escalate capacity assessment.\n4. Do not delete evidence without authority.',
  },
  AI_PROVIDER_OUTAGE: {
    name: 'AI Provider Outage Response',
    procedure:
      '1. Confirm AI provider dependency health.\n2. Disable non-essential AI operations.\n3. Route consequential requests to human review.\n4. AI assistance does not equal official decision.',
  },
  CREDENTIAL_FAILURE: {
    name: 'Credential Failure Response',
    procedure:
      '1. Rotate affected credentials.\n2. Redact secrets from logs.\n3. Audit access events.\n4. Do not expose credential material in traces.',
  },
  CERTIFICATE_EXPIRY: {
    name: 'Certificate Expiry Response',
    procedure:
      '1. Identify expiring certificates.\n2. Renew before expiry window.\n3. Verify TLS health checks.\n4. Document renewal in operational health event.',
  },
  HIGH_ERROR_RATE: {
    name: 'High Error Rate Response',
    procedure:
      '1. Measure error rate SLI.\n2. Correlate via correlation IDs.\n3. Fire operational alert (not incident).\n4. Performance degradation does not produce approval/refusal.',
  },
};

@Injectable()
export class OperationalRunbookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly correlationIdService: CorrelationIdService,
  ) {}

  async createRunbook(input: CreateRunbookInput) {
    const correlationId = this.correlationIdService.getCorrelationId();
    return this.prisma.operationalRunbook.create({
      data: {
        reliabilityDefinitionId: input.reliabilityDefinitionId,
        code: input.code,
        name: input.name,
        scenarioType: input.scenarioType,
        procedureMarkdown: input.procedureMarkdown,
        escalationNotes: input.escalationNotes,
        status: OperationalRunbookStatus.DRAFT,
        correlationId,
      },
    });
  }

  async seedDefaultRunbooks(reliabilityDefinitionId: string) {
    const results = [];
    for (const scenario of RUNBOOK_SCENARIOS) {
      const template = DEFAULT_RUNBOOKS[scenario];
      if (!template) {
        continue;
      }
      const runbook = await this.createRunbook({
        reliabilityDefinitionId,
        code: scenario,
        name: template.name,
        scenarioType: scenario,
        procedureMarkdown: template.procedure,
      });
      results.push(runbook);
    }
    return results;
  }

  async activateRunbook(runbookId: string) {
    return this.prisma.operationalRunbook.update({
      where: { id: runbookId },
      data: { status: OperationalRunbookStatus.ACTIVE },
    });
  }

  async createEscalationRule(input: CreateEscalationRuleInput) {
    const correlationId = this.correlationIdService.getCorrelationId();
    return this.prisma.supportEscalationRule.create({
      data: {
        reliabilityDefinitionId: input.reliabilityDefinitionId,
        code: input.code,
        name: input.name,
        triggerCondition: input.triggerCondition,
        escalationTarget: input.escalationTarget,
        mandatoryProcessFallback: input.mandatoryProcessFallback,
        runbookId: input.runbookId,
        status: SupportEscalationRuleStatus.DRAFT,
        correlationId,
      },
    });
  }
}
