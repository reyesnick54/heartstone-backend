import { Injectable, NotFoundException } from '@nestjs/common';
import { GovernmentService } from '@prisma/client';
import {
  GovernmentService,
  GovernmentServiceVersion,
  GovernmentServiceVersionStatus,
  Prisma,
} from '@prisma/client';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { GovernmentService, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogValidationService } from '../common/service-catalog-validation.service';
import { CreateGovernmentServiceDto } from './dto/create-government-service.dto';
import { GovernmentServiceResponseDto } from './dto/government-service-response.dto';
import { CreateGovernmentServiceVersionDto } from './dto/create-government-service-version.dto';
import { QueryGovernmentServicesDto } from './dto/query-government-services.dto';
import { UpdateGovernmentServiceDto } from './dto/update-government-service.dto';

@Injectable()
export class GovernmentServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServiceCatalogValidationService,
  ) {}

  async create(dto: CreateGovernmentServiceDto): Promise<GovernmentServiceResponseDto> {
    await this.validation.assertInstitutionExists(dto.responsibleInstitutionId);

    const service = await this.prisma.governmentService.create({
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
        responsibleInstitutionId: dto.responsibleInstitutionId,
      },
    });

    return this.toResponse(service);
  }

  async findOne(id: string): Promise<GovernmentServiceResponseDto> {
    const service = await this.prisma.governmentService.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException(`GovernmentService "${id}" was not found`);
    }
    return this.toResponse(service);
  }

  async findAll(): Promise<GovernmentServiceResponseDto[]> {
    const services = await this.prisma.governmentService.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
    return services.map((service) => this.toResponse(service));
  }

  toResponse(service: GovernmentService): GovernmentServiceResponseDto {
    return {
      id: service.id,
      code: service.code,
      name: service.name,
      description: service.description,
      responsibleInstitutionId: service.responsibleInstitutionId,
      status: service.status,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
        institutionId: dto.institutionId,
        status: dto.status,
      },
    });
    await this.validation.ensureInstitutionExists(dto.responsibleInstitutionId);
    await this.validation.ensureDepartmentExistsForInstitution(
      dto.responsibleDepartmentId,
      dto.responsibleInstitutionId,
    );
    await this.validation.ensureServiceFamilyExists(dto.serviceFamilyId);

    try {
      return await this.prisma.governmentService.create({
        data: {
          code: dto.code,
          slug: dto.slug,
          officialName: dto.officialName,
          publicName: dto.publicName,
          summary: dto.summary,
          responsibleInstitutionId: dto.responsibleInstitutionId,
          responsibleDepartmentId: dto.responsibleDepartmentId,
          serviceFamilyId: dto.serviceFamilyId,
        },
      });
    } catch (error) {
      this.handleWriteError(error, dto.code, dto.slug);
    }
  }

  async findAll(query: QueryGovernmentServicesDto): Promise<GovernmentService[]> {
    const where: Prisma.GovernmentServiceWhereInput = {};

    if (query.responsibleInstitutionId !== undefined) {
      where.responsibleInstitutionId = query.responsibleInstitutionId;
    }

    if (query.responsibleDepartmentId !== undefined) {
      where.responsibleDepartmentId = query.responsibleDepartmentId;
    }

    if (query.serviceFamilyId !== undefined) {
      where.serviceFamilyId = query.serviceFamilyId;
    }

    return this.prisma.governmentService.findMany({
      where,
      orderBy: [{ officialName: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string): Promise<GovernmentService> {
    const record = await this.prisma.governmentService.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`Government service with id "${id}" was not found`);
    }

    return record;
  }

  async update(id: string, dto: UpdateGovernmentServiceDto): Promise<GovernmentService> {
    const existing = await this.findOne(id);

    const institutionId = dto.responsibleInstitutionId ?? existing.responsibleInstitutionId;

    if (dto.responsibleInstitutionId !== undefined) {
      await this.validation.ensureInstitutionExists(dto.responsibleInstitutionId);
    }

    if (dto.responsibleDepartmentId !== undefined) {
      await this.validation.ensureDepartmentExistsForInstitution(
        dto.responsibleDepartmentId,
        institutionId,
      );
    }

    if (dto.serviceFamilyId !== undefined) {
      await this.validation.ensureServiceFamilyExists(dto.serviceFamilyId);
    }

    return this.prisma.governmentService.update({
      where: { id },
      data: dto,
    });
  }

  private handleWriteError(error: unknown, code: string, slug: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const rawTarget = error.meta?.target;
      const target = Array.isArray(rawTarget)
        ? rawTarget.join(',')
        : typeof rawTarget === 'string'
          ? rawTarget
          : '';

      if (target.includes('code')) {
        throw new ConflictException(`Government service with code "${code}" already exists`);
      }

      if (target.includes('slug')) {
        throw new ConflictException(`Government service with slug "${slug}" already exists`);
      }

      throw new ConflictException('Government service with duplicate unique field already exists');
    }

    throw error;
  }
}
