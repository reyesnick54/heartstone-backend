import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LaunchEventType,
  Prisma,
  ProductionCorrectiveActionStatus,
  type ProductionDefect,
  ProductionDefectSeverity,
  ProductionDefectStatus,
  ProductionMonitoringPlanStatus,
  StabilizationObservationCategory,
  type StabilizationPeriod,
  StabilizationPeriodStatus,
} from '@prisma/client';

import { generateReferenceNumber } from '../../application-processing/common/reference-number.util';
import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';

@Injectable()
export class StabilizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async createMonitoringPlan(input: {
    name: string;
    description: string;
    incidentProcessRef: string;
    ownerIdentityId: string;
    effectiveFrom: Date;
    slis?: unknown[];
    slos?: unknown[];
    alertRules?: unknown[];
  }) {
    return this.prisma.productionMonitoringPlan.create({
      data: {
        planNumber: generateReferenceNumber('PMP'),
        name: input.name,
        description: input.description,
        incidentProcessRef: input.incidentProcessRef,
        ownerIdentityId: input.ownerIdentityId,
        effectiveFrom: input.effectiveFrom,
        slis: (input.slis ?? []) as Prisma.InputJsonValue,
        slos: (input.slos ?? []) as Prisma.InputJsonValue,
        alertRules: (input.alertRules ?? []) as Prisma.InputJsonValue,
        status: ProductionMonitoringPlanStatus.APPROVED,
      },
    });
  }

  async startStabilizationPeriod(input: {
    operationalActivationRecordId: string;
    monitoringPlanId: string;
    startAt: Date;
    plannedEndAt: Date;
    successCriteria?: unknown[];
    recordedByIdentityId: string;
  }): Promise<StabilizationPeriod> {
    const period = await this.prisma.stabilizationPeriod.create({
      data: {
        periodNumber: generateReferenceNumber('STB'),
        operationalActivationRecordId: input.operationalActivationRecordId,
        monitoringPlanId: input.monitoringPlanId,
        startAt: input.startAt,
        plannedEndAt: input.plannedEndAt,
        successCriteria: (input.successCriteria ?? []) as Prisma.InputJsonValue,
        status: StabilizationPeriodStatus.ACTIVE,
      },
    });

    await this.prisma.launchEvent.create({
      data: {
        eventType: LaunchEventType.STABILIZATION_STARTED,
        description: `Stabilization period ${period.periodNumber} started`,
        eventData: { periodNumber: period.periodNumber },
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });

    return period;
  }

  async recordObservation(input: {
    stabilizationPeriodId: string;
    category: StabilizationObservationCategory;
    observationText: string;
    metricData?: Record<string, unknown>;
    severity?: ProductionDefectSeverity;
    recordedByIdentityId: string;
  }) {
    const period = await this.prisma.stabilizationPeriod.findUnique({
      where: { id: input.stabilizationPeriodId },
    });
    if (!period) {
      throw new NotFoundException(`StabilizationPeriod ${input.stabilizationPeriodId} not found`);
    }
    if (period.status !== StabilizationPeriodStatus.ACTIVE) {
      throw new BadRequestException(
        'Observations may only be recorded during active stabilization',
      );
    }

    return this.prisma.stabilizationObservation.create({
      data: {
        stabilizationPeriodId: input.stabilizationPeriodId,
        category: input.category,
        observationText: input.observationText,
        metricData: (input.metricData ?? {}) as Prisma.InputJsonValue,
        severity: input.severity,
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });
  }

  async completeStabilizationPeriod(
    periodId: string,
    recordedByIdentityId: string,
  ): Promise<StabilizationPeriod> {
    const period = await this.prisma.stabilizationPeriod.update({
      where: { id: periodId },
      data: {
        status: StabilizationPeriodStatus.COMPLETED,
        actualEndAt: new Date(),
      },
    });

    await this.prisma.launchEvent.create({
      data: {
        eventType: LaunchEventType.STABILIZATION_COMPLETED,
        description: `Stabilization period ${period.periodNumber} completed`,
        eventData: { periodNumber: period.periodNumber },
        recordedByIdentityId,
      },
    });

    return period;
  }
}

@Injectable()
export class ProductionDefectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async recordDefect(input: {
    title: string;
    description: string;
    severity: ProductionDefectSeverity;
    affectedCapabilityRef: string;
    discoveryContext: string;
    reportedByIdentityId: string;
    mayTriggerSafeHalt?: boolean;
  }): Promise<ProductionDefect> {
    return this.prisma.productionDefect.create({
      data: {
        defectNumber: generateReferenceNumber('PDEF'),
        title: input.title,
        description: input.description,
        severity: input.severity,
        affectedCapabilityRef: input.affectedCapabilityRef,
        discoveryContext: input.discoveryContext,
        reportedByIdentityId: input.reportedByIdentityId,
        mayTriggerSafeHalt:
          input.mayTriggerSafeHalt ?? input.severity === ProductionDefectSeverity.CRITICAL,
        status: ProductionDefectStatus.OPEN,
      },
    });
  }

  async assignCorrectiveAction(input: {
    productionDefectId: string;
    actionDescription: string;
    assignedToIdentityId: string;
    verificationRequired?: boolean;
  }) {
    return this.prisma.productionCorrectiveAction.create({
      data: {
        productionDefectId: input.productionDefectId,
        actionDescription: input.actionDescription,
        assignedToIdentityId: input.assignedToIdentityId,
        verificationRequired: input.verificationRequired ?? true,
        status: ProductionCorrectiveActionStatus.OPEN,
      },
    });
  }

  async verifyAndCloseCorrectiveAction(input: {
    correctiveActionId: string;
    verifiedByIdentityId: string;
    verificationNotes: string;
  }) {
    const action = await this.prisma.productionCorrectiveAction.findUnique({
      where: { id: input.correctiveActionId },
    });
    if (!action) {
      throw new NotFoundException(
        `ProductionCorrectiveAction ${input.correctiveActionId} not found`,
      );
    }

    this.boundary.assertCorrectiveActionRequiresVerificationBeforeClosure(
      action.verificationRequired,
      ProductionCorrectiveActionStatus.VERIFIED,
      new Date(),
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productionCorrectiveAction.update({
        where: { id: input.correctiveActionId },
        data: {
          status: ProductionCorrectiveActionStatus.VERIFIED,
          verifiedByIdentityId: input.verifiedByIdentityId,
          verifiedAt: new Date(),
          verificationNotes: input.verificationNotes,
        },
      });

      await tx.productionDefect.update({
        where: { id: action.productionDefectId },
        data: { status: ProductionDefectStatus.PENDING_VERIFICATION },
      });

      return updated;
    });
  }

  async closeCorrectiveAction(correctiveActionId: string) {
    const action = await this.prisma.productionCorrectiveAction.findUnique({
      where: { id: correctiveActionId },
    });
    if (!action) {
      throw new NotFoundException(`ProductionCorrectiveAction ${correctiveActionId} not found`);
    }

    this.boundary.assertCorrectiveActionRequiresVerificationBeforeClosure(
      action.verificationRequired,
      ProductionCorrectiveActionStatus.CLOSED,
      action.verifiedAt,
    );

    if (action.verificationRequired && !action.verifiedAt) {
      throw new BadRequestException('Corrective action requires verification before closure');
    }

    return this.prisma.productionCorrectiveAction.update({
      where: { id: correctiveActionId },
      data: { status: ProductionCorrectiveActionStatus.CLOSED },
    });
  }
}
