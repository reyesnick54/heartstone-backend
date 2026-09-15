import { Injectable } from '@nestjs/common';
import {
  OperationalAlertEventStatus,
  OperationalAlertRuleStatus,
  OperationalAlertSeverity,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CorrelationIdService } from '../common/correlation-id.service';
import { ProductionReliabilityBoundaryService } from '../common/production-reliability-boundary.service';
import { ALERT_DISCLAIMER, RELIABILITY_NUMBER_PREFIXES } from '../production-reliability.constants';

export interface CreateAlertRuleInput {
  reliabilityDefinitionId: string;
  code: string;
  name: string;
  severity: OperationalAlertSeverity;
  conditionDescription: string;
  thresholdConfig: Prisma.InputJsonValue;
  objectiveId?: string;
  runbookId?: string;
}

export interface FireAlertInput {
  ruleId: string;
  observedCondition: string;
  sloViolationObserved?: boolean;
}

@Injectable()
export class OperationalAlertService {
  private alertCounter = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReliabilityBoundaryService,
    private readonly correlationIdService: CorrelationIdService,
  ) {}

  async createRule(input: CreateAlertRuleInput) {
    const correlationId = this.correlationIdService.getCorrelationId();
    return this.prisma.operationalAlertRule.create({
      data: {
        reliabilityDefinitionId: input.reliabilityDefinitionId,
        code: input.code,
        name: input.name,
        severity: input.severity,
        conditionDescription: input.conditionDescription,
        thresholdConfig: input.thresholdConfig,
        objectiveId: input.objectiveId,
        runbookId: input.runbookId,
        status: OperationalAlertRuleStatus.DRAFT,
        isIncident: false,
        notInstitutionalDecision: true,
        correlationId,
      },
    });
  }

  async activateRule(ruleId: string) {
    return this.prisma.operationalAlertRule.update({
      where: { id: ruleId },
      data: { status: OperationalAlertRuleStatus.ACTIVE },
    });
  }

  async fireAlert(input: FireAlertInput) {
    const rule = await this.prisma.operationalAlertRule.findUniqueOrThrow({
      where: { id: input.ruleId },
    });

    this.boundary.assertAlertNotIncident(false);
    this.boundary.assertAlertNotInstitutionalDecision(input.observedCondition);
    this.boundary.assertSloViolationDoesNotWaiveRequirements(false);

    this.alertCounter += 1;
    const alertNumber = `${RELIABILITY_NUMBER_PREFIXES.ALERT}-${String(this.alertCounter).padStart(6, '0')}`;
    const correlationId = this.correlationIdService.getCorrelationId();

    return this.prisma.operationalAlertEvent.create({
      data: {
        ruleId: input.ruleId,
        alertNumber,
        severity: rule.severity,
        observedCondition: input.observedCondition,
        status: OperationalAlertEventStatus.FIRED,
        isIncident: false,
        notInstitutionalDecision: true,
        sloViolationObserved: input.sloViolationObserved ?? false,
        requirementsWaived: false,
        correlationId,
      },
    });
  }

  getAlertDisclaimer(): string {
    return ALERT_DISCLAIMER;
  }
}
