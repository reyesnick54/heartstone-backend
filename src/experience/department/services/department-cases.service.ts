import { Injectable } from '@nestjs/common';
import { CaseAssignmentStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { DepartmentCasesResponseDto } from '../dto/department-cases-response.dto';
import { DepartmentAccessService } from './department-access.service';
import { DepartmentCaseQueryService } from './department-case-query.service';
import { DepartmentMetricsFreshnessService } from './department-metrics-freshness.service';

@Injectable()
export class DepartmentCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DepartmentAccessService,
    private readonly caseQuery: DepartmentCaseQueryService,
    private readonly freshnessService: DepartmentMetricsFreshnessService,
  ) {}

  async buildCasesView(
    actor: ActorContext,
    departmentId: string,
  ): Promise<DepartmentCasesResponseDto> {
    const context = await this.accessService.resolveManagementContext(actor, departmentId);
    const calculatedAt = new Date();

    const cases = await this.prisma.case.findMany({
      where: this.caseQuery.departmentCaseWhere(departmentId),
      include: {
        governmentService: { select: { publicName: true, code: true } },
        currentCaseManagerOfficeholder: { select: { id: true, name: true } },
        assignments: {
          where: { status: CaseAssignmentStatus.ACTIVE },
          select: {
            assigneeOfficeholderId: true,
            assigneeIdentityId: true,
            assignmentRole: true,
          },
        },
      },
      orderBy: { openedAt: 'desc' },
      take: 200,
    });

    const assigneeOfficeholderIds = [
      ...new Set(
        cases.flatMap((caseRecord) =>
          caseRecord.assignments
            .map((assignment) => assignment.assigneeOfficeholderId)
            .filter((id): id is string => id !== null),
        ),
      ),
    ];

    const assigneeOfficeholders =
      assigneeOfficeholderIds.length > 0
        ? await this.prisma.officeholder.findMany({
            where: { id: { in: assigneeOfficeholderIds } },
            select: { id: true, name: true },
          })
        : [];
    const assigneeById = new Map(
      assigneeOfficeholders.map((officeholder) => [officeholder.id, officeholder]),
    );

    return {
      generatedAt: calculatedAt.toISOString(),
      departmentId: context.departmentId,
      departmentName: context.departmentName,
      totalCount: cases.length,
      items: cases.map((caseRecord) => ({
        caseId: caseRecord.id,
        caseNumber: caseRecord.caseNumber,
        status: caseRecord.status,
        serviceName: caseRecord.governmentService.publicName,
        serviceCode: caseRecord.governmentService.code,
        openedAt: caseRecord.openedAt.toISOString(),
        caseManager: caseRecord.currentCaseManagerOfficeholder
          ? {
              officeholderId: caseRecord.currentCaseManagerOfficeholder.id,
              name: caseRecord.currentCaseManagerOfficeholder.name,
            }
          : null,
        activeAssignees: caseRecord.assignments.flatMap((assignment) => {
          const officeholderId = assignment.assigneeOfficeholderId;
          if (!officeholderId) {
            return [];
          }

          const officeholder = assigneeById.get(officeholderId);
          return [
            {
              officeholderId,
              name: officeholder?.name ?? 'Unknown',
              assignmentRole: assignment.assignmentRole,
            },
          ];
        }),
      })),
      aggregateDoesNotCreateCaseDisposition: true,
      metricsFreshness: this.freshnessService.buildFreshness(calculatedAt),
      authorityDisclaimer: context.authorityDisclaimer,
    };
  }
}
