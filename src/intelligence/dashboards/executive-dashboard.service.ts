import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

@Injectable()
export class ExecutiveDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async getExecutiveView(institutionId: string, dashboardCode: string) {
    this.boundary.assertExecutiveDashboardNotCommand();
    this.boundary.assertDashboardViewNotAuthority();
    this.boundary.assertAccessNotAuthority();

    const dashboard = await this.prisma.dashboardDefinition.findUnique({
      where: { institutionId_code: { institutionId, code: dashboardCode } },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: {
            indicators: {
              include: {
                projections: {
                  orderBy: { computedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!dashboard) {
      throw new NotFoundException(`Executive dashboard ${dashboardCode} not found`);
    }

    return {
      dashboard,
      disclaimer:
        'Executive dashboard projections are informational and do not constitute command authority or official decisions.',
    };
  }
}
