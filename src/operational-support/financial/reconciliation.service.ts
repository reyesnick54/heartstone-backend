import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  FinancialApprovalStatus,
  FinancialApprovalType,
  ReconciliationBatch,
  ReconciliationBatchStatus,
  ReconciliationItemStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import {
  OPERATIONAL_SUPPORT_REASON_CODES,
  RECONCILIATION_BATCH_REFERENCE_PREFIX,
} from '../operational-support.constants';
import { FinancialApprovalService } from './financial-approval.service';

export interface OpenReconciliationBatchInput {
  institutionId?: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface AddReconciliationItemInput {
  reconciliationBatchId: string;
  paymentTransactionId?: string;
  externalReference?: string;
  expectedAmountCents: number;
  actualAmountCents?: number;
}

export interface CloseReconciliationBatchInput {
  reconciliationBatchId: string;
  approverIdentityId: string;
  approverOfficeholderId: string;
  functionAuthorityRecordId: string;
  appointmentId?: string;
  delegationId?: string;
}

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialApproval: FinancialApprovalService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async findBatchByReference(batchReference: string): Promise<ReconciliationBatch | null> {
    return this.prisma.reconciliationBatch.findUnique({
      where: { batchReference },
      include: { items: true },
    });
  }

  async getBatchByReferenceOrThrow(batchReference: string): Promise<ReconciliationBatch> {
    const batch = await this.findBatchByReference(batchReference);
    if (!batch) {
      throw new NotFoundException(`ReconciliationBatch ${batchReference} not found`);
    }
    return batch;
  }

  async openBatch(input: OpenReconciliationBatchInput) {
    if (input.periodEnd <= input.periodStart) {
      throw new BadRequestException('Reconciliation periodEnd must be after periodStart');
    }

    const count = await this.prisma.reconciliationBatch.count();
    const batchReference = `${RECONCILIATION_BATCH_REFERENCE_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    return this.prisma.reconciliationBatch.create({
      data: {
        institutionId: input.institutionId,
        batchReference,
        status: ReconciliationBatchStatus.OPEN,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
    });
  }

  async addItem(input: AddReconciliationItemInput) {
    const batch = await this.loadBatch(input.reconciliationBatchId);

    if (batch.status === ReconciliationBatchStatus.CLOSED) {
      throw new BadRequestException('Cannot add items to a closed reconciliation batch');
    }

    let actualAmountCents = input.actualAmountCents;

    if (input.paymentTransactionId) {
      const transaction = await this.prisma.paymentTransaction.findUnique({
        where: { id: input.paymentTransactionId },
      });

      if (!transaction) {
        throw new NotFoundException(`PaymentTransaction ${input.paymentTransactionId} not found`);
      }

      actualAmountCents = transaction.amountCents;
    }

    const status =
      actualAmountCents == null || actualAmountCents !== input.expectedAmountCents
        ? ReconciliationItemStatus.MISMATCH
        : ReconciliationItemStatus.MATCHED;

    const item = await this.prisma.reconciliationItem.create({
      data: {
        reconciliationBatchId: batch.id,
        paymentTransactionId: input.paymentTransactionId,
        externalReference: input.externalReference,
        expectedAmountCents: input.expectedAmountCents,
        actualAmountCents,
        status,
      },
    });

    if (status === ReconciliationItemStatus.MISMATCH) {
      await this.prisma.reconciliationBatch.update({
        where: { id: batch.id },
        data: { status: ReconciliationBatchStatus.EXCEPTION },
      });
    } else if (batch.status === ReconciliationBatchStatus.OPEN) {
      await this.prisma.reconciliationBatch.update({
        where: { id: batch.id },
        data: { status: ReconciliationBatchStatus.IN_PROGRESS },
      });
    }

    return item;
  }

  async resolveMismatchItem(reconciliationItemId: string, resolutionNotes: string) {
    const item = await this.prisma.reconciliationItem.findUnique({
      where: { id: reconciliationItemId },
    });

    if (!item) {
      throw new NotFoundException(`ReconciliationItem ${reconciliationItemId} not found`);
    }

    if (
      item.status !== ReconciliationItemStatus.MISMATCH &&
      item.status !== ReconciliationItemStatus.EXCEPTION
    ) {
      throw new BadRequestException('Only mismatch or exception items may be resolved');
    }

    return this.prisma.reconciliationItem.update({
      where: { id: item.id },
      data: {
        status: ReconciliationItemStatus.RESOLVED,
        resolvedAt: new Date(),
        resolutionNotes,
      },
    });
  }

  async closeBatch(input: CloseReconciliationBatchInput) {
    const batch = await this.loadBatch(input.reconciliationBatchId);

    const unresolved = await this.prisma.reconciliationItem.count({
      where: {
        reconciliationBatchId: batch.id,
        status: { in: [ReconciliationItemStatus.MISMATCH, ReconciliationItemStatus.EXCEPTION] },
      },
    });

    if (unresolved > 0) {
      throw new BadRequestException('Reconciliation batch has unresolved mismatch exceptions');
    }

    await this.financialApproval.requestApproval({
      approvalType: FinancialApprovalType.RECONCILIATION_CLOSURE,
      subjectReference: batch.id,
      subjectType: 'ReconciliationBatch',
      reconciliationBatchId: batch.id,
    });

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.approverIdentityId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.APPROVE,
      officeholderId: input.approverOfficeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Authority evaluation denied reconciliation closure');
    }

    await this.financialApproval.approvePendingForSubject(
      FinancialApprovalType.RECONCILIATION_CLOSURE,
      batch.id,
      input.approverIdentityId,
    );

    const approved = await this.prisma.financialApprovalRecord.findFirst({
      where: {
        reconciliationBatchId: batch.id,
        approvalType: FinancialApprovalType.RECONCILIATION_CLOSURE,
        status: FinancialApprovalStatus.APPROVED,
      },
    });

    if (!approved) {
      throw new ForbiddenException(
        OPERATIONAL_SUPPORT_REASON_CODES.RECONCILIATION_CLOSURE_APPROVAL_REQUIRED,
      );
    }

    return this.prisma.reconciliationBatch.update({
      where: { id: batch.id },
      data: {
        status: ReconciliationBatchStatus.CLOSED,
        closedAt: new Date(),
      },
    });
  }

  private async loadBatch(reconciliationBatchId: string) {
    const batch = await this.prisma.reconciliationBatch.findUnique({
      where: { id: reconciliationBatchId },
    });

    if (!batch) {
      throw new NotFoundException(`ReconciliationBatch ${reconciliationBatchId} not found`);
    }

    return batch;
  }
}
