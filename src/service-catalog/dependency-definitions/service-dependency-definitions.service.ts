import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ServiceDependencyDefinition } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogValidationService } from '../common/service-catalog-validation.service';
import {
  dependencyMetadataDoesNotTransferAuthority,
  isCurrentOperatingMetadata,
} from '../common/service-operating-metadata.util';
import { CreateServiceDependencyDefinitionDto } from './dto/create-service-dependency-definition.dto';
import { ServiceDependencyDefinitionResponseDto } from './dto/service-dependency-definition-response.dto';

@Injectable()
export class ServiceDependencyDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServiceCatalogValidationService,
  ) {}

  async create(
    dto: CreateServiceDependencyDefinitionDto,
  ): Promise<ServiceDependencyDefinitionResponseDto> {
    await this.validation.assertServiceVersionExists(dto.serviceVersionId);

    if (dto.authorityDependencyId) {
      const authorityDependency = await this.prisma.authorityDependency.findUnique({
        where: { id: dto.authorityDependencyId },
      });
      if (!authorityDependency) {
        throw new BadRequestException(
          `AuthorityDependency "${dto.authorityDependencyId}" was not found`,
        );
      }
    }

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
    this.validation.validateEffectivePeriod(effectiveFrom, effectiveUntil);

    const dependency = await this.prisma.serviceDependencyDefinition.create({
      data: {
        serviceVersionId: dto.serviceVersionId,
        dependencyType: dto.dependencyType,
        authorityDependencyId: dto.authorityDependencyId,
        name: dto.name,
        description: dto.description,
        externalEntityLabel: dto.externalEntityLabel,
        operationalNotes: dto.operationalNotes,
        effectiveFrom,
        effectiveUntil,
        status: dto.status,
      },
    });

    return this.toResponse(dependency);
  }

  async findOne(id: string): Promise<ServiceDependencyDefinitionResponseDto> {
    const dependency = await this.prisma.serviceDependencyDefinition.findUnique({ where: { id } });
    if (!dependency) {
      throw new NotFoundException(`ServiceDependencyDefinition "${id}" was not found`);
    }
    return this.toResponse(dependency);
  }

  async findByServiceVersion(
    serviceVersionId: string,
  ): Promise<ServiceDependencyDefinitionResponseDto[]> {
    const dependencies = await this.prisma.serviceDependencyDefinition.findMany({
      where: { serviceVersionId },
      orderBy: [{ dependencyType: 'asc' }, { effectiveFrom: 'desc' }],
    });
    return dependencies.map((dependency) => this.toResponse(dependency));
  }

  toResponse(
    dependency: ServiceDependencyDefinition,
    at: Date = new Date(),
  ): ServiceDependencyDefinitionResponseDto {
    const authorityState = dependencyMetadataDoesNotTransferAuthority();

    return {
      id: dependency.id,
      serviceVersionId: dependency.serviceVersionId,
      dependencyType: dependency.dependencyType,
      authorityDependencyId: dependency.authorityDependencyId,
      name: dependency.name,
      description: dependency.description,
      externalEntityLabel: dependency.externalEntityLabel,
      operationalNotes: dependency.operationalNotes,
      effectiveFrom: dependency.effectiveFrom,
      effectiveUntil: dependency.effectiveUntil,
      status: dependency.status,
      isCurrent: isCurrentOperatingMetadata(
        {
          status: dependency.status,
          effectiveFrom: dependency.effectiveFrom,
          effectiveUntil: dependency.effectiveUntil,
        },
        at,
      ),
      authorityTransferred: authorityState.authorityTransferred,
      metadataOnly: authorityState.metadataOnly,
      createdAt: dependency.createdAt,
      updatedAt: dependency.updatedAt,
    };
  }
}
