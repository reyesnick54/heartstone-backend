import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DispositionEligibilityStatus,
  DispositionExecutionResult,
  DispositionMethod,
  DispositionRequestStatus,
  LegalHoldTargetType,
  RetentionScheduleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ArchivalTransfersService } from '../archival/archival-transfers.service';
import {
  type DispositionContext,
  evaluateDispositionSafeHalts,
} from '../common/disposition-safe-halt.util';
import { hashRecordsPayload } from '../common/records-hash.util';
import {
  AUTOMATED_DISPOSITION_OUTCOMES,
  DISPOSITION_APPROVAL_PERMISSION,
  FORBIDDEN_AUTOMATED_DISPOSITION_OUTCOMES,
} from '../evidence-records.constants';
import { LegalHoldsService } from '../legal-hold/legal-holds.service';
import { PreservationCollectionsService } from '../preservation/preservation-collections.service';

export interface EvaluateDispositionEligibilityInput {
  targetType: LegalHoldTargetType;
  targetReference: string;
  retentionScheduleId?: string;
  appealActive?: boolean;
  investigationActive?: boolean;
  adverseEvidenceProtected?: boolean;
  continuingObligation?: boolean;
  archivalTransferId?: string;
  integrityVerified?: boolean;
  vendorPolicyConflict?: boolean;
}

export interface CreateDispositionRequestInput {
  targetType: LegalHoldTargetType;
  targetReference: string;
  retentionScheduleId?: string;
  requestedByIdentityId: string;
  reason: string;
  appealActive?: boolean;
  investigationActive?: boolean;
  adverseEvidenceProtected?: boolean;
  continuingObligation?: boolean;
  archivalTransferId?: string;
  integrityVerified?: boolean;
  vendorPolicyConflict?: boolean;
}

export interface AuthorizeDispositionInput {
  authorizedByIdentityId: string;
  authorityReference: string;
  method: DispositionMethod;
  dispositionDate?: Date;
  verificationNotes?: string;
  actorPermissions: string[];
}

export interface ExecuteDispositionInput {
  executedByIdentityId: string;
  manifestCertificate?: Record<string, unknown>;
}

