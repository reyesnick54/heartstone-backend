import { Injectable, NotFoundException } from '@nestjs/common';
import { ServiceVersion } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogValidationService } from '../common/service-catalog-validation.service';
import { CreateServiceVersionDto } from './dto/create-service-version.dto';
import { ServiceVersionResponseDto } from './dto/service-version-response.dto';

@Injectable()
export class ServiceVersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServiceCatalogValidationService,
  ) {}

  async create(dto: CreateServiceVersionDto): Promise<ServiceVersionResponseDto> {
    const governmentService = await this.prisma.governmentService.findUnique({
      where: { id: dto.governmentServiceId },
    });
    if (!governmentService) {
      throw new NotFoundException(`GovernmentService "${dto.governmentServiceId}" was not found`);
    }

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
    this.validation.validateEffectivePeriod(effectiveFrom, effectiveUntil);

    const version = await this.prisma.serviceVersion.create({
      data: {
        governmentServiceId: dto.governmentServiceId,
        versionLabel: dto.versionLabel,
        description: dto.description,
        dataClassification: dto.dataClassification,
        identityAssuranceExpectation: dto.identityAssuranceExpectation,
        sensitiveDataIndicator: dto.sensitiveDataIndicator ?? false,
        manualFallbackDescription: dto.manualFallbackDescription,
        manualFallbackReference: dto.manualFallbackReference,
        effectiveFrom,
        effectiveUntil,
      },
    });

    return this.toResponse(version);
  }

  async findOne(id: string): Promise<ServiceVersionResponseDto> {
    const version = await this.prisma.serviceVersion.findUnique({ where: { id } });
    if (!version) {
      throw new NotFoundException(`ServiceVersion "${id}" was not found`);
    }
    return this.toResponse(version);
  }

  async findByGovernmentService(governmentServiceId: string): Promise<ServiceVersionResponseDto[]> {
    const versions = await this.prisma.serviceVersion.findMany({
      where: { governmentServiceId },
      orderBy: [{ effectiveFrom: 'desc' }],
    });
    return versions.map((version) => this.toResponse(version));
  }

  toResponse(version: ServiceVersion): ServiceVersionResponseDto {
    return {
      id: version.id,
      governmentServiceId: version.governmentServiceId,
      versionLabel: version.versionLabel,
      status: version.status,
      description: version.description,
      dataClassification: version.dataClassification,
      identityAssuranceExpectation: version.identityAssuranceExpectation,
      sensitiveDataIndicator: version.sensitiveDataIndicator,
      manualFallbackDescription: version.manualFallbackDescription,
      manualFallbackReference: version.manualFallbackReference,
      effectiveFrom: version.effectiveFrom,
      effectiveUntil: version.effectiveUntil,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    };
  }
}
