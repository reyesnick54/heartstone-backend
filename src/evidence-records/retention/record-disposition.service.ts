import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  RecordDispositionStatus,
  type RecordDispositionRequest,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { requireConsequentialAuthority } from '../common/consequential-authority.util';
import { generateEvidenceReferenceNumber } from '../common/reference-number.util';
import { CORRECTION_REFERENCE_PREFIX } from '../evidence-records.constants';
import { LegalHoldsService } from '../legal-holds/legal-holds.service';

export interface RequestDispositionInput {
  recordRetentionAssignmentId: string;
  requestedAction: 'RETAIN' | 'REVIEW' | 'TRANSFER' | 'DESTROY';
  reason: string;
  requestedByIdentityId: string;
}

export interface ExecuteDispositionInput {
  dispositionRequestId: string;
  executedByIdentityId: string;
  functionAuthorityRecordId: string;
  officeholderId?: string;
  officeId?: string;
  appointmentId?: string;
  delegationId?: string;
  executionNotes?: string;
}

@Injectable()
export class RecordDispositionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly legalHolds: LegalHoldsService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async requestDisposition(input: RequestDispositionInput): Promise<RecordDispositionRequest> {
    const assignment = await this.prisma.recordRetentionAssignment.findUnique({
      where: { id: input.recordRetentionAssignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Retention assignment "${input.recordRetentionAssignmentId}" was not found`,
      );
    }

    const targetId =
      assignment.evidenceRecordId ??
      assignment.documentRecordId ??
      assignment.masterAdministrativeFileId;
    if (targetId) {
      await this.legalHolds.assertDispositionAllowed(targetId);
    }

    const requestReference = generateEvidenceReferenceNumber(`${CORRECTION_REFERENCE_PREFIX}-DSP`);

    return this.prisma.recordDispositionRequest.create({
      data: {
        requestReference,
        recordRetentionAssignmentId: assignment.id,
        requestedAction: input.requestedAction,
        reason: input.reason,
        requestedByIdentityId: input.requestedByIdentityId,
        status: RecordDispositionStatus.PENDING_APPROVAL,
      },
    });
  }

  async execute(input: ExecuteDispositionInput): Promise<RecordDispositionRequest> {
    const request = await this.prisma.recordDispositionRequest.findUnique({
      where: { id: input.dispositionRequestId },
      include: { recordRetentionAssignment: true },
    });

    if (!request) {
      throw new NotFoundException(`Disposition request "${input.dispositionRequestId}" was not found`);
    }

    const targetId =
      request.recordRetentionAssignment.evidenceRecordId ??
      request.recordRetentionAssignment.documentRecordId ??
      request.recordRetentionAssignment.masterAdministrativeFileId;
    if (targetId) {
      await this.legalHolds.assertDispositionAllowed(targetId);
    }

    await requireConsequentialAuthority(this.authorityEvaluation, {
      identityId: input.executedByIdentityId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.ADMINISTER,
      officeholderId: input.officeholderId,
      officeId: input.officeId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    const dispositionReference = generateEvidenceReferenceNumber(`${CORRECTION_REFERENCE_PREFIX}-EXE`);

    return this.prisma.$transaction(async (tx) => {
      await tx.recordDispositionRecord.create({
        data: {
          recordDispositionRequestId: request.id,
          dispositionReference,
          status: RecordDispositionStatus.EXECUTED,
          executedByIdentityId: input.executedByIdentityId,
          executionNotes: input.executionNotes,
        },
      });

      return tx.recordDispositionRequest.update({
        where: { id: request.id },
        data: {
          status: RecordDispositionStatus.EXECUTED,
          approvedByIdentityId: input.executedByIdentityId,
          approvedAt: new Date(),
        },
      });
    });
  }
}
