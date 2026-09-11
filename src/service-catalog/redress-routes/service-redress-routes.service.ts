import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceRedressRoute } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogValidationService } from '../common/service-catalog-validation.service';
import {
  isCurrentOperatingMetadata,
  redressRouteDoesNotDecideAppeal,
} from '../common/service-operating-metadata.util';
import { CreateServiceRedressRouteDto } from './dto/create-service-redress-route.dto';
import { ServiceRedressRouteResponseDto } from './dto/service-redress-route-response.dto';

@Injectable()
export class ServiceRedressRoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServiceCatalogValidationService,
  ) {}

  async create(dto: CreateServiceRedressRouteDto): Promise<ServiceRedressRouteResponseDto> {
    await this.validation.assertServiceVersionExists(dto.serviceVersionId);
    if (dto.responsibleInstitutionId) {
      await this.validation.assertInstitutionExists(dto.responsibleInstitutionId);
    }
    if (dto.governingSourceId) {
      await this.validation.assertGoverningSourceExists(dto.governingSourceId);
    }

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
    this.validation.validateEffectivePeriod(effectiveFrom, effectiveUntil);

    const route = await this.prisma.serviceRedressRoute.create({
      data: {
        serviceVersionId: dto.serviceVersionId,
        routeType: dto.routeType,
        routeName: dto.routeName,
        description: dto.description,
        responsibleInstitutionId: dto.responsibleInstitutionId,
        deadlineDescription: dto.deadlineDescription,
        governingSourceId: dto.governingSourceId,
        independenceRequired: dto.independenceRequired ?? false,
        contactChannelMetadata: (dto.contactChannelMetadata ?? {}) as Prisma.InputJsonValue,
        effectiveFrom,
        effectiveUntil,
        status: dto.status,
      },
    });

    return this.toResponse(route);
  }

  async findOne(id: string): Promise<ServiceRedressRouteResponseDto> {
    const route = await this.prisma.serviceRedressRoute.findUnique({ where: { id } });
    if (!route) {
      throw new NotFoundException(`ServiceRedressRoute "${id}" was not found`);
    }
    return this.toResponse(route);
  }

  async findByServiceVersion(serviceVersionId: string): Promise<ServiceRedressRouteResponseDto[]> {
    const routes = await this.prisma.serviceRedressRoute.findMany({
      where: { serviceVersionId },
      orderBy: [{ routeType: 'asc' }, { effectiveFrom: 'desc' }],
    });
    return routes.map((route) => this.toResponse(route));
  }

  toResponse(route: ServiceRedressRoute, at: Date = new Date()): ServiceRedressRouteResponseDto {
    const decisionState = redressRouteDoesNotDecideAppeal(route.routeType);

    return {
      id: route.id,
      serviceVersionId: route.serviceVersionId,
      routeType: route.routeType,
      routeName: route.routeName,
      description: route.description,
      responsibleInstitutionId: route.responsibleInstitutionId,
      deadlineDescription: route.deadlineDescription,
      governingSourceId: route.governingSourceId,
      independenceRequired: route.independenceRequired,
      contactChannelMetadata: route.contactChannelMetadata as Record<string, unknown>,
      effectiveFrom: route.effectiveFrom,
      effectiveUntil: route.effectiveUntil,
      status: route.status,
      isCurrent: isCurrentOperatingMetadata(
        {
          status: route.status,
          effectiveFrom: route.effectiveFrom,
          effectiveUntil: route.effectiveUntil,
        },
        at,
      ),
      decided: decisionState.decided,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt,
    };
  }
}
