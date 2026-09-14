import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FinancialApprovalRecord,
  FinancialApprovalStatus,
  FinancialApprovalType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface RequestFinancialApprovalInput {
  approvalType: FinancialApprovalType;
  subjectReference: string;
  subjectType: string;
  feeScheduleVersionId?: string;
  refundAuthorizationId?: string;
  reconciliationBatchId?: string;
}

type TransactionClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class FinancialApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySubject(
    subjectType: string,
    subjectReference: string,
  ): Promise<FinancialApprovalRecord[]> {
    return this.prisma.financialApprovalRecord.findMany({
      where: { subjectType, subjectReference },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLatestByType(
    approvalType: FinancialApprovalType,
  ): Promise<FinancialApprovalRecord | null> {
    return this.prisma.financialApprovalRecord.findFirst({
      where: { approvalType },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByIdOrThrow(id: string): Promise<FinancialApprovalRecord> {
    const record = await this.prisma.financialApprovalRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`FinancialApprovalRecord ${id} not found`);
    }
    return record;
  }

  async requestApproval(input: RequestFinancialApprovalInput): Promise<FinancialApprovalRecord> {
    return this.prisma.financialApprovalRecord.create({
      data: {
        approvalType: input.approvalType,
        status: FinancialApprovalStatus.PENDING,
        subjectReference: input.subjectReference,
        subjectType: input.subjectType,
        feeScheduleVersionId: input.feeScheduleVersionId,
        refundAuthorizationId: input.refundAuthorizationId,
        reconciliationBatchId: input.reconciliationBatchId,
      },
    });
  }

  async requestApprovalTx(
    tx: TransactionClient,
    input: RequestFinancialApprovalInput,
  ): Promise<FinancialApprovalRecord> {
    return tx.financialApprovalRecord.create({
      data: {
        approvalType: input.approvalType,
        status: FinancialApprovalStatus.PENDING,
        subjectReference: input.subjectReference,
        subjectType: input.subjectType,
        feeScheduleVersionId: input.feeScheduleVersionId,
        refundAuthorizationId: input.refundAuthorizationId,
        reconciliationBatchId: input.reconciliationBatchId,
      },
    });
  }

  async approvePendingForSubject(
    approvalType: FinancialApprovalType,
    subjectReference: string,
    approvedByIdentityId: string,
  ): Promise<FinancialApprovalRecord> {
    return this.approvePendingForSubjectTx(
      this.prisma,
      approvalType,
      subjectReference,
      approvedByIdentityId,
    );
  }

  async approvePendingForSubjectTx(
    tx: TransactionClient,
    approvalType: FinancialApprovalType,
    subjectReference: string,
    approvedByIdentityId: string,
  ): Promise<FinancialApprovalRecord> {
    const pending = await tx.financialApprovalRecord.findFirst({
      where: {
        approvalType,
        subjectReference,
        status: FinancialApprovalStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!pending) {
      throw new NotFoundException(
        `Pending ${approvalType} approval for subject ${subjectReference} not found`,
      );
    }

    return tx.financialApprovalRecord.update({
      where: { id: pending.id },
      data: {
        status: FinancialApprovalStatus.APPROVED,
        approvedByIdentityId,
        approvedAt: new Date(),
      },
    });
  }

  async requireApproved(
    approvalType: FinancialApprovalType,
    subjectReference: string,
  ): Promise<FinancialApprovalRecord> {
    const record = await this.prisma.financialApprovalRecord.findFirst({
      where: {
        approvalType,
        subjectReference,
        status: FinancialApprovalStatus.APPROVED,
      },
      orderBy: { approvedAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException(
        `Approved ${approvalType} record required for subject ${subjectReference}`,
      );
    }

    return record;
  }
}
