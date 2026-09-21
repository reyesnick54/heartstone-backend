import { Injectable, NotFoundException } from '@nestjs/common';
import { CaseAssignmentStatus, CaseWorkflowStepInstanceStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import {
  OfficialCaseDetailResponseDto,
  OfficialCaseListItemDto,
  OfficialCasesListResponseDto,
} from '../dto/official-cases-response.dto';
import { type ResolvedOfficialContext } from '../types/official-context.types';
import { OfficialScopeService } from './official-scope.service';

@Injectable()
export class OfficialCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: OfficialScopeService,
  ) {}

  async listCases(context: ResolvedOfficialContext): Promise<OfficialCasesListResponseDto> {
    const where = this.scopeService.buildCaseScopeFilter(context);

    const cases = await this.prisma.case.findMany({
      where,
      include: {
        governmentService: { select: { publicName: true } },
        responsibleDepartment: { select: { name: true } },
        currentCaseManagerOfficeholder: { select: { name: true } },
        assignments: {
          where: { status: CaseAssignmentStatus.ACTIVE },
          include: { case: false },
        },
      },
      orderBy: { openedAt: 'desc' },
      take: 100,
    });

    const items: OfficialCaseListItemDto[] = cases.map((caseRecord) => {
      const access = this.scopeService.evaluateCaseAccess(context.scope, {
        id: caseRecord.id,
        responsibleDepartmentId: caseRecord.responsibleDepartmentId,
        responsibleInstitutionId: caseRecord.responsibleInstitutionId,
        currentCaseManagerOfficeholderId: caseRecord.currentCaseManagerOfficeholderId,
        assignments: caseRecord.assignments,
      });

      const activeAssignment = caseRecord.assignments.find(
        (assignment) => assignment.assigneeIdentityId === context.identityId,
      );

      return {
        caseId: caseRecord.id,
        caseNumber: caseRecord.caseNumber,
        serviceName: caseRecord.governmentService.publicName,
        status: caseRecord.status,
        priority: caseRecord.priority,
        departmentName: caseRecord.responsibleDepartment.name,
        accessKind: access.accessKind,
        assignedOfficeholderName: activeAssignment
          ? (caseRecord.currentCaseManagerOfficeholder?.name ?? null)
          : null,
        openedAt: caseRecord.openedAt.toISOString(),
      };
    });

    return { items, totalCount: items.length };
  }

  async getCaseDetail(
    context: ResolvedOfficialContext,
    caseId: string,
  ): Promise<OfficialCaseDetailResponseDto> {
    await this.scopeService.assertCaseAccess(context, caseId);

    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        governmentService: { select: { publicName: true } },
        responsibleDepartment: { select: { name: true } },
        responsibleInstitution: { select: { name: true } },
        currentCaseManagerOfficeholder: { select: { id: true, name: true } },
        assignments: { where: { status: CaseAssignmentStatus.ACTIVE } },
        workflowInstance: {
          include: {
            stepInstances: {
              where: {
                status: {
                  in: [
                    CaseWorkflowStepInstanceStatus.PENDING,
                    CaseWorkflowStepInstanceStatus.ACTIVE,
                    CaseWorkflowStepInstanceStatus.WAITING_APPLICANT,
                    CaseWorkflowStepInstanceStatus.WAITING_EXTERNAL,
                  ],
                },
              },
              include: { workflowStepDefinition: true },
            },
          },
        },
      },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }

    const access = this.scopeService.evaluateCaseAccess(context.scope, {
      id: caseRecord.id,
      responsibleDepartmentId: caseRecord.responsibleDepartmentId,
      responsibleInstitutionId: caseRecord.responsibleInstitutionId,
      currentCaseManagerOfficeholderId: caseRecord.currentCaseManagerOfficeholderId,
      assignments: caseRecord.assignments,
    });

    return {
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      status: caseRecord.status,
      priority: caseRecord.priority,
      serviceName: caseRecord.governmentService.publicName,
      departmentName: caseRecord.responsibleDepartment.name,
      institutionName: caseRecord.responsibleInstitution.name,
      accessKind: access.accessKind,
      caseManagerOfficeholderId: caseRecord.currentCaseManagerOfficeholder?.id ?? null,
      caseManagerName: caseRecord.currentCaseManagerOfficeholder?.name ?? null,
      activeWorkflowSteps: (caseRecord.workflowInstance?.stepInstances ?? []).map((step) => ({
        stepKey: step.workflowStepDefinition.stepKey,
        stepLabel: step.workflowStepDefinition.label,
        status: step.status,
        stepType: step.workflowStepDefinition.stepType,
      })),
      openedAt: caseRecord.openedAt.toISOString(),
      assignmentDoesNotImplyAuthority: true,
    };
  }
}
