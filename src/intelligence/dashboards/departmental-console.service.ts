import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

@Injectable()
export class DepartmentalConsoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async getDepartmentalView(institutionId: string, dashboardCode: string) {
    this.boundary.assertDepartmentalConsoleNotDisposition();
    this.boundary.assertViewingAnalyticsNotDelegation();

    const dashboard = await this.prisma.dashboardDefinition.findUnique({
      where: { institutionId_code: { institutionId, code: dashboardCode } },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: {
            widgets: { orderBy: { sortOrder: 'asc' } },
            indicators: true,
          },
        },
      },
    });

    if (!dashboard) {
      throw new NotFoundException(`Departmental console ${dashboardCode} not found`);
    }

    return {
      dashboard,
      disclaimer:
        'Departmental console views support operational awareness and do not confer case disposition authority.',
    };
  }
}
