import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ComplianceAlertLevel,
  ComplianceAlertStatus,
  MonitoringRuleStatus,
  MonitoringRuleType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  COMPLIANCE_ALERT_DISCLAIMER,
  COMPLIANCE_RISK_SCORE_DISCLAIMER,
} from './compliance-status.constants';

export interface CreateMonitoringRuleInput {
  code: string;
  name: string;
  description?: string;
  ruleType: MonitoringRuleType;
  institutionId?: string;
  departmentId?: string;
  structuredConfig: Prisma.InputJsonValue;
  warningDaysBefore?: number;
  criticalDaysBefore?: number;
  reviewIntervalDays?: number;
  effectiveFrom?: Date;
}

export interface EvaluateMonitoringRuleInput {
  ruleId: string;
  projectionId: string;
  sourceDataRefs: Prisma.InputJsonValue;
  countValue?: number;
}

export interface RecordRiskPrioritizationInput {
  projectionId: string;
  score: number;
  methodology: string;
  methodologyVersion: string;
  inputs: Prisma.InputJsonValue;
  limitations: string;
  reviewedByIdentityId?: string;
}

@Injectable()
export class ComplianceMonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(input: CreateMonitoringRuleInput) {
    this.assertStructuredConfig(input.structuredConfig);

    return this.prisma.monitoringRule.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        ruleType: input.ruleType,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
        structuredConfig: input.structuredConfig,
        warningDaysBefore: input.warningDaysBefore,
        criticalDaysBefore: input.criticalDaysBefore,
        reviewIntervalDays: input.reviewIntervalDays,
        effectiveFrom: input.effectiveFrom,
        status: MonitoringRuleStatus.DRAFT,
      },
    });
  }

  async activateRule(ruleId: string) {
    return this.prisma.monitoringRule.update({
      where: { id: ruleId },
      data: { status: MonitoringRuleStatus.ACTIVE },
    });
  }

  async evaluateRule(input: EvaluateMonitoringRuleInput) {
    const rule = await this.prisma.monitoringRule.findUnique({ where: { id: input.ruleId } });
    if (rule?.status !== MonitoringRuleStatus.ACTIVE) {
      throw new BadRequestException('Monitoring rule is not active');
    }

    this.assertStructuredConfig(rule.structuredConfig);

    await this.prisma.complianceMonitoringEvent.create({
      data: {
        projectionId: input.projectionId,
        monitoringRuleId: input.ruleId,
        eventType: 'RULE_EVALUATED',
        eventSummary: `Rule ${rule.code} evaluated`,
        sourceDataRefs: input.sourceDataRefs,
      },
    });

    const alertLevel = this.resolveAlertLevel(rule, input.countValue ?? 0);
    if (!alertLevel) {
      return null;
    }

    return this.prisma.complianceAlert.create({
      data: {
        projectionId: input.projectionId,
        monitoringRuleId: input.ruleId,
        alertLevel,
        title: rule.name,
        summary: `${COMPLIANCE_ALERT_DISCLAIMER} ${rule.description ?? rule.name}`,
        sourceDataRefs: input.sourceDataRefs,
        uncertaintyNotes: 'Automated monitoring signal; human review required.',
        isViolation: false,
        isEnforcementDecision: false,
        methodologyVersion: 'monitoring-rule-v1',
        inputsSnapshot: rule.structuredConfig as Prisma.InputJsonValue,
        limitations: 'Alert reflects rule evaluation only; not a legal determination.',
        humanReviewRequired: true,
      },
    });
  }

  async recordRiskPrioritizationScore(input: RecordRiskPrioritizationInput) {
    if (input.score < 0 || input.score > 100) {
      throw new BadRequestException('Risk score must be between 0 and 100');
    }

    return this.prisma.complianceAlert.create({
      data: {
        projectionId: input.projectionId,
        alertLevel:
          input.score >= 80 ? ComplianceAlertLevel.CRITICAL : ComplianceAlertLevel.ATTENTION,
        status: ComplianceAlertStatus.OPEN,
        title: 'Risk prioritization score (non-sanctioning)',
        summary: COMPLIANCE_RISK_SCORE_DISCLAIMER,
        sourceDataRefs: input.inputs,
        methodologyVersion: input.methodologyVersion,
        inputsSnapshot: {
          methodology: input.methodology,
          score: input.score,
          version: input.methodologyVersion,
          limitations: input.limitations,
        },
        limitations: input.limitations,
        isViolation: false,
        isEnforcementDecision: false,
        humanReviewRequired: true,
        humanReviewedAt: input.reviewedByIdentityId ? new Date() : undefined,
        humanReviewedByIdentityId: input.reviewedByIdentityId,
      },
    });
  }

  private resolveAlertLevel(
    rule: { warningDaysBefore: number | null; criticalDaysBefore: number | null },
    countValue: number,
  ): ComplianceAlertLevel | null {
    if (countValue <= 0) {
      return null;
    }
    if (rule.criticalDaysBefore !== null && countValue >= rule.criticalDaysBefore) {
      return ComplianceAlertLevel.CRITICAL;
    }
    if (rule.warningDaysBefore !== null && countValue >= rule.warningDaysBefore) {
      return ComplianceAlertLevel.ELEVATED;
    }
    return ComplianceAlertLevel.INFORMATION;
  }

  private assertStructuredConfig(config: Prisma.JsonValue | Prisma.InputJsonValue) {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      throw new BadRequestException('Monitoring rule requires structured JSON configuration');
    }

    const record = config as Record<string, unknown>;
    if ('expression' in record || 'executable' in record || 'script' in record) {
      throw new BadRequestException(
        'Arbitrary executable monitoring expressions are not permitted',
      );
    }
  }
}