@Injectable()
export class RecordDispositionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly legalHoldsService: LegalHoldsService,
    private readonly preservationCollectionsService: PreservationCollectionsService,
    private readonly archivalTransfersService: ArchivalTransfersService,
  ) {}

  async evaluateEligibility(input: EvaluateDispositionEligibilityInput) {
    const context = await this.buildDispositionContext(input);
    const safeHaltReasons = evaluateDispositionSafeHalts(context);

    let eligibilityStatus: DispositionEligibilityStatus;
    if (safeHaltReasons.length > 0) {
      eligibilityStatus = DispositionEligibilityStatus.BLOCKED;
    } else if (context.retentionPeriodResolved && context.retentionScheduleResolved) {
      eligibilityStatus = DispositionEligibilityStatus.ELIGIBLE_FOR_REVIEW;
    } else {
      eligibilityStatus = DispositionEligibilityStatus.NOT_ELIGIBLE;
    }

    return {
      eligibilityStatus,
      safeHaltReasons,
      automatedOutcome: AUTOMATED_DISPOSITION_OUTCOMES.includes(
        eligibilityStatus as (typeof AUTOMATED_DISPOSITION_OUTCOMES)[number],
      )
        ? eligibilityStatus
        : null,
      forbiddenAutomatedOutcome: FORBIDDEN_AUTOMATED_DISPOSITION_OUTCOMES[0],
      notes: safeHaltReasons.length
        ? ['Disposition safe-halted pending institutional resolution']
        : ['Eligible for institutional review only; destruction requires authorization'],
    };
  }

  async runAutomatedEligibilityScan(targets: EvaluateDispositionEligibilityInput[]) {
    const results = [];
    for (const target of targets) {
      const evaluation = await this.evaluateEligibility(target);
      results.push({
        ...target,
        ...evaluation,
        destroyNow: false,
      });
    }
    return results;
  }

  async createRequest(input: CreateDispositionRequestInput) {
    const evaluation = await this.evaluateEligibility(input);
    const requestReference = `DISP-${String(Date.now())}-${input.targetReference.slice(0, 8)}`;

    const status =
      evaluation.safeHaltReasons.length > 0
        ? DispositionRequestStatus.SAFE_HALTED
        : DispositionRequestStatus.SUBMITTED;

    return this.prisma.recordDispositionRequest.create({
      data: {
        requestReference,
        targetType: input.targetType,
        targetReference: input.targetReference,
        retentionScheduleId: input.retentionScheduleId,
        eligibilityStatus: evaluation.eligibilityStatus,
        eligibilityCalculatedAt: new Date(),
        eligibilityNotes: evaluation.notes.join('; '),
        safeHaltReasons: evaluation.safeHaltReasons,
        appealActive: input.appealActive ?? false,
        investigationActive: input.investigationActive ?? false,
        adverseEvidenceProtected: input.adverseEvidenceProtected ?? false,
        requestedByIdentityId: input.requestedByIdentityId,
        reason: input.reason,
        status,
      },
    });
  }

  async authorize(requestId: string, input: AuthorizeDispositionInput) {
    if (!input.actorPermissions.includes(DISPOSITION_APPROVAL_PERMISSION)) {
      throw new ForbiddenException('Disposition authorization requires configured approval authority');
    }

    const request = await this.prisma.recordDispositionRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException(`RecordDispositionRequest "${requestId}" was not found`);
    }
    if (request.status === DispositionRequestStatus.EXECUTED) {
      throw new BadRequestException('Disposition request has already been executed');
    }
    if (request.safeHaltReasons.length > 0 || request.status === DispositionRequestStatus.SAFE_HALTED) {
      throw new BadRequestException('Cannot authorize disposition while safe-halt conditions remain');
    }

    const manifestCertificate = {
      requestReference: request.requestReference,
      targetType: request.targetType,
      targetReference: request.targetReference,
      authorityReference: input.authorityReference,
    };

    return this.prisma.$transaction(async (tx) => {
      const approvedRequest = await tx.recordDispositionRequest.update({
        where: { id: requestId },
        data: { status: DispositionRequestStatus.APPROVED },
      });

      const record = await tx.recordDispositionRecord.create({
        data: {
          dispositionRequestId: requestId,
          authorizedByIdentityId: input.authorizedByIdentityId,
          authorityReference: input.authorityReference,
          dispositionDate: input.dispositionDate ?? new Date(),
          method: input.method,
          manifestCertificate,
          manifestCertificateHash: hashRecordsPayload(manifestCertificate),
          verificationNotes: input.verificationNotes,
          result: DispositionExecutionResult.COMPLETED,
        },
      });

      return { request: approvedRequest, record };
    });
  }

  async execute(requestId: string, input: ExecuteDispositionInput) {
    const request = await this.prisma.recordDispositionRequest.findUnique({
      where: { id: requestId },
      include: { dispositionRecords: true },
    });
    if (!request) {
      throw new NotFoundException(`RecordDispositionRequest "${requestId}" was not found`);
    }
    if (request.status !== DispositionRequestStatus.APPROVED) {
      throw new BadRequestException('Disposition execution requires prior authorization');
    }
    if (request.dispositionRecords.length === 0) {
      throw new BadRequestException('Disposition execution requires an authorized disposition record');
    }

    const reevaluation = await this.evaluateEligibility({
      targetType: request.targetType,
      targetReference: request.targetReference,
      retentionScheduleId: request.retentionScheduleId ?? undefined,
      appealActive: request.appealActive,
      investigationActive: request.investigationActive,
      adverseEvidenceProtected: request.adverseEvidenceProtected,
    });
    if (reevaluation.safeHaltReasons.length > 0) {
      throw new BadRequestException('Final dependency checks failed; disposition execution blocked');
    }

    return this.prisma.recordDispositionRequest.update({
      where: { id: requestId },
      data: {
        status: DispositionRequestStatus.EXECUTED,
        eligibilityNotes: `Executed by ${input.executedByIdentityId}`,
      },
      include: { dispositionRecords: true },
    });
  }

  attemptScheduledDisposition(input: {
    targetType: LegalHoldTargetType;
    targetReference: string;
    scheduledDate: Date;
  }) {
    if (input.scheduledDate > new Date()) {
      return {
        deleted: false,
        reason: 'Scheduled date has not arrived',
      };
    }

    return {
      deleted: false,
      reason:
        'A scheduled retention date alone must never delete a record automatically; institutional disposition authorization is required',
    };
  }

  private async buildDispositionContext(
    input: EvaluateDispositionEligibilityInput,
  ): Promise<DispositionContext> {
    const legalHoldActive = await this.legalHoldsService.hasActiveHold(
      input.targetType,
      input.targetReference,
    );

    let retentionScheduleResolved = false;
    let retentionPeriodResolved = false;
    let classificationResolved = false;

    if (input.retentionScheduleId) {
      const schedule = await this.prisma.retentionSchedule.findUnique({
        where: { id: input.retentionScheduleId },
        include: { recordsClassification: true },
      });
      if (schedule?.status === RetentionScheduleStatus.ACTIVE) {
        retentionScheduleResolved = Boolean(schedule.governingSourceId);
        classificationResolved = schedule.recordsClassification.status === 'ACTIVE';
        const assignment = await this.prisma.recordRetentionAssignment.findFirst({
          where: {
            targetType: input.targetType,
            targetReference: input.targetReference,
            retentionScheduleId: input.retentionScheduleId,
          },
        });
        retentionPeriodResolved = Boolean(
          assignment?.retentionExpiresAt && assignment.retentionExpiresAt <= new Date(),
        );
      }
    }

    let archiveTransferComplete = true;
    if (input.archivalTransferId) {
      archiveTransferComplete = await this.archivalTransfersService.isTransferComplete(
        input.archivalTransferId,
      );
    }

    const investigationActive =
      input.investigationActive ??
      (await this.preservationCollectionsService.blocksDisposition(input.targetReference));

    return {
      targetType: input.targetType,
      targetReference: input.targetReference,
      retentionScheduleResolved,
      retentionPeriodResolved,
      classificationResolved,
      integrityVerified: input.integrityVerified ?? true,
      appealActive: input.appealActive ?? false,
      investigationActive,
      adverseEvidenceProtected: input.adverseEvidenceProtected ?? false,
      continuingObligation: input.continuingObligation ?? false,
      archiveTransferComplete,
      legalHoldActive,
      vendorPolicyConflict: input.vendorPolicyConflict ?? false,
      approvalPresent: true,
    };
  }
}
