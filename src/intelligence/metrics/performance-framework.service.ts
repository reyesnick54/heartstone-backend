import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

export interface CreatePerformanceFrameworkInput {
  institutionId: string;
  code: string;
  name: string;
  description?: string;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
}

@Injectable()
export class PerformanceFrameworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async findById(id: string) {
    const framework = await this.prisma.performanceFramework.findUnique({
      where: { id },
      include: { metrics: true },
    });
    if (!framework) {
      throw new NotFoundException(`Performance framework ${id} not found`);
    }
    return framework;
  }

  async createFramework(input: CreatePerformanceFrameworkInput) {
    this.boundary.assertStrategicProjectNotAuthorityProgram();
    return this.prisma.performanceFramework.create({
      data: {
        institutionId: input.institutionId,
        code: input.code,
        name: input.name,
        description: input.description,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
      },
    });
  }
}
