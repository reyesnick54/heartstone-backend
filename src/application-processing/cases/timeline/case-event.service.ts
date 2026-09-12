import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type CaseEvent,
  CaseEventPublicVisibility,
  CaseEventType,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

export interface AppendCaseEventInput {
  caseId: string;
  eventType: CaseEventType;
  occurredAt?: Date;
  actorIdentityId?: string;
  officeholderId?: string;
  institutionId?: string;
  departmentId?: string;
  workflowInstanceId?: string;
  stepInstanceId?: string;
  correlationId?: string;
  metadata?: Prisma.InputJsonValue;
  publicVisibility?: CaseEventPublicVisibility;
}

@Injectable()
export class CaseEventService {
  constructor(private readonly prisma: PrismaService) {}

  async append(input: AppendCaseEventInput): Promise<CaseEvent> {
    await this.assertCaseExists(input.caseId);

    return this.prisma.caseEvent.create({
      data: {
        caseId: input.caseId,
        eventType: input.eventType,
        occurredAt: input.occurredAt ?? new Date(),
        actorIdentityId: input.actorIdentityId,
        officeholderId: input.officeholderId,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
        workflowInstanceId: input.workflowInstanceId,
        stepInstanceId: input.stepInstanceId,
        correlationId: input.correlationId,
        metadata: input.metadata ?? {},
        publicVisibility: input.publicVisibility ?? CaseEventPublicVisibility.INTERNAL,
      },
    });
  }

  async listOfficialTimeline(caseId: string, limit = 50): Promise<CaseEvent[]> {
    await this.assertCaseExists(caseId);

    return this.prisma.caseEvent.findMany({
      where: { caseId },
      orderBy: { occurredAt: 'asc' },
      take: limit,
    });
  }

  async listApplicantVisibleTimeline(caseId: string, limit = 50): Promise<CaseEvent[]> {
    await this.assertCaseExists(caseId);

    return this.prisma.caseEvent.findMany({
      where: {
        caseId,
        publicVisibility: CaseEventPublicVisibility.APPLICANT_VISIBLE,
        eventType: {
          notIn: [CaseEventType.SAFE_HALT],
        },
      },
      orderBy: { occurredAt: 'asc' },
      take: limit,
    });
  }

  async listSafeHaltApplicantEvents(caseId: string): Promise<CaseEvent[]> {
    return this.prisma.caseEvent.findMany({
      where: {
        caseId,
        eventType: CaseEventType.SAFE_HALT,
        publicVisibility: CaseEventPublicVisibility.APPLICANT_VISIBLE,
      },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async reconstructOperationalSequence(caseId: string): Promise<CaseEvent[]> {
    return this.listOfficialTimeline(caseId, 500);
  }

  updateEvent(): Promise<never> {
    return Promise.reject(
      new BadRequestException('Case events are append-only and cannot be updated'),
    );
  }

  deleteEvent(): Promise<never> {
    return Promise.reject(
      new BadRequestException('Case events are append-only and cannot be deleted'),
    );
  }

  private async assertCaseExists(caseId: string): Promise<void> {
    const exists = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }
}
