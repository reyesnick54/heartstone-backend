import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertVerificationOutcome, MonitoringAlertStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { MONITORING_ALERT_REFERENCE_PREFIX } from '../intelligence.constants';

export interface RecordMonitoringObservationInput {
  institutionId: string;
  monitoringRuleId?: string;
  observationType: string;
  summary: string;
  sourceDataRefs?: unknown[];
}

export interface RaiseMonitoringAlertInput {
  institutionId: string;
  monitoringRuleId?: string;
  monitoringObservationId?: string;
  title: string;
  summary: string;
  isViolation?: boolean;
}

export interface VerifyAlertInput {
  monitoringAlertId: string;
  verifierIdentityId: string;
  outcome: AlertVerificationOutcome;
  findings?: string;
}

@Injectable()
export class IntelligenceMonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  private generateAlertReference(): string {
    return `${MONITORING_ALERT_REFERENCE_PREFIX}-${String(Date.now())}`;
  }

  async recordObservation(input: RecordMonitoringObservationInput) {
    this.boundary.assertMonitoringObservationNotViolation(false);
    this.boundary.assertMonitoringRuleNotEnforcementAuthority();
    return this.prisma.monitoringObservation.create({
      data: {
        institutionId: input.institutionId,
        monitoringRuleId: input.monitoringRuleId,
        observationType: input.observationType,
        summary: input.summary,
        sourceDataRefs: (input.sourceDataRefs ?? []) as Prisma.InputJsonValue,
      },
    });
  }

  async raiseAlert(input: RaiseMonitoringAlertInput) {
    this.boundary.assertAlertNotViolation(input.isViolation ?? false);
    if (input.isViolation) {
      this.boundary.assertAlertVerificationRequiredForViolation(false, true);
    }
    return this.prisma.monitoringAlert.create({
      data: {
        institutionId: input.institutionId,
        monitoringRuleId: input.monitoringRuleId,
        monitoringObservationId: input.monitoringObservationId,
        alertReference: this.generateAlertReference(),
        title: input.title,
        summary: input.summary,
        isViolation: false,
        status: MonitoringAlertStatus.OPEN,
      },
    });
  }

  async verifyAlert(input: VerifyAlertInput) {
    const alert = await this.prisma.monitoringAlert.findUnique({
      where: { id: input.monitoringAlertId },
    });
    if (!alert) {
      throw new NotFoundException(`Monitoring alert ${input.monitoringAlertId} not found`);
    }
    this.boundary.assertAlertCannotSelfVerify(alert.id === input.verifierIdentityId);
    await this.prisma.alertVerification.create({
      data: {
        monitoringAlertId: input.monitoringAlertId,
        verifierIdentityId: input.verifierIdentityId,
        outcome: input.outcome,
        findings: input.findings,
      },
    });
    const isViolation =
      input.outcome === AlertVerificationOutcome.CONFIRMED ||
      input.outcome === AlertVerificationOutcome.PARTIALLY_CONFIRMED;
    return this.prisma.monitoringAlert.update({
      where: { id: input.monitoringAlertId },
      data: {
        status: MonitoringAlertStatus.VERIFIED,
        verifiedAt: new Date(),
        isViolation,
      },
      include: { verifications: true },
    });
  }

  async claimViolationWithoutVerification(alertId: string): Promise<void> {
    const alert = await this.prisma.monitoringAlert.findUnique({
      where: { id: alertId },
      include: { verifications: true },
    });
    if (!alert) {
      throw new NotFoundException(`Monitoring alert ${alertId} not found`);
    }
    this.boundary.assertAlertVerificationRequiredForViolation(
      alert.verifications.length > 0,
      true,
    );
  }
}
