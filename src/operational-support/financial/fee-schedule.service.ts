import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  FeeSchedule,
  FeeScheduleStatus,
  FinancialApprovalStatus,
  FinancialApprovalType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { OperationalSupportBoundaryService } from '../common/operational-support-boundary.service';
import { OPERATIONAL_SUPPORT_REASON_CODES } from '../operational-support.constants';
import { FinancialApprovalService } from './financial-approval.service';

export interface CreateFeeScheduleInput {
  institutionId: string;
  governmentServiceId?: string;
  code: string;
  name: string;
  description?: string;
  currency?: string;
  items: {
    itemCode: string;
    label: string;
    description?: string;
    amountCents?: number;
    currency?: string;
    isVariable?: boolean;
    calculationFormula?: string;
    sortOrder?: number;
  }[];
}

export interface ActivateFeeScheduleVersionInput {
  feeScheduleVersionId: string;
  approverIdentityId: string;
  approverOfficeholderId: string;
  functionAuthorityRecordId: string;
  appointmentId?: string;
  delegationId?: string;
  effectiveFrom?: Date;
}

@Injectable()
export class FeeScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: OperationalSupportBoundaryService,
    private readonly financialApproval: FinancialApprovalService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async findById(id: string): Promise<FeeSchedule | null> {
    return this.prisma.feeSchedule.findUnique({
      where: { id },
      include: { versions: { include: { items: true } } },
    });
  }

  async createSchedule(input: CreateFeeScheduleInput) {
    this.boundary.rejectClientFeeScheduleFields(input as unknown as Record<string, unknown>);

    return this.prisma.feeSchedule.create({
      data: {
        institutionId: input.institutionId,
        governmentServiceId: input.governmentServiceId,
        code: input.code,
        name: input.name,
        description: input.description,
        currency: input.currency ?? 'XCD',
        status: FeeScheduleStatus.DRAFT,
        versions: {
          create: {
            versionNumber: '1.0.0',
            status: FeeScheduleStatus.DRAFT,
            items: {
              create: input.items.map((item, index) => ({
                itemCode: item.itemCode,
                label: item.label,
                description: item.description,
                amountCents: item.amountCents,
                currency: item.currency ?? input.currency ?? 'XCD',
                isVariable: item.isVariable ?? false,
                calculationFormula: item.calculationFormula,
                sortOrder: item.sortOrder ?? index,
              })),
            },
          },
        },
      },
      include: {
        versions: {
          include: { items: true },
        },
      },
    });
  }

  async submitVersionForApproval(feeScheduleVersionId: string) {
    const version = await this.loadVersion(feeScheduleVersionId);

    if (version.status !== FeeScheduleStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT fee schedule versions may be submitted for approval',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.feeScheduleVersion.update({
        where: { id: version.id },
        data: { status: FeeScheduleStatus.PENDING_APPROVAL },
      });

      await this.financialApproval.requestApprovalTx(tx, {
        approvalType: FinancialApprovalType.FEE_SCHEDULE_ACTIVATION,
        subjectReference: version.id,
        subjectType: 'FeeScheduleVersion',
        feeScheduleVersionId: version.id,
      });

      return updated;
    });
  }

  async approveVersion(feeScheduleVersionId: string, approverIdentityId: string) {
    const version = await this.loadVersion(feeScheduleVersionId);

    if (version.status !== FeeScheduleStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Fee schedule version is not pending approval');
    }

    await this.financialApproval.approvePendingForSubject(
      FinancialApprovalType.FEE_SCHEDULE_ACTIVATION,
      version.id,
      approverIdentityId,
    );

    return this.prisma.feeScheduleVersion.update({
      where: { id: version.id },
      data: {
        status: FeeScheduleStatus.APPROVED,
        approvedAt: new Date(),
        approvedByIdentityId: approverIdentityId,
      },
    });
  }

  async activateVersion(input: ActivateFeeScheduleVersionInput) {
    const version = await this.loadVersion(input.feeScheduleVersionId);

    const approval = await this.prisma.financialApprovalRecord.findFirst({
      where: {
        feeScheduleVersionId: version.id,
        approvalType: FinancialApprovalType.FEE_SCHEDULE_ACTIVATION,
        status: FinancialApprovalStatus.APPROVED,
      },
    });

    if (!approval) {
      throw new ForbiddenException(OPERATIONAL_SUPPORT_REASON_CODES.FEE_SCHEDULE_APPROVAL_REQUIRED);
    }

    if (version.status !== FeeScheduleStatus.APPROVED) {
      throw new BadRequestException('Fee schedule version must be APPROVED before activation');
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.approverIdentityId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.APPROVE,
      officeholderId: input.approverOfficeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Authority evaluation denied fee schedule activation');
    }

    const effectiveFrom = input.effectiveFrom ?? new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.feeScheduleVersion.updateMany({
        where: {
          feeScheduleId: version.feeScheduleId,
          status: FeeScheduleStatus.ACTIVE,
        },
        data: { status: FeeScheduleStatus.SUPERSEDED },
      });

      await tx.feeSchedule.update({
        where: { id: version.feeScheduleId },
        data: {
          status: FeeScheduleStatus.ACTIVE,
          effectiveFrom,
        },
      });

      return tx.feeScheduleVersion.update({
        where: { id: version.id },
        data: {
          status: FeeScheduleStatus.ACTIVE,
          effectiveFrom,
        },
      });
    });
  }

  private async loadVersion(feeScheduleVersionId: string) {
    const version = await this.prisma.feeScheduleVersion.findUnique({
      where: { id: feeScheduleVersionId },
      include: { feeSchedule: true, items: true },
    });

    if (!version) {
      throw new NotFoundException(`FeeScheduleVersion ${feeScheduleVersionId} not found`);
    }

    return version;
  }
}
