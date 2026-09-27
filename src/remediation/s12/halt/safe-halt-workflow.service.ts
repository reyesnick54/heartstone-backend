import { Injectable } from '@nestjs/common';
import {
  CaseEventType,
  CaseStatus,
  CaseWorkflowInstanceStatus,
  SafeHaltReasonCode,
} from '@prisma/client';

import { CaseEventsService } from '../../../application-processing/cases/case-events.service';
import { CaseStatusService } from '../../../application-processing/cases/case-status.service';
import { PrismaService } from '../../../database/prisma.service';

export interface SafeHaltInput {
  caseId: string;
  reasonCode: SafeHaltReasonCode;
  reason: string;
  requiredResolution: string;
  actorIdentityId?: string;
}

@Injectable()
export class SafeHaltWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseStatus: CaseStatusService,
    private readonly caseEvents: CaseEventsService,
  ) {}

  async halt(input: SafeHaltInput) {
    const instance = await this.prisma.caseWorkflowInstance.findUnique({
      where: { caseId: input.caseId },
    });
    if (!instance) {
      return null;
    }

    await this.prisma.caseWorkflowInstance.update({
      where: { id: instance.id },
      data: {
        status: CaseWorkflowInstanceStatus.SAFE_HALTED,
        haltedAt: new Date(),
        haltReason: input.reason,
        haltReasonCode: input.reasonCode,
        requiredResolution: input.requiredResolution,
      },
    });

    await this.caseStatus.transition(
      input.caseId,
      CaseStatus.SAFE_HALTED,
      input.reason,
      input.actorIdentityId,
    );

    await this.caseEvents.record(
      input.caseId,
      CaseEventType.SAFE_HALT,
      {
        reasonCode: input.reasonCode,
        requiredResolution: input.requiredResolution,
        reason: input.reason,
      },
      input.actorIdentityId,
    );

    return instance;
  }

  async resumeFromHalt(caseId: string, actorIdentityId?: string, resolutionNote?: string) {
    const instance = await this.prisma.caseWorkflowInstance.findUnique({
      where: { caseId },
    });
    if (instance?.status !== CaseWorkflowInstanceStatus.SAFE_HALTED) {
      return instance;
    }

    await this.prisma.caseWorkflowInstance.update({
      where: { id: instance.id },
      data: {
        status: CaseWorkflowInstanceStatus.ACTIVE,
        haltReason: null,
        haltReasonCode: null,
        requiredResolution: null,
        haltedAt: null,
      },
    });

    await this.caseStatus.transition(
      caseId,
      CaseStatus.SUBSTANTIVE_REVIEW,
      resolutionNote ?? 'Safe halt cleared',
      actorIdentityId,
    );

    await this.caseEvents.record(
      caseId,
      CaseEventType.RESUME_FROM_HALT,
      { resolutionNote },
      actorIdentityId,
    );

    return instance;
  }
}
