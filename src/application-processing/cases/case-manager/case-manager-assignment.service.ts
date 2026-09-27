import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CaseEventType, CaseManagerAssignmentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { CaseEventsService } from '../case-events.service';
import { CASE_MANAGER_ASSIGNMENT_ROLE } from '../../../operational-lifecycle/operational-lifecycle.constants';
import { CaseManagerBoundaryService } from './case-manager-boundary.service';

export interface AssignCaseManagerInput {
  caseId: string;
  officeholderId: string;
  institutionId: string;
  departmentId: string;
  reason: string;
  effectiveFrom?: Date;
  assignedByIdentityId: string;
}

@Injectable()
export class CaseManagerAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseEvents: CaseEventsService,
    private readonly boundary: CaseManagerBoundaryService,
  ) {}

  async assign(input: AssignCaseManagerInput) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: input.caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case ${input.caseId} not found`);
    }

    if (
      caseRecord.responsibleInstitutionId !== input.institutionId ||
      caseRecord.responsibleDepartmentId !== input.departmentId
    ) {
      throw new BadRequestException(
        'Case manager assignment must match the case responsible institution and department scope',
      );
    }

    const effectiveFrom = input.effectiveFrom ?? new Date();

    return this.prisma.$transaction(async (tx) => {
      const active = await tx.caseManagerAssignment.findFirst({
        where: { caseId: input.caseId, status: CaseManagerAssignmentStatus.ACTIVE },
      });

      let assignment;
      let eventType: CaseEventType = CaseEventType.CASE_MANAGER_ASSIGNED;

      if (active) {
        if (active.officeholderId === input.officeholderId) {
          throw new BadRequestException('Officeholder is already the active case manager');
        }
        const replacement = await tx.caseManagerAssignment.create({
          data: {
            caseId: input.caseId,
            officeholderId: input.officeholderId,
            institutionId: input.institutionId,
            departmentId: input.departmentId,
            reason: input.reason,
            effectiveFrom,
            assignedByIdentityId: input.assignedByIdentityId,
            status: CaseManagerAssignmentStatus.ACTIVE,
          },
        });
        await tx.caseManagerAssignment.update({
          where: { id: active.id },
          data: {
            status: CaseManagerAssignmentStatus.SUPERSEDED,
            effectiveUntil: effectiveFrom,
            supersededById: replacement.id,
          },
        });
        assignment = replacement;
        eventType = CaseEventType.CASE_MANAGER_REASSIGNED;
      } else {
        assignment = await tx.caseManagerAssignment.create({
          data: {
            caseId: input.caseId,
            officeholderId: input.officeholderId,
            institutionId: input.institutionId,
            departmentId: input.departmentId,
            reason: input.reason,
            effectiveFrom,
            assignedByIdentityId: input.assignedByIdentityId,
          },
        });
      }

      await tx.case.update({
        where: { id: input.caseId },
        data: { currentCaseManagerOfficeholderId: input.officeholderId },
      });

      await tx.caseAssignment.create({
        data: {
          caseId: input.caseId,
          assigneeIdentityId: input.assignedByIdentityId,
          assigneeOfficeholderId: input.officeholderId,
          assignmentRole: CASE_MANAGER_ASSIGNMENT_ROLE,
          assignedAt: effectiveFrom,
        },
      });

      await this.caseEvents.record(
        input.caseId,
        eventType,
        {
          caseManagerAssignmentId: assignment.id,
          officeholderId: input.officeholderId,
          institutionId: input.institutionId,
          departmentId: input.departmentId,
          reason: input.reason,
          grantsDecisionAuthority: false,
          disclaimer: this.boundary.operationalDisclaimer(),
        },
        input.assignedByIdentityId,
      );

      return assignment;
    });
  }

  async getAssignmentHistory(caseId: string) {
    return this.prisma.caseManagerAssignment.findMany({
      where: { caseId },
      orderBy: { effectiveFrom: 'asc' },
    });
  }

  async getWorkloadByOfficeholder(filters?: {
    institutionId?: string;
    departmentId?: string;
  }): Promise<{ officeholderId: string; activeCaseCount: number }[]> {
    const where: Prisma.CaseManagerAssignmentWhereInput = {
      status: CaseManagerAssignmentStatus.ACTIVE,
      ...(filters?.institutionId ? { institutionId: filters.institutionId } : {}),
      ...(filters?.departmentId ? { departmentId: filters.departmentId } : {}),
    };

    const rows = await this.prisma.caseManagerAssignment.groupBy({
      by: ['officeholderId'],
      where,
      _count: { _all: true },
    });

    return rows.map((row) => ({
      officeholderId: row.officeholderId,
      activeCaseCount: row._count._all,
    }));
  }
}
