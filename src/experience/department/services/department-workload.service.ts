import { Injectable } from '@nestjs/common';
import { CaseStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { DepartmentWorkloadResponseDto } from '../dto/department-workload-response.dto';
import { DepartmentAccessService } from './department-access.service';
import { DepartmentCaseQueryService } from './department-case-query.service';
import { DepartmentMetricsFreshnessService } from './department-metrics-freshness.service';

@Injectable()
export class DepartmentWorkloadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DepartmentAccessService,
    private readonly caseQuery: DepartmentCaseQueryService,
    private readonly freshnessService: DepartmentMetricsFreshnessService,
  ) {}

  async buildWorkload(
    actor: ActorContext,
    departmentId: string,
  ): Promise<DepartmentWorkloadResponseDto> {
    const context = await this.accessService.resolveManagementContext(actor, departmentId);
    const calculatedAt = new Date();

    const statusBreakdown = await this.prisma.case.groupBy({
      by: ['status'],
      where: this.caseQuery.departmentCaseWhere(departmentId),
      _count: { _all: true },
    });

    const [
      unassignedWorkload,
      casesAwaitingReview,
      casesAwaitingApplicantAction,
      casesAwaitingExternalDependency,
      decisionReadyCases,
      officerWorkloadDistribution,
    ] = await Promise.all([
      this.caseQuery.countUnassignedWorkload(departmentId),
      this.caseQuery.countCasesAwaitingReview(departmentId),
      this.caseQuery.countCasesAwaitingApplicantAction(departmentId),
      this.caseQuery.countCasesAwaitingExternalDependency(departmentId),
      this.caseQuery.countDecisionReadyCases(departmentId),
      this.caseQuery.getOfficerWorkloadDistribution(departmentId),
    ]);

    const totalOpenCases = statusBreakdown
      .filter(
        (entry) => entry.status !== CaseStatus.CLOSED && entry.status !== CaseStatus.WITHDRAWN,
      )
      .reduce((sum, entry) => sum + entry._count._all, 0);

    return {
      generatedAt: calculatedAt.toISOString(),
      departmentId: context.departmentId,
      departmentName: context.departmentName,
      totalCases: statusBreakdown.reduce((sum, entry) => sum + entry._count._all, 0),
      totalOpenCases,
      statusBreakdown: statusBreakdown.map((entry) => ({
        status: entry.status,
        count: entry._count._all,
      })),
      unassignedWorkload,
      casesAwaitingReview,
      casesAwaitingApplicantAction,
      casesAwaitingExternalDependency,
      decisionReadyCases,
      officerWorkloadDistribution,
      metricsFreshness: this.freshnessService.buildFreshness(calculatedAt),
      aggregateDoesNotCreateCaseDisposition: true,
      authorityDisclaimer: context.authorityDisclaimer,
    };
  }
}
