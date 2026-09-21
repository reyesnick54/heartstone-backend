import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  CaseAssignmentStatus,
  CaseMilestoneStatus,
  CaseWorkflowStepInstanceStatus,
  FunctionAssignmentStatus,
  IdentityOfficeholderLinkStatus,
  WorkflowStepType,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { DepartmentOfficersResponseDto } from '../dto/department-officers-response.dto';
import { DepartmentAccessService } from './department-access.service';
import { DepartmentMetricsFreshnessService } from './department-metrics-freshness.service';

const REVIEW_STEP_TYPES = new Set<WorkflowStepType>([
  WorkflowStepType.SUBSTANTIVE_REVIEW,
  WorkflowStepType.PROFESSIONAL_REVIEW,
  WorkflowStepType.COMPLETENESS_REVIEW,
]);

@Injectable()
export class DepartmentOfficersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DepartmentAccessService,
    private readonly freshnessService: DepartmentMetricsFreshnessService,
  ) {}

  async buildOfficersView(
    actor: ActorContext,
    departmentId: string,
  ): Promise<DepartmentOfficersResponseDto> {
    const context = await this.accessService.resolveManagementContext(actor, departmentId);
    const calculatedAt = new Date();

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.ACTIVE,
        office: { departmentId },
      },
      include: {
        officeholder: {
          include: {
            identityLinks: {
              where: { status: IdentityOfficeholderLinkStatus.ACTIVE },
              select: { identityId: true, status: true },
            },
            functionAuthorityAssignments: {
              where: {
                status: {
                  in: [FunctionAssignmentStatus.ACTIVE, FunctionAssignmentStatus.SUSPENDED],
                },
              },
              select: { status: true, functionAuthorityRecordId: true },
            },
          },
        },
        office: { select: { id: true, name: true, code: true } },
      },
    });

    const items = await Promise.all(
      appointments.map(async (appointment) => {
        const officeholder = appointment.officeholder;

        const [activeAssignmentCount, slaRiskAssignments, pendingReviews] = await Promise.all([
          this.prisma.caseAssignment.count({
            where: {
              assigneeOfficeholderId: officeholder.id,
              status: CaseAssignmentStatus.ACTIVE,
              case: { responsibleDepartmentId: departmentId },
            },
          }),
          this.prisma.caseAssignment.count({
            where: {
              assigneeOfficeholderId: officeholder.id,
              status: CaseAssignmentStatus.ACTIVE,
              case: {
                responsibleDepartmentId: departmentId,
                milestones: { some: { status: CaseMilestoneStatus.AT_RISK } },
              },
            },
          }),
          this.prisma.caseWorkflowStepInstance.count({
            where: {
              status: {
                in: [CaseWorkflowStepInstanceStatus.PENDING, CaseWorkflowStepInstanceStatus.ACTIVE],
              },
              workflowStepDefinition: { stepType: { in: [...REVIEW_STEP_TYPES] } },
              caseWorkflowInstance: {
                case: {
                  responsibleDepartmentId: departmentId,
                  OR: [
                    { currentCaseManagerOfficeholderId: officeholder.id },
                    {
                      assignments: {
                        some: {
                          assigneeOfficeholderId: officeholder.id,
                          status: CaseAssignmentStatus.ACTIVE,
                        },
                      },
                    },
                  ],
                },
              },
            },
          }),
        ]);

        const suspendedAssignment = officeholder.functionAuthorityAssignments.find(
          (assignment) => assignment.status === FunctionAssignmentStatus.SUSPENDED,
        );

        return {
          officeholderId: officeholder.id,
          officeholderName: officeholder.name,
          officeholderCode: officeholder.code,
          currentAppointment: {
            appointmentId: appointment.id,
            officeId: appointment.office.id,
            officeName: appointment.office.name,
            officeCode: appointment.office.code,
            status: appointment.status,
            effectiveFrom: appointment.effectiveFrom.toISOString(),
            effectiveUntil: appointment.effectiveUntil?.toISOString() ?? null,
          },
          activeAssignmentCount,
          slaRiskAssignments,
          pendingReviews,
          unavailableContext: suspendedAssignment
            ? {
                reason: 'FUNCTION_AUTHORITY_SUSPENDED',
                functionAuthorityRecordId: suspendedAssignment.functionAuthorityRecordId,
              }
            : null,
        };
      }),
    );

    return {
      generatedAt: calculatedAt.toISOString(),
      departmentId: context.departmentId,
      departmentName: context.departmentName,
      items,
      restrictedHrFieldsExcluded: true,
      metricsFreshness: this.freshnessService.buildFreshness(calculatedAt),
      authorityDisclaimer: context.authorityDisclaimer,
    };
  }
}
