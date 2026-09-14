import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FeeAssessment,
  FeeAssessmentStatus,
  FeeScheduleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { OperationalSupportBoundaryService } from '../common/operational-support-boundary.service';
import {
  FEE_ASSESSMENT_REFERENCE_PREFIX,
  OPERATIONAL_SUPPORT_REASON_CODES,
} from '../operational-support.constants';

export interface CalculateFeeAssessmentInput {
  institutionId: string;
  governmentServiceVersionId: string;
  caseId?: string;
  applicationId?: string;
  masterAdministrativeFileId?: string;
  variableAmounts?: Record<string, number>;
}

@Injectable()
export class FeeAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: OperationalSupportBoundaryService,
  ) {}

  async findByReference(assessmentReference: string): Promise<FeeAssessment | null> {
    return this.prisma.feeAssessment.findUnique({
      where: { assessmentReference },
      include: { invoices: true },
    });
  }

  async findById(id: string): Promise<FeeAssessment | null> {
    return this.prisma.feeAssessment.findUnique({ where: { id } });
  }

  async getByIdOrThrow(id: string): Promise<FeeAssessment> {
    const assessment = await this.findById(id);
    if (!assessment) {
      throw new NotFoundException(`FeeAssessment ${id} not found`);
    }
    return assessment;
  }

  async calculateAssessment(input: CalculateFeeAssessmentInput) {
    this.boundary.rejectClientFeeAssessmentFields(input as unknown as Record<string, unknown>);

    const serviceVersion = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: input.governmentServiceVersionId },
      include: {
        governmentService: true,
        fees: true,
      },
    });

    if (!serviceVersion) {
      throw new NotFoundException(
        `GovernmentServiceVersion ${input.governmentServiceVersionId} not found`,
      );
    }

    const activeVersion = await this.prisma.feeScheduleVersion.findFirst({
      where: {
        status: FeeScheduleStatus.ACTIVE,
        feeSchedule: {
          institutionId: input.institutionId,
          governmentServiceId: serviceVersion.governmentServiceId,
          status: FeeScheduleStatus.ACTIVE,
        },
      },
      include: { items: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!activeVersion) {
      throw new BadRequestException(OPERATIONAL_SUPPORT_REASON_CODES.ACTIVE_FEE_SCHEDULE_REQUIRED);
    }

    const scheduleItemsByCode = new Map(activeVersion.items.map((item) => [item.itemCode, item]));
    let totalAmountCents = 0;
    const currency = activeVersion.items[0]?.currency ?? serviceVersion.fees[0]?.currency ?? 'XCD';

    for (const feeDefinition of serviceVersion.fees) {
      const scheduleItem = scheduleItemsByCode.get(feeDefinition.code);
      if (!scheduleItem) {
        throw new BadRequestException(
          `Active fee schedule missing item for service fee code "${feeDefinition.code}"`,
        );
      }

      if (scheduleItem.isVariable || feeDefinition.isVariable) {
        const variableAmount = input.variableAmounts?.[feeDefinition.code];
        if (variableAmount == null || variableAmount < 0) {
          throw new BadRequestException(
            `Variable fee "${feeDefinition.code}" requires a supplied amount`,
          );
        }
        totalAmountCents += variableAmount;
        continue;
      }

      const amount = scheduleItem.amountCents ?? feeDefinition.amountCents;
      if (amount == null) {
        throw new BadRequestException(`Fee "${feeDefinition.code}" has no configured amount`);
      }

      totalAmountCents += amount;
    }

    const count = await this.prisma.feeAssessment.count();
    const assessmentReference = `${FEE_ASSESSMENT_REFERENCE_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    return this.prisma.feeAssessment.create({
      data: {
        caseId: input.caseId,
        applicationId: input.applicationId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        feeScheduleVersionId: activeVersion.id,
        assessmentReference,
        status: FeeAssessmentStatus.CALCULATED,
        totalAmountCents,
        currency,
        notes: `Calculated from service version ${serviceVersion.version} and schedule ${activeVersion.versionNumber}`,
      },
    });
  }
}
