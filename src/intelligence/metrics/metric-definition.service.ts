import { Injectable, NotFoundException } from '@nestjs/common';
import { MetricDefinitionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

export interface CreateMetricDefinitionInput {
  performanceFrameworkId: string;
  institutionId: string;
  code: string;
  name: string;
  description?: string;
  unit?: string;
}

export interface CreateMetricDefinitionVersionInput {
  metricDefinitionId: string;
  definitionConfig?: Record<string, unknown>;
  methodology?: string;
  limitations?: string;
  uncertaintyNotes?: string;
}

@Injectable()
export class MetricDefinitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async findById(id: string) {
    const metric = await this.prisma.metricDefinition.findUnique({
      where: { id },
      include: { versions: true, currentVersion: true },
    });
    if (!metric) {
      throw new NotFoundException(`Metric definition ${id} not found`);
    }
    return metric;
  }

  async createDefinition(input: CreateMetricDefinitionInput) {
    this.boundary.rejectClientMetricFields(input as unknown as Record<string, unknown>);
    return this.prisma.metricDefinition.create({
      data: {
        performanceFrameworkId: input.performanceFrameworkId,
        institutionId: input.institutionId,
        code: input.code,
        name: input.name,
        description: input.description,
        unit: input.unit,
        status: MetricDefinitionStatus.DRAFT,
      },
    });
  }

  async createVersion(input: CreateMetricDefinitionVersionInput) {
    const metric = await this.findById(input.metricDefinitionId);
    const nextVersion = (metric.versions.length > 0 ? Math.max(...metric.versions.map((v) => v.versionNumber)) : 0) + 1;
    return this.prisma.metricDefinitionVersion.create({
      data: {
        metricDefinitionId: input.metricDefinitionId,
        versionNumber: nextVersion,
        definitionConfig: (input.definitionConfig ?? {}) as Prisma.InputJsonValue,
        methodology: input.methodology,
        limitations: input.limitations,
        uncertaintyNotes: input.uncertaintyNotes,
      },
    });
  }
}
