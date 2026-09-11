import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  GovernmentService,
  GovernmentServiceVersion,
  GovernmentServiceVersionStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateGovernmentServiceInput {
  code: string;
  name: string;
  description?: string;
  institutionId?: string;
}

export interface CreateGovernmentServiceVersionInput {
  governmentServiceId: string;
  title: string;
  description?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
}

@Injectable()
export class GovernmentServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async createService(input: CreateGovernmentServiceInput): Promise<GovernmentService> {
    try {
      return await this.prisma.governmentService.create({
        data: {
          code: input.code,
          name: input.name,
          description: input.description,
          institutionId: input.institutionId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`GovernmentService with code "${input.code}" already exists`);
      }
      throw error;
    }
  }

  async createServiceVersion(
    input: CreateGovernmentServiceVersionInput,
  ): Promise<GovernmentServiceVersion> {
    const service = await this.prisma.governmentService.findUnique({
      where: { id: input.governmentServiceId },
    });

    if (!service) {
      throw new NotFoundException(`GovernmentService "${input.governmentServiceId}" was not found`);
    }

    const latest = await this.prisma.governmentServiceVersion.findFirst({
      where: { governmentServiceId: input.governmentServiceId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return this.prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: input.governmentServiceId,
        version: (latest?.version ?? 0) + 1,
        title: input.title,
        description: input.description,
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : null,
        effectiveUntil: input.effectiveUntil ? new Date(input.effectiveUntil) : null,
        status: GovernmentServiceVersionStatus.DRAFT,
      },
    });
  }

  async publishServiceVersion(id: string): Promise<GovernmentServiceVersion> {
    const version = await this.prisma.governmentServiceVersion.findUnique({ where: { id } });
    if (!version) {
      throw new NotFoundException(`GovernmentServiceVersion "${id}" was not found`);
    }

    return this.prisma.governmentServiceVersion.update({
      where: { id },
      data: {
        status: GovernmentServiceVersionStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  async findServiceVersion(id: string): Promise<GovernmentServiceVersion> {
    const version = await this.prisma.governmentServiceVersion.findUnique({ where: { id } });
    if (!version) {
      throw new NotFoundException(`GovernmentServiceVersion "${id}" was not found`);
    }
    return version;
  }
}
