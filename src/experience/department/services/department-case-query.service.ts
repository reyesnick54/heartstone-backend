import { Injectable } from '@nestjs/common';
import {
  ApplicantInformationRequestStatus,
  CaseAssignmentStatus,
  CaseMilestoneStatus,
  CaseReferralStatus,
  CaseSlaClockStatus,
  CaseStatus,
  CaseWorkflowStepInstanceStatus,
  Prisma,
  WorkflowStepType,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

const OPEN_CASE_STATUSES: CaseStatus[] = [
  CaseStatus.RECEIVED,
  CaseStatus.INTAKE,
  CaseStatus.OPEN,
  CaseStatus.IN_PROGRESS,
  CaseStatus.COMPLETENESS_REVIEW,
  CaseStatus.WAITING_APPLICANT,
  CaseStatus.SUBSTANTIVE_REVIEW,
  CaseStatus.PENDING_EXTERNAL,
  CaseStatus.PENDING_INTERNAL,
  CaseStatus.REFERRAL_PENDING,
  CaseStatus.PROFESSIONAL_REVIEW,
  CaseStatus.INSPECTION,
  CaseStatus.DECISION_PENDING,
];

const COMPLETED_CASE_STATUSES: CaseStatus[] = [
  CaseStatus.DECIDED,
  CaseStatus.ISSUED,
  CaseStatus.CLOSED,
  CaseStatus.WITHDRAWN,
];

const REVIEW_STEP_TYPES = new Set<WorkflowStepType>([
  WorkflowStepType.SUBSTANTIVE_REVIEW,
  WorkflowStepType.PROFESSIONAL_REVIEW,
  WorkflowStepType.COMPLETENESS_REVIEW,
]);

@Injectable()
export class DepartmentCaseQueryService {
  constructor(private readonly prisma: PrismaService) {}

  departmentCaseWhere(departmentId: string): Prisma.CaseWhereInput {
    return { responsibleDepartmentId: departmentId };
  }

  async countApplicationsReceived(departmentId: string): Promise<number> {
    return this.prisma.application.count({
      where: {
        governmentService: { responsibleDepartmentId: departmentId },
      },
    });
  }

  async countOpenCases(departmentId: string): Promise<number> {
    return this.prisma.case.count({
      where: {
        responsibleDepartmentId: departmentId,
        status: { in: OPEN_CASE_STATUSES },
      },
    });
  }

  async countCompletedCases(departmentId: string): Promise<number> {
    return this.prisma.case.count({
      where: {
        responsibleDepartmentId: departmentId,
        status: { in: COMPLETED_CASE_STATUSES },
      },
    });
  }

  async countCasesAwaitingReview(departmentId: string): Promise<number> {
    return this.prisma.case.count({
      where: {
        responsibleDepartmentId: departmentId,
        workflowInstance: {
          stepInstances: {
            some: {
              status: {
                in: [CaseWorkflowStepInstanceStatus.PENDING, CaseWorkflowStepInstanceStatus.ACTIVE],
              },
              workflowStepDefinition: {
                stepType: { in: [...REVIEW_STEP_TYPES] },
              },
            },
          },
        },
      },
    });
  }

  async countCasesAwaitingApplicantAction(departmentId: string): Promise<number> {
    return this.prisma.case.count({
      where: {
        responsibleDepartmentId: departmentId,
        status: CaseStatus.WAITING_APPLICANT,
      },
    });
  }

  async countCasesAwaitingExternalDependency(departmentId: string): Promise<number> {
    return this.prisma.case.count({
      where: {
        responsibleDepartmentId: departmentId,
        OR: [
          { status: CaseStatus.PENDING_EXTERNAL },
          {
            referrals: {
              some: { status: CaseReferralStatus.PENDING },
            },
          },
        ],
      },
    });
  }

  async countDecisionReadyCases(departmentId: string): Promise<number> {
    return this.prisma.case.count({
      where: {
        responsibleDepartmentId: departmentId,
        status: CaseStatus.DECISION_PENDING,
      },
    });
  }

  async countCasesApproachingSla(departmentId: string): Promise<number> {
    return this.prisma.case.count({
      where: {
        responsibleDepartmentId: departmentId,
        milestones: {
          some: { status: CaseMilestoneStatus.AT_RISK },
        },
      },
    });
  }

  async countOverdueCases(departmentId: string): Promise<number> {
    return this.prisma.case.count({
      where: {
        responsibleDepartmentId: departmentId,
        OR: [
          { milestones: { some: { status: CaseMilestoneStatus.DELAYED } } },
          { slaClocks: { some: { status: CaseSlaClockStatus.BREACHED } } },
        ],
      },
    });
  }

  async countUnassignedWorkload(departmentId: string): Promise<number> {
    return this.prisma.case.count({
      where: {
        responsibleDepartmentId: departmentId,
        status: { in: OPEN_CASE_STATUSES },
        assignments: { none: { status: CaseAssignmentStatus.ACTIVE } },
        currentCaseManagerOfficeholderId: null,
      },
    });
  }

  async countInspectionBacklog(departmentId: string): Promise<number> {
    return this.prisma.inspectionRecord.count({
      where: {
        case: { responsibleDepartmentId: departmentId },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
    });
  }

  async getOfficerWorkloadDistribution(departmentId: string): Promise<
    {
      officeholderId: string;
      officeholderName: string;
      activeAssignmentCount: number;
    }[]
  > {
    const assignments = await this.prisma.caseAssignment.groupBy({
      by: ['assigneeOfficeholderId'],
      where: {
        status: CaseAssignmentStatus.ACTIVE,
        case: { responsibleDepartmentId: departmentId },
        assigneeOfficeholderId: { not: null },
      },
      _count: { _all: true },
    });

    const officeholderIds = assignments
      .map((assignment) => assignment.assigneeOfficeholderId)
      .filter((id): id is string => id !== null);

    if (officeholderIds.length === 0) {
      return [];
    }

    const officeholders = await this.prisma.officeholder.findMany({
      where: { id: { in: officeholderIds } },
      select: { id: true, name: true },
    });
    const officeholderById = new Map(
      officeholders.map((officeholder) => [officeholder.id, officeholder]),
    );

    return assignments
      .flatMap((assignment) => {
        const officeholderId = assignment.assigneeOfficeholderId;
        if (!officeholderId) {
          return [];
        }

        const officeholder = officeholderById.get(officeholderId);
        return [
          {
            officeholderId,
            officeholderName: officeholder?.name ?? 'Unknown',
            activeAssignmentCount: assignment._count._all,
          },
        ];
      })
      .sort((left, right) => right.activeAssignmentCount - left.activeAssignmentCount);
  }

  async countOutstandingInformationRequests(departmentId: string): Promise<number> {
    return this.prisma.applicantInformationRequest.count({
      where: {
        status: ApplicantInformationRequestStatus.ISSUED,
        applicationSubmission: {
          application: {
            case: { is: { responsibleDepartmentId: departmentId } },
          },
        },
      },
    });
  }
}
