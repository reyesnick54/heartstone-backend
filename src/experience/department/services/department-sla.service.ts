import { Injectable } from '@nestjs/common';
import { CaseMilestoneStatus, CaseSlaClockStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { DepartmentSlaResponseDto } from '../dto/department-sla-response.dto';
import { DepartmentAccessService } from './department-access.service';
import { DepartmentCaseQueryService } from './department-case-query.service';
import { DepartmentMetricsFreshnessService } from './department-metrics-freshness.service';

@Injectable()
export class DepartmentSlaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DepartmentAccessService,
    private readonly caseQuery: DepartmentCaseQueryService,
    private readonly freshnessService: DepartmentMetricsFreshnessService,
  ) {}

  async buildSlaView(actor: ActorContext, departmentId: string): Promise<DepartmentSlaResponseDto> {
    const context = await this.accessService.resolveManagementContext(actor, departmentId);
    const calculatedAt = new Date();

    const [approachingSla, overdueCases, clocks, milestones] = await Promise.all([
      this.caseQuery.countCasesApproachingSla(departmentId),
      this.caseQuery.countOverdueCases(departmentId),
      this.prisma.caseSlaClock.findMany({
        where: {
          case: { responsibleDepartmentId: departmentId },
          status: { in: [CaseSlaClockStatus.RUNNING, CaseSlaClockStatus.BREACHED] },
        },
        include: {
          case: { select: { id: true, caseNumber: true } },
        },
        take: 100,
      }),
      this.prisma.caseMilestone.findMany({
        where: {
          case: { responsibleDepartmentId: departmentId },
          status: { in: [CaseMilestoneStatus.AT_RISK, CaseMilestoneStatus.DELAYED] },
        },
        include: {
          case: { select: { id: true, caseNumber: true } },
        },
        take: 100,
      }),
    ]);

    return {
      generatedAt: calculatedAt.toISOString(),
      departmentId: context.departmentId,
      departmentName: context.departmentName,
      casesApproachingSla: approachingSla,
      overdueCases,
      activeClocks: clocks.map((clock) => ({
        caseId: clock.case.id,
        caseNumber: clock.case.caseNumber,
        clockKey: clock.clockKey,
        status: clock.status,
        startedAt: clock.startedAt.toISOString(),
        pausedAt: clock.pausedAt?.toISOString() ?? null,
        completedAt: clock.completedAt?.toISOString() ?? null,
      })),
      atRiskMilestones: milestones.map((milestone) => ({
        caseId: milestone.case.id,
        caseNumber: milestone.case.caseNumber,
        milestoneName: milestone.name,
        status: milestone.status,
        targetDate: milestone.targetDate?.toISOString() ?? null,
        sourceSlaReference: milestone.sourceSlaReference,
      })),
      doesNotCalculateLegalConclusions: true,
      metricsFreshness: this.freshnessService.buildFreshness(calculatedAt),
      authorityDisclaimer: context.authorityDisclaimer,
    };
  }
}
