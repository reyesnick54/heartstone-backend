import { Injectable, NotFoundException } from '@nestjs/common';
import { DashboardDefinitionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

export interface CreateDashboardDefinitionInput {
  institutionId: string;
  code: string;
  name: string;
  description?: string;
}

export interface CreateDashboardVersionInput {
  dashboardDefinitionId: string;
  layoutConfig?: Record<string, unknown>;
}

@Injectable()
export class DashboardDefinitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async findById(id: string) {
    const dashboard = await this.prisma.dashboardDefinition.findUnique({
      where: { id },
      include: { versions: true },
    });
    if (!dashboard) {
      throw new NotFoundException(`Dashboard definition ${id} not found`);
    }
    return dashboard;
  }

  async createDefinition(input: CreateDashboardDefinitionInput) {
    this.boundary.rejectDashboardAuthorityFields(input as unknown as Record<string, unknown>);
    this.boundary.assertDashboardCannotCreateAuthority(false);
    return this.prisma.dashboardDefinition.create({
      data: {
        institutionId: input.institutionId,
        code: input.code,
        name: input.name,
        description: input.description,
        status: DashboardDefinitionStatus.DRAFT,
      },
    });
  }

  async createVersion(input: CreateDashboardVersionInput) {
    const dashboard = await this.findById(input.dashboardDefinitionId);
    const nextVersion =
      (dashboard.versions.length > 0 ? Math.max(...dashboard.versions.map((v) => v.versionNumber)) : 0) + 1;
    return this.prisma.dashboardVersion.create({
      data: {
        dashboardDefinitionId: input.dashboardDefinitionId,
        versionNumber: nextVersion,
        layoutConfig: (input.layoutConfig ?? {}) as Prisma.InputJsonValue,
        status: DashboardDefinitionStatus.DRAFT,
      },
    });
  }
}
