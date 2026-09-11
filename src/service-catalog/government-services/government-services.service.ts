import { Injectable, NotFoundException } from '@nestjs/common';
import {
  GovernmentService,
  GovernmentServiceVersion,
  GovernmentServiceVersionStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogValidationService } from '../common/service-catalog-validation.service';
import { CreateGovernmentServiceDto } from './dto/create-government-service.dto';
import { CreateGovernmentServiceVersionDto } from './dto/create-government-service-version.dto';
import { QueryGovernmentServicesDto } from './dto/query-government-services.dto';
import { UpdateGovernmentServiceDto } from './dto/update-government-service.dto';

@Injectable()
export class GovernmentServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServiceCatalogValidationService,
  ) {}

  async create(dto: CreateGovernmentServiceDto): Promise<GovernmentService> {
    if (dto.institutionId) {
      const institution = await this.prisma.institution.findUnique({
        where: { id: dto.institutionId },
      });
      if (!institution) {
        throw new NotFoundException(`Institution ${dto.institutionId} not found`);
      }
    }

    return this.prisma.governmentService.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        institutionId: dto.institutionId,
        status: dto.status,
      },
    });
  }

  async findAll(query: QueryGovernmentServicesDto): Promise<GovernmentService[]> {
    const where: Prisma.GovernmentServiceWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.institutionId) {
      where.institutionId = query.institutionId;
    }

    return this.prisma.governmentService.findMany({
      where,
      orderBy: [{ code: 'asc' }],
    });
  }

  async findOne(id: string): Promise<GovernmentService> {
    const service = await this.prisma.governmentService.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Government service ${id} not found`);
    }
    return service;
  }

  async update(id: string, dto: UpdateGovernmentServiceDto): Promise<GovernmentService> {
    await this.findOne(id);
    return this.prisma.governmentService.update({
      where: { id },
      data: dto,
    });
  }

  async createVersion(
    serviceId: string,
    dto: CreateGovernmentServiceVersionDto,
  ): Promise<GovernmentServiceVersion> {
    await this.findOne(serviceId);

    return this.prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: serviceId,
        versionLabel: dto.versionLabel,
        status: dto.status ?? GovernmentServiceVersionStatus.DRAFT,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
        relatedServiceCodes: dto.relatedServiceCodes ?? [],
        dependencyCodes: dto.dependencyCodes ?? [],
        publishedAt:
          dto.status === GovernmentServiceVersionStatus.PUBLISHED ? new Date() : undefined,
      },
    });
  }

  async getCurrentPublishedVersion(serviceId: string): Promise<GovernmentServiceVersion | null> {
    const now = new Date();
    return this.prisma.governmentServiceVersion.findFirst({
      where: {
        governmentServiceId: serviceId,
        status: GovernmentServiceVersionStatus.PUBLISHED,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      orderBy: [{ effectiveFrom: 'desc' }],
      include: {
        eligibilityRules: {
          where: { status: 'ACTIVE' },
          orderBy: [{ priority: 'asc' }],
        },
      },
    });
  }

  async getVersionById(versionId: string) {
    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: versionId },
      include: {
        eligibilityRules: {
          where: { status: 'ACTIVE' },
          orderBy: [{ priority: 'asc' }],
        },
      },
    });
    if (!version) {
      throw new NotFoundException(`Government service version ${versionId} not found`);
    }
    return version;
  }

  async publishVersion(versionId: string): Promise<GovernmentServiceVersion> {
    const version = await this.getVersionById(versionId);

    await this.prisma.governmentServiceVersion.updateMany({
      where: {
        governmentServiceId: version.governmentServiceId,
        status: GovernmentServiceVersionStatus.PUBLISHED,
        id: { not: versionId },
      },
      data: { status: GovernmentServiceVersionStatus.SUPERSEDED },
    });

    return this.prisma.governmentServiceVersion.update({
      where: { id: versionId },
      data: {
        status: GovernmentServiceVersionStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }
}
