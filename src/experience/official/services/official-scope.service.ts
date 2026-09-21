import { Injectable } from '@nestjs/common';
import { CaseAssignmentStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { OfficialCaseAccessDeniedException } from '../exceptions/official-experience.exceptions';
import {
  type CaseAccessEvaluation,
  type OfficialScope,
  type ResolvedOfficialContext,
} from '../types/official-context.types';

@Injectable()
export class OfficialScopeService {
  constructor(private readonly prisma: PrismaService) {}

  evaluateCaseAccess(
    scope: OfficialScope,
    caseRecord: {
      id: string;
      responsibleDepartmentId: string;
      responsibleInstitutionId: string;
      currentCaseManagerOfficeholderId: string | null;
      assignments: {
        assigneeIdentityId: string;
        assigneeOfficeholderId: string | null;
        status: CaseAssignmentStatus;
      }[];
    },
  ): CaseAccessEvaluation {
    if (!scope.departmentIds.includes(caseRecord.responsibleDepartmentId)) {
      return {
        allowed: false,
        accessKind: 'DENIED',
        reason: 'Case is outside your department scope',
      };
    }

    const activeAssignments = caseRecord.assignments.filter(
      (assignment) => assignment.status === CaseAssignmentStatus.ACTIVE,
    );

    const isAssignee = activeAssignments.some(
      (assignment) => assignment.assigneeIdentityId === scope.identityId,
    );
    if (isAssignee) {
      return {
        allowed: true,
        accessKind: 'ASSIGNED',
        reason: 'Case is assigned to you',
      };
    }

    if (
      caseRecord.currentCaseManagerOfficeholderId &&
      scope.officeholderIds.includes(caseRecord.currentCaseManagerOfficeholderId)
    ) {
      return {
        allowed: true,
        accessKind: 'CASE_MANAGER',
        reason: 'You are the case manager for this matter',
      };
    }

    const assignedToOther = activeAssignments.some(
      (assignment) => assignment.assigneeIdentityId !== scope.identityId,
    );
    if (assignedToOther) {
      return {
        allowed: false,
        accessKind: 'DENIED',
        reason: 'Case is assigned to another official',
      };
    }

    if (scope.departmentIds.includes(caseRecord.responsibleDepartmentId)) {
      return {
        allowed: true,
        accessKind: 'DEPARTMENT_POOL',
        reason: 'Unassigned case visible within your department pool',
      };
    }

    return {
      allowed: false,
      accessKind: 'DENIED',
      reason: 'Case is outside your institutional scope',
    };
  }

  buildCaseScopeFilter(context: ResolvedOfficialContext) {
    const { scope } = context;
    if (!context.technicalCapabilities.substantiveAccessAllowed) {
      return { id: { in: [] as string[] } };
    }

    return {
      responsibleDepartmentId: { in: scope.departmentIds },
      OR: [
        {
          assignments: {
            some: {
              status: CaseAssignmentStatus.ACTIVE,
              assigneeIdentityId: scope.identityId,
            },
          },
        },
        {
          currentCaseManagerOfficeholderId: { in: scope.officeholderIds },
        },
        {
          AND: [
            {
              assignments: {
                none: { status: CaseAssignmentStatus.ACTIVE },
              },
            },
            {
              responsibleDepartmentId: { in: scope.departmentIds },
            },
          ],
        },
      ],
    };
  }

  async assertCaseAccess(context: ResolvedOfficialContext, caseId: string): Promise<void> {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        assignments: {
          where: { status: CaseAssignmentStatus.ACTIVE },
          select: {
            assigneeIdentityId: true,
            assigneeOfficeholderId: true,
            status: true,
          },
        },
      },
    });

    if (!caseRecord) {
      throw new OfficialCaseAccessDeniedException(caseId);
    }

    const evaluation = this.evaluateCaseAccess(context.scope, caseRecord);
    if (!evaluation.allowed) {
      throw new OfficialCaseAccessDeniedException(caseId);
    }
  }
}
