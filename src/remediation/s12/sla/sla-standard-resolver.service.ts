import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import {
  PROTOCOL_SLA_RULE_CODES,
  PROTOCOL_TIME_STANDARD_MS,
} from '../protocol/protocol-time-standards.constants';

export interface ResolvedSlaStandard {
  ruleCode: string;
  label: string;
  targetDurationMs: number;
  escalationLadderCode: string | null;
  pauseOnRfi: boolean;
  governmentServiceVersionId: string;
  configuration: Record<string, unknown>;
}

@Injectable()
export class SlaStandardResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePrimaryProcessingStandard(
    governmentServiceVersionId: string,
  ): Promise<ResolvedSlaStandard | null> {
    const configured = await this.prisma.governmentServiceSlaRule.findFirst({
      where: { governmentServiceVersionId },
      orderBy: { sortOrder: 'asc' },
    });

    if (configured) {
      return {
        ruleCode: configured.ruleCode,
        label: configured.label,
        targetDurationMs: configured.targetDurationMs,
        escalationLadderCode: configured.escalationLadderCode,
        pauseOnRfi: configured.pauseOnRfi,
        governmentServiceVersionId,
        configuration: configured.configuration as Record<string, unknown>,
      };
    }

    return null;
  }

  async resolveByRuleCode(
    governmentServiceVersionId: string,
    ruleCode: string,
  ): Promise<ResolvedSlaStandard | null> {
    const configured = await this.prisma.governmentServiceSlaRule.findUnique({
      where: {
        governmentServiceVersionId_ruleCode: { governmentServiceVersionId, ruleCode },
      },
    });

    if (!configured) {
      return this.protocolFallback(ruleCode, governmentServiceVersionId);
    }

    return {
      ruleCode: configured.ruleCode,
      label: configured.label,
      targetDurationMs: configured.targetDurationMs,
      escalationLadderCode: configured.escalationLadderCode,
      pauseOnRfi: configured.pauseOnRfi,
      governmentServiceVersionId,
      configuration: configured.configuration as Record<string, unknown>,
    };
  }

  protocolFallback(ruleCode: string, governmentServiceVersionId: string): ResolvedSlaStandard | null {
    const mapping: Record<string, { label: string; ms: number }> = {
      [PROTOCOL_SLA_RULE_CODES.INITIAL_RESPONSE_72H]: {
        label: '72-hour initial response',
        ms: PROTOCOL_TIME_STANDARD_MS.HOURS_72,
      },
      [PROTOCOL_SLA_RULE_CODES.URGENT_24H]: {
        label: '24-hour urgent response',
        ms: PROTOCOL_TIME_STANDARD_MS.HOURS_24,
      },
      [PROTOCOL_SLA_RULE_CODES.SUBSTANTIVE_5D]: {
        label: '5-day substantive processing',
        ms: PROTOCOL_TIME_STANDARD_MS.DAYS_5,
      },
    };

    const entry = mapping[ruleCode];
    if (!entry) {
      return null;
    }

    return {
      ruleCode,
      label: entry.label,
      targetDurationMs: entry.ms,
      escalationLadderCode: null,
      pauseOnRfi: true,
      governmentServiceVersionId,
      configuration: { source: 'protocol-fallback' },
    };
  }
}
