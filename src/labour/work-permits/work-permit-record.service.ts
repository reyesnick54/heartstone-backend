import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { LabourActorPersona, Prisma, WorkPermitLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { LabourBoundaryService } from '../common/labour-boundary.service';
import { WORK_PERMIT_NUMBER_PREFIX } from '../labour.constants';

export interface RecordWorkPermitStatusInput {
  workPermitRecordId: string;
  toStatus: WorkPermitLifecycleStatus;
  actorIdentityId?: string;
  actorPersona: LabourActorPersona;
  reason?: string;
  governmentDecisionId?: string;
  destructiveOverwrite?: boolean;
  residencyRecordsCreated?: number;
}

export interface IssueWorkPermitRecordInput {
  workerProfileReferenceId: string;
  employerRegistryRecordId?: string;
  workPermitApplicationProfileId?: string;
  immigrationProfileId?: string;
  linkedResidencyPermitRecordId?: string;
  actorPersona: LabourActorPersona;
  governmentDecisionId?: string;
  officialInstrumentId?: string;
}

@Injectable()
export class WorkPermitRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: LabourBoundaryService,
  ) {}

  async issueWorkPermitRecord(input: IssueWorkPermitRecordInput) {
    this.boundary.assertTechnicalAdminCannotCreateWorkAuthorization(input.actorPersona);
    this.boundary.assertAiCannotApproveWorkPermit(input.actorPersona, 'ISSUE_WORK_PERMIT');
    this.boundary.assertEmployerCannotSelfAuthorizeWorker(input.actorPersona, 'ISSUE_WORK_PERMIT');
    this.boundary.assertWorkPermitDoesNotCreateResidency({
      doesNotCreateResidency: true,
      residencyRecordsCreated: 0,
    });
    this.boundary.assertResidencyDoesNotCreateWorkPermit(0);

    const permitNumber = `${WORK_PERMIT_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.workPermitRecord.create({
      data: {
        id: randomUUID(),
        permitNumber,
        workerProfileReferenceId: input.workerProfileReferenceId,
        employerRegistryRecordId: input.employerRegistryRecordId,
        workPermitApplicationProfileId: input.workPermitApplicationProfileId,
        immigrationProfileId: input.immigrationProfileId,
        linkedResidencyPermitRecordId: input.linkedResidencyPermitRecordId,
        governmentDecisionId: input.governmentDecisionId,
        officialInstrumentId: input.officialInstrumentId,
        lifecycleStatus: input.governmentDecisionId
          ? WorkPermitLifecycleStatus.ISSUED
          : WorkPermitLifecycleStatus.PENDING_ISSUANCE,
        doesNotCreateResidency: true,
      },
    });
  }

  async recordStatusTransition(input: RecordWorkPermitStatusInput) {
    this.boundary.assertTechnicalAdminCannotCreateWorkAuthorization(input.actorPersona);
    this.boundary.assertAiCannotApproveWorkPermit(input.actorPersona, 'APPROVE_WORK_PERMIT');
    this.boundary.assertPaymentDoesNotApproveWorkPermit(input.actorPersona);
    this.boundary.assertWorkPermitDoesNotCreateResidency({
      doesNotCreateResidency: true,
      residencyRecordsCreated: input.residencyRecordsCreated ?? 0,
    });

    const permit = await this.prisma.workPermitRecord.findUnique({
      where: { id: input.workPermitRecordId },
    });
    if (!permit) {
      throw new NotFoundException('Work permit record not found');
    }

    this.boundary.assertNoDestructiveWorkPermitStatusOverwrite(
      permit.id,
      Boolean(input.destructiveOverwrite),
    );

    const fromStatus = permit.lifecycleStatus;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.workPermitStatusHistory.create({
        data: {
          id: randomUUID(),
          workPermitRecordId: permit.id,
          fromStatus,
          toStatus: input.toStatus,
          actorIdentityId: input.actorIdentityId,
          actorPersona: input.actorPersona,
          reason: input.reason,
          governmentDecisionId: input.governmentDecisionId,
        },
      });

      const updated = await tx.workPermitRecord.update({
        where: { id: permit.id },
        data: {
          lifecycleStatus: input.toStatus,
          governmentDecisionId: input.governmentDecisionId ?? permit.governmentDecisionId,
        },
      });

      const historyCount = await tx.workPermitStatusHistory.count({
        where: { workPermitRecordId: permit.id },
      });

      return { permit: updated, historyEntries: historyCount, priorStatusPreserved: true };
    });
  }
}
