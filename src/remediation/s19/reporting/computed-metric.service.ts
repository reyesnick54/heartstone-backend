import { Injectable } from '@nestjs/common';
import { InspectionStatus, MetricCalculationMethodType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

export interface ComputedMetricInput {
  institutionId: string;
  metricCode: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface ComputedMetricResult {
  metricCode: string;
  value: string;
  inputCount: number;
  inputRecordReferences: string[];
  calculationTrace: Record<string, unknown>;
}

@Injectable()
export class ComputedMetricService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(input: ComputedMetricInput): Promise<ComputedMetricResult | null> {
    const definition = await this.prisma.metricDefinition.findFirst({
      where: {
        code: input.metricCode,
        ownerInstitutionId: input.institutionId,
      },
      include: {
        versions: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!definition) {
      return null;
    }

    if (definition.calculationMethod === MetricCalculationMethodType.MANUAL_AUTHORIZED_CALCULATION) {
      return null;
    }

    switch (input.metricCode) {
      case 'APPLICATIONS_RECEIVED':
        return this.countApplications(input);
      case 'CASES_OPEN':
        return this.countOpenCases(input);
      case 'DECISIONS_RECORDED':
        return this.countDecisions(input);
      case 'PAYMENTS_SETTLED':
        return this.countSettledPayments(input);
      case 'INSPECTIONS_COMPLETED':
        return this.countInspections(input);
      default:
        return this.countApplications(input);
    }
  }

  private async countApplications(input: ComputedMetricInput): Promise<ComputedMetricResult> {
    const submissions = await this.prisma.applicationSubmission.findMany({
      where: {
        submittedAt: { gte: input.periodStart, lte: input.periodEnd },
        application: {
          governmentService: { responsibleInstitutionId: input.institutionId },
        },
      },
      select: { id: true },
    });

    return {
      metricCode: input.metricCode,
      value: String(submissions.length),
      inputCount: submissions.length,
      inputRecordReferences: submissions.map((row) => row.id),
      calculationTrace: {
        source: 'application_submissions',
        institutionId: input.institutionId,
        periodStart: input.periodStart.toISOString(),
        periodEnd: input.periodEnd.toISOString(),
      },
    };
  }

  private async countOpenCases(input: ComputedMetricInput): Promise<ComputedMetricResult> {
    const cases = await this.prisma.case.findMany({
      where: {
        openedAt: { lte: input.periodEnd },
        OR: [{ closedAt: null }, { closedAt: { gte: input.periodStart } }],
        responsibleInstitutionId: input.institutionId,
      },
      select: { id: true },
    });

    return {
      metricCode: input.metricCode,
      value: String(cases.length),
      inputCount: cases.length,
      inputRecordReferences: cases.map((row) => row.id),
      calculationTrace: {
        source: 'cases',
        institutionId: input.institutionId,
        periodStart: input.periodStart.toISOString(),
        periodEnd: input.periodEnd.toISOString(),
      },
    };
  }

  private async countDecisions(input: ComputedMetricInput): Promise<ComputedMetricResult> {
    const decisions = await this.prisma.governmentDecision.findMany({
      where: {
        decidedAt: { gte: input.periodStart, lte: input.periodEnd },
        institutionId: input.institutionId,
      },
      select: { id: true },
    });

    return {
      metricCode: input.metricCode,
      value: String(decisions.length),
      inputCount: decisions.length,
      inputRecordReferences: decisions.map((row) => row.id),
      calculationTrace: {
        source: 'government_decisions',
        institutionId: input.institutionId,
        periodStart: input.periodStart.toISOString(),
        periodEnd: input.periodEnd.toISOString(),
      },
    };
  }

  private async countSettledPayments(input: ComputedMetricInput): Promise<ComputedMetricResult> {
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        status: 'SETTLED',
        settledAt: { gte: input.periodStart, lte: input.periodEnd },
        paymentIntent: {
          invoice: {
            case: { responsibleInstitutionId: input.institutionId },
          },
        },
      },
      select: { id: true },
    });

    return {
      metricCode: input.metricCode,
      value: String(transactions.length),
      inputCount: transactions.length,
      inputRecordReferences: transactions.map((row) => row.id),
      calculationTrace: {
        source: 'payment_transactions',
        institutionId: input.institutionId,
        periodStart: input.periodStart.toISOString(),
        periodEnd: input.periodEnd.toISOString(),
      },
    };
  }

  private async countInspections(input: ComputedMetricInput): Promise<ComputedMetricResult> {
    const inspections = await this.prisma.inspectionRecord.findMany({
      where: {
        updatedAt: { gte: input.periodStart, lte: input.periodEnd },
        status: { in: [InspectionStatus.COMPLETED, InspectionStatus.CLOSED] },
        case: { responsibleInstitutionId: input.institutionId },
      },
      select: { id: true },
    });

    return {
      metricCode: input.metricCode,
      value: String(inspections.length),
      inputCount: inspections.length,
      inputRecordReferences: inspections.map((row) => row.id),
      calculationTrace: {
        source: 'inspection_records',
        institutionId: input.institutionId,
        periodStart: input.periodStart.toISOString(),
        periodEnd: input.periodEnd.toISOString(),
      },
    };
  }
}
