import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type FeeAssessment,
  FeeAssessmentStatus,
  FeeCalculationMethod,
  FeeScheduleLifecycleStatus,
  FinancialAuditEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { FinancialBoundaryService } from '../common/financial-boundary.service';
import { computeFeeAssessmentIntegrityHash } from '../common/financial-hash.util';
import {
  addCents,
  assertIntegerCents,
  assertNonNegativeCents,
  assertSameCurrency,
  multiplyCents,
} from '../common/monetary-arithmetic.util';
import {
  FEE_ASSESSMENT_NUMBER_PREFIX,
  FINANCIAL_REASON_CODES,
} from '../financial-administration.constants';

export interface CalculatedFeeItem {
  feeScheduleItemId: string;
  feeCode: string;
  description: string;
  quantity: number;
  unitAmountCents: number;
  lineTotalCents: number;
  currency: string;
  calculationMethod: string;
}

export interface CalculateFeeAssessmentInput {
  feeScheduleVersionId: string;
  applicationId?: string;
  caseId?: string;
  officialInstrumentId?: string;
  complianceMatterId?: string;
  redressMatterId?: string;
  masterAdministrativeFileId?: string;
  serviceId: string;
  serviceVersionId?: string;
  feeCodes?: string[];
  quantities?: Record<string, number>;
  calculationInputs?: Record<string, unknown>;
  calculatedByIdentityId: string;
}

@Injectable()
export class FeeAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: FinancialBoundaryService,
  ) {}

  async calculateAssessment(input: CalculateFeeAssessmentInput): Promise<FeeAssessment> {
    this.boundary.assertFeeCalculationDoesNotIssueInstrument();

    const version = await this.prisma.feeScheduleVersion.findUnique({
      where: { id: input.feeScheduleVersionId },
      include: {
        feeSchedule: true,
        items: true,
      },
    });

    if (!version) {
      throw new NotFoundException('Fee schedule version not found');
    }

    this.boundary.assertScheduleVersionUsableForAssessment(version.status);

    if (version.feeSchedule.status !== FeeScheduleLifecycleStatus.ACTIVE) {
      throw new BadRequestException(FINANCIAL_REASON_CODES.INACTIVE_SCHEDULE);
    }

    const now = new Date();
    const applicableItems = version.items.filter((item) => {
      if (item.serviceId !== input.serviceId) {
        return false;
      }

      if (
        input.serviceVersionId &&
        item.serviceVersionId &&
        item.serviceVersionId !== input.serviceVersionId
      ) {
        return false;
      }

      if (input.feeCodes && input.feeCodes.length > 0 && !input.feeCodes.includes(item.feeCode)) {
        return false;
      }

      if (item.effectiveFrom > now) {
        return false;
      }

      if (item.effectiveUntil && item.effectiveUntil < now) {
        return false;
      }

      return true;
    });

    if (applicableItems.length === 0) {
      throw new BadRequestException(
        'No applicable fee schedule items found for the requested service',
      );
    }

    const allowedItemIds = applicableItems.map((item) => item.id);
    for (const requestedCode of input.feeCodes ?? []) {
      const matchingItem = applicableItems.find((item) => item.feeCode === requestedCode);
      if (matchingItem) {
        this.boundary.assertClientCannotSelectArbitraryFee(matchingItem.id, allowedItemIds);
      }
    }

    const calculatedItems: CalculatedFeeItem[] = applicableItems.map((item) => {
      assertSameCurrency(version.feeSchedule.currency, item.currency);
      assertIntegerCents(item.amountCents, 'amountCents');

      const quantity = input.quantities?.[item.feeCode] ?? 1;
      assertNonNegativeCents(quantity, 'quantity');

      let lineTotalCents: number;

      switch (item.calculationMethod) {
        case FeeCalculationMethod.FIXED:
          lineTotalCents = item.amountCents;
          break;
        case FeeCalculationMethod.QUANTITY:
          lineTotalCents = multiplyCents(item.amountCents, quantity);
          break;
        case FeeCalculationMethod.PERCENTAGE:
          throw new BadRequestException(
            'PERCENTAGE calculation requires approved base amount in calculationInputs',
          );
        case FeeCalculationMethod.TIERED:
        case FeeCalculationMethod.FORMULA_FROM_APPROVED_RULE:
        case FeeCalculationMethod.MANUAL_AUTHORIZED_CALCULATION:
          throw new BadRequestException(
            `${item.calculationMethod} requires authorized institutional calculation pathway`,
          );
        default:
          lineTotalCents = item.amountCents;
      }

      if (item.minimumAmountCents !== null && lineTotalCents < item.minimumAmountCents) {
        lineTotalCents = item.minimumAmountCents;
      }

      if (item.maximumAmountCents !== null && lineTotalCents > item.maximumAmountCents) {
        lineTotalCents = item.maximumAmountCents;
      }

      return {
        feeScheduleItemId: item.id,
        feeCode: item.feeCode,
        description: item.description,
        quantity,
        unitAmountCents: item.amountCents,
        lineTotalCents,
        currency: item.currency,
        calculationMethod: item.calculationMethod,
      };
    });

    const subtotalCents = addCents(...calculatedItems.map((item) => item.lineTotalCents));
    const adjustmentsCents = 0;
    const totalCents = addCents(subtotalCents, adjustmentsCents);

    const integrityHash = computeFeeAssessmentIntegrityHash({
      feeScheduleVersionId: input.feeScheduleVersionId,
      calculatedItems,
      subtotalCents,
      adjustmentsCents,
      totalCents,
      currency: version.feeSchedule.currency,
      calculationInputs: input.calculationInputs ?? {},
    });

    const assessmentNumber = `${FEE_ASSESSMENT_NUMBER_PREFIX}-${String(Date.now())}-${crypto.randomUUID().slice(0, 8)}`;

    const assessment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.feeAssessment.create({
        data: {
          assessmentNumber,
          applicationId: input.applicationId,
          caseId: input.caseId,
          officialInstrumentId: input.officialInstrumentId,
          complianceMatterId: input.complianceMatterId,
          redressMatterId: input.redressMatterId,
          masterAdministrativeFileId: input.masterAdministrativeFileId,
          feeScheduleVersionId: input.feeScheduleVersionId,
          calculatedItems: calculatedItems as never,
          subtotalCents,
          adjustmentsCents,
          totalCents,
          currency: version.feeSchedule.currency,
          calculationInputs: (input.calculationInputs ?? {}) as never,
          calculatedByIdentityId: input.calculatedByIdentityId,
          status: FeeAssessmentStatus.CALCULATED,
          integrityHash,
        },
      });

      await tx.financialAuditEvent.create({
        data: {
          entityType: 'FeeAssessment',
          entityId: created.id,
          eventType: FinancialAuditEventType.FEE_ASSESSMENT_CALCULATED,
          actorIdentityId: input.calculatedByIdentityId,
          details: {
            feeScheduleVersionId: input.feeScheduleVersionId,
            totalCents,
            currency: version.feeSchedule.currency,
          },
        },
      });

      return created;
    });

    return assessment;
  }

  async findById(id: string): Promise<FeeAssessment> {
    const assessment = await this.prisma.feeAssessment.findUnique({
      where: { id },
      include: {
        feeScheduleVersion: {
          include: { items: true, feeSchedule: true },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Fee assessment not found');
    }

    return assessment;
  }

  assertAssessmentNotLocked(status: FeeAssessmentStatus): void {
    if (status === FeeAssessmentStatus.LOCKED_FOR_INVOICE) {
      throw new BadRequestException(FINANCIAL_REASON_CODES.ASSESSMENT_LOCKED);
    }
  }
}
