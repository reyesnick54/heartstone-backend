import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { ACTIVE_REDRESS_MATTER_STATUSES } from '../../../redress/common/active-redress-matter-statuses.constants';
import { DepartmentAppealsResponseDto } from '../dto/department-appeals-response.dto';
import { DepartmentAccessService } from './department-access.service';
import { DepartmentMetricsFreshnessService } from './department-metrics-freshness.service';

@Injectable()
export class DepartmentAppealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DepartmentAccessService,
    private readonly freshnessService: DepartmentMetricsFreshnessService,
  ) {}

  async buildAppealsView(
    actor: ActorContext,
    departmentId: string,
  ): Promise<DepartmentAppealsResponseDto> {
    const context = await this.accessService.resolveManagementContext(actor, departmentId);
    const calculatedAt = new Date();

    const appeals = await this.prisma.redressMatter.findMany({
      where: {
        case: { responsibleDepartmentId: departmentId },
        status: { in: [...ACTIVE_REDRESS_MATTER_STATUSES] },
      },
      select: {
        id: true,
        redressMatterNumber: true,
        status: true,
        filedAt: true,
        caseId: true,
        case: {
          select: {
            caseNumber: true,
            governmentService: { select: { publicName: true } },
          },
        },
      },
      orderBy: { filedAt: 'desc' },
      take: 100,
    });

    return {
      generatedAt: calculatedAt.toISOString(),
      departmentId: context.departmentId,
      departmentName: context.departmentName,
      activeAppealsCount: appeals.length,
      items: appeals.map((appeal) => ({
        redressMatterId: appeal.id,
        redressMatterNumber: appeal.redressMatterNumber,
        status: appeal.status,
        filedAt: appeal.filedAt.toISOString(),
        caseId: appeal.caseId,
        caseNumber: appeal.case?.caseNumber ?? null,
        serviceName: appeal.case?.governmentService.publicName ?? null,
      })),
      restrictedApplicantDetailsExcluded: true,
      metricsFreshness: this.freshnessService.buildFreshness(calculatedAt),
      authorityDisclaimer: context.authorityDisclaimer,
    };
  }
}
