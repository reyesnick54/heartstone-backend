import { Injectable, NotFoundException } from '@nestjs/common';
import { type PerformanceFramework } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreatePerformanceFrameworkDto } from '../dto/create-performance-framework.dto';

@Injectable()
export class PerformanceFrameworkService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePerformanceFrameworkDto): Promise<PerformanceFramework> {
    return this.prisma.performanceFramework.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        institutionId: dto.institutionId,
        effectiveFrom: dto.effectiveFrom,
        effectiveUntil: dto.effectiveUntil,
      },
    });
  }

  async findById(id: string): Promise<PerformanceFramework> {
    const framework = await this.prisma.performanceFramework.findUnique({
      where: { id },
      include: { metrics: true },
    });
    if (!framework) {
      throw new NotFoundException(`Performance framework ${id} not found`);
    }
    return framework;
  }
}
