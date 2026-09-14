import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RedressRouteCategory, RedressRouteVersionStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateRouteDefinitionInput {
  code: string;
  name: string;
  category: RedressRouteCategory;
  institutionId?: string;
  jurisdictionId?: string;
  description?: string;
}

export interface CreateRouteVersionInput {
  routeDefinitionId: string;
  versionNumber: number;
  filingDeadlineDays?: number;
  permitsDeadlineExtension?: boolean;
  requiresIndependence?: boolean;
  automaticStayOnFiling?: boolean;
  permitsSubstantiveChange?: boolean;
  permitsNonSubstantiveCorrection?: boolean;
  reviewFunctionAuthorityRecordId?: string;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  configuration?: Record<string, unknown>;
}

export interface ListApplicableRoutesInput {
  category?: RedressRouteCategory;
  institutionId?: string;
  jurisdictionId?: string;
  matterTypeCode?: string;
}

@Injectable()
export class RedressRouteCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async createDefinition(input: CreateRouteDefinitionInput) {
    return this.prisma.redressRouteDefinition.create({
      data: {
        code: input.code,
        name: input.name,
        category: input.category,
        institutionId: input.institutionId,
        jurisdictionId: input.jurisdictionId,
        description: input.description,
      },
    });
  }

  async createVersion(input: CreateRouteVersionInput) {
    const definition = await this.prisma.redressRouteDefinition.findUnique({
      where: { id: input.routeDefinitionId },
    });

    if (!definition) {
      throw new NotFoundException(`RedressRouteDefinition ${input.routeDefinitionId} not found`);
    }

    return this.prisma.redressRouteVersion.create({
      data: {
        routeDefinitionId: input.routeDefinitionId,
        versionNumber: input.versionNumber,
        status: RedressRouteVersionStatus.DRAFT,
        filingDeadlineDays: input.filingDeadlineDays,
        permitsDeadlineExtension: input.permitsDeadlineExtension ?? false,
        requiresIndependence: input.requiresIndependence ?? false,
        automaticStayOnFiling: input.automaticStayOnFiling ?? false,
        permitsSubstantiveChange: input.permitsSubstantiveChange ?? true,
        permitsNonSubstantiveCorrection: input.permitsNonSubstantiveCorrection ?? false,
        reviewFunctionAuthorityRecordId: input.reviewFunctionAuthorityRecordId,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        configuration: (input.configuration ?? {}) as Prisma.InputJsonValue,
      },
      include: { routeDefinition: true },
    });
  }

  async activateVersion(routeVersionId: string) {
    const version = await this.prisma.redressRouteVersion.findUnique({
      where: { id: routeVersionId },
    });

    if (!version) {
      throw new NotFoundException(`RedressRouteVersion ${routeVersionId} not found`);
    }

    await this.prisma.redressRouteVersion.updateMany({
      where: {
        routeDefinitionId: version.routeDefinitionId,
        status: RedressRouteVersionStatus.ACTIVE,
      },
      data: { status: RedressRouteVersionStatus.SUPERSEDED },
    });

    return this.prisma.redressRouteVersion.update({
      where: { id: routeVersionId },
      data: {
        status: RedressRouteVersionStatus.ACTIVE,
        effectiveFrom: version.effectiveFrom ?? new Date(),
      },
      include: { routeDefinition: true },
    });
  }

  async findVersionById(routeVersionId: string) {
    const version = await this.prisma.redressRouteVersion.findUnique({
      where: { id: routeVersionId },
      include: {
        routeDefinition: true,
        eligibleMatters: true,
        grounds: { orderBy: { sortOrder: 'asc' } },
        remedyDefinitions: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!version) {
      throw new NotFoundException(`RedressRouteVersion ${routeVersionId} not found`);
    }

    return version;
  }

  async assertActiveVersion(routeVersionId: string) {
    const version = await this.findVersionById(routeVersionId);

    if (version.status !== RedressRouteVersionStatus.ACTIVE) {
      throw new BadRequestException('Route version is not active and cannot accept filings');
    }

    return version;
  }

  async listApplicableRoutes(input: ListApplicableRoutesInput = {}) {
    const versions = await this.prisma.redressRouteVersion.findMany({
      where: {
        status: RedressRouteVersionStatus.ACTIVE,
        routeDefinition: {
          ...(input.category ? { category: input.category } : {}),
          ...(input.institutionId ? { institutionId: input.institutionId } : {}),
          ...(input.jurisdictionId ? { jurisdictionId: input.jurisdictionId } : {}),
        },
      },
      include: {
        routeDefinition: true,
        eligibleMatters: true,
      },
    });

    if (input.matterTypeCode) {
      return versions.filter((version) =>
        version.eligibleMatters.some((m) => m.matterTypeCode === input.matterTypeCode),
      );
    }

    return versions;
  }

  async addEligibleMatter(routeVersionId: string, matterTypeCode: string, description?: string) {
    await this.findVersionById(routeVersionId);

    return this.prisma.redressRouteEligibleMatter.create({
      data: {
        routeVersionId,
        matterTypeCode,
        description,
      },
    });
  }

  async addGround(
    routeVersionId: string,
    groundCode: string,
    label: string,
    description?: string,
    sortOrder = 0,
  ) {
    await this.findVersionById(routeVersionId);

    return this.prisma.redressRouteGround.create({
      data: {
        routeVersionId,
        groundCode,
        label,
        description,
        sortOrder,
      },
    });
  }
}
