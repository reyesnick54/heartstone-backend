import { createHash } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  GovernmentServicePublicAvailability,
  Prisma,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InformationOnlyNotStartableException } from '../common/information-only-not-startable.exception';
import {
  APPLICATION_STARTABLE_AVAILABILITY,
  PUBLIC_NONBINDING_DISCLAIMER,
  PUBLIC_PRESENTATION_MATURITY,
  PUBLIC_START_PACKAGE_DISCLAIMER,
  PUBLICLY_PRESENTABLE_AVAILABILITY,
} from '../common/public-discovery.constants';
import {
  assertNoRestrictedFields,
  isApplicationCapableAvailability,
  mapPublicServiceDetail,
  mapPublicServiceSummary,
  mapServiceStartPackage,
  type PublicEligibilityResult,
  type PublicGovernmentServiceVersionRecord,
  type PublicServiceDetail,
  type PublicServiceSummary,
  type ServiceStartPackage,
} from '../common/public-service.mapper';
import { ServiceCatalogCacheService } from '../common/service-catalog-cache.service';
import { VersionSupersededException } from '../common/version-superseded.exception';
import { MatchPublicServicesDto } from './dto/match-public-services.dto';
import { PublicServiceEligibilityDto } from './dto/public-service-eligibility.dto';
import { QueryPublicServicesDto } from './dto/query-public-services.dto';
import { QueryServiceStartPackageDto } from './dto/query-service-start-package.dto';

const publicVersionInclude = {
  fees: true,
  eligibilityRules: true,
  checklistItems: true,
  outputs: true,
  redressRoutes: true,
  formDefinition: true,
  formVersion: true,
  applicantCategories: true,
  functionMappings: {
    include: {
      functionAuthorityRecord: {
        select: {
          classification: true,
          name: true,
        },
      },
    },
  },
  governmentService: {
    include: {
      responsibleDepartment: true,
      serviceFamily: true,
    },
  },
} satisfies Prisma.GovernmentServiceVersionInclude;

@Injectable()
export class PublicServiceDiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: ServiceCatalogCacheService,
  ) {}

  async listServices(query: QueryPublicServicesDto): Promise<{
    items: PublicServiceSummary[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const cacheKey = this.cacheService.buildListCacheKey(this.hashQuery(query));
    const cached = await this.cacheService.get<{
      items: PublicServiceSummary[];
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }>(cacheKey);

    if (cached) {
      cached.items.forEach((item) => {
        assertNoRestrictedFields(item as unknown as Record<string, unknown>);
      });
      return cached;
    }

    const versionWhere = this.buildPublicVersionWhere(query);
    const matchingServices = await this.prisma.governmentService.findMany({
      where: {
        ...(query.family ? { serviceFamily: { code: query.family } } : {}),
        ...(query.departmentId ? { responsibleDepartmentId: query.departmentId } : {}),
        ...(query.serviceType ? { catalogServiceType: query.serviceType } : {}),
        versions: {
          some: versionWhere,
        },
      },
      select: { id: true, slug: true },
      orderBy: { slug: 'asc' },
    });

    const total = matchingServices.length;
    const pagedServiceIds = matchingServices
      .slice((page - 1) * limit, page * limit)
      .map((service) => service.id);

    const versions =
      pagedServiceIds.length === 0
        ? []
        : await this.prisma.governmentServiceVersion.findMany({
            where: {
              ...versionWhere,
              governmentServiceId: { in: pagedServiceIds },
            },
            include: publicVersionInclude,
            orderBy: [{ governmentServiceId: 'asc' }, { createdAt: 'desc' }],
          });

    const items = this.selectLatestPublicVersionPerService(versions).map((version) =>
      mapPublicServiceSummary(version),
    );
    items.forEach((item) => {
      assertNoRestrictedFields(item as unknown as Record<string, unknown>);
    });

    const response = {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };

    await this.cacheService.set(cacheKey, response);
    return response;
  }

  async getServiceBySlug(slug: string): Promise<PublicServiceDetail> {
    const cacheKey = this.cacheService.buildDetailCacheKey(slug);
    const cached = await this.cacheService.get<PublicServiceDetail>(cacheKey);
    if (cached) {
      assertNoRestrictedFields(cached as unknown as Record<string, unknown>);
      return cached;
    }

    const version = await this.findCurrentPublicVersionBySlug(slug);
    if (!version) {
      throw new NotFoundException(`Public service '${slug}' was not found`);
    }

    const detail = mapPublicServiceDetail(version);
    assertNoRestrictedFields(detail as unknown as Record<string, unknown>);
    await this.cacheService.set(cacheKey, detail);
    return detail;
  }

  async listServiceFamilies(): Promise<
    {
      id: string;
      code: string;
      name: string;
      description: string | null;
    }[]
  > {
    const cacheKey = this.cacheService.buildFamiliesCacheKey();
    const cached = await this.cacheService.get<
      {
        id: string;
        code: string;
        name: string;
        description: string | null;
      }[]
    >(cacheKey);

    if (cached) {
      return cached;
    }

    const families = await this.prisma.serviceFamily.findMany({
      where: {
        status: StructuralLifecycleStatus.ACTIVE,
        services: {
          some: {
            versions: {
              some: this.publicPresentationWhere(),
            },
          },
        },
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    });

    await this.cacheService.set(cacheKey, families);
    return families;
  }

  async matchServices(dto: MatchPublicServicesDto): Promise<PublicServiceSummary[]> {
    const normalizedQuery = dto.query.trim().toLowerCase();
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

    const versions = await this.prisma.governmentServiceVersion.findMany({
      where: {
        ...this.publicPresentationWhere(),
        ...(dto.applicantCategory
          ? {
              applicantCategories: {
                some: { category: dto.applicantCategory },
              },
            }
          : {}),
        OR: [
          { purpose: { contains: normalizedQuery, mode: 'insensitive' } },
          { publicDescription: { contains: normalizedQuery, mode: 'insensitive' } },
          { coveredActivities: { contains: normalizedQuery, mode: 'insensitive' } },
          {
            governmentService: {
              OR: [
                { publicName: { contains: normalizedQuery, mode: 'insensitive' } },
                { summary: { contains: normalizedQuery, mode: 'insensitive' } },
              ],
            },
          },
          ...tokens.map((token) => ({
            coveredActivities: { contains: token, mode: 'insensitive' as const },
          })),
          ...(dto.activityHints ?? []).map((hint) => ({
            coveredActivities: { contains: hint, mode: 'insensitive' as const },
          })),
        ],
      },
      include: publicVersionInclude,
      orderBy: [{ governmentService: { slug: 'asc' } }, { createdAt: 'desc' }],
      take: 50,
    });

    return this.selectLatestPublicVersionPerService(versions).map((version) =>
      mapPublicServiceSummary(version),
    );
  }

  async evaluateEligibility(
    slug: string,
    dto: PublicServiceEligibilityDto,
  ): Promise<PublicEligibilityResult> {
    const version = dto.serviceVersionId
      ? await this.findPublicVersionByIdForSlug(slug, dto.serviceVersionId)
      : await this.findCurrentPublicVersionBySlug(slug);

    if (!version) {
      throw new NotFoundException(`Public service '${slug}' was not found`);
    }

    const matchedRules: string[] = [];
    const unmatchedRequiredRules: string[] = [];
    const guidanceNotes: string[] = [];
    const eligibleCategories = version.applicantCategories.map((entry) => entry.category);

    for (const rule of version.eligibilityRules) {
      const matched = this.evaluateEligibilityRule(rule, dto);
      if (matched) {
        matchedRules.push(rule.ruleCode);
      } else if (rule.isRequired) {
        unmatchedRequiredRules.push(rule.ruleCode);
      }
    }

    if (dto.applicantCategory && !eligibleCategories.includes(dto.applicantCategory)) {
      guidanceNotes.push(
        `This service is not published for the ${dto.applicantCategory.toLowerCase()} applicant category.`,
      );
    }

    const eligible =
      unmatchedRequiredRules.length === 0 &&
      (!dto.applicantCategory || eligibleCategories.includes(dto.applicantCategory))
        ? true
        : unmatchedRequiredRules.length > 0
          ? false
          : null;

    return {
      serviceId: version.governmentServiceId,
      serviceVersionId: version.id,
      eligible,
      matchedRules,
      unmatchedRequiredRules,
      guidanceNotes,
      nonbindingDisclaimer: PUBLIC_NONBINDING_DISCLAIMER,
    };
  }

  async getStartPackage(
    slug: string,
    query: QueryServiceStartPackageDto,
  ): Promise<ServiceStartPackage> {
    const currentVersion = await this.findCurrentPublicVersionBySlug(slug);
    if (!currentVersion) {
      throw new NotFoundException(`Public service '${slug}' was not found`);
    }

    if (
      currentVersion.publicAvailability === GovernmentServicePublicAvailability.INFORMATION_ONLY
    ) {
      throw new InformationOnlyNotStartableException();
    }

    if (!isApplicationCapableAvailability(currentVersion.publicAvailability)) {
      throw new NotFoundException(`Public service '${slug}' is not available to start`);
    }

    let resolvedVersion = currentVersion;

    if (query.serviceVersionId) {
      const pinnedVersion = await this.findPublicVersionByIdForSlug(slug, query.serviceVersionId);
      if (!pinnedVersion) {
        throw new VersionSupersededException();
      }

      if (
        pinnedVersion.id !== currentVersion.id ||
        pinnedVersion.publicAvailability !== currentVersion.publicAvailability ||
        !APPLICATION_STARTABLE_AVAILABILITY.includes(pinnedVersion.publicAvailability)
      ) {
        throw new VersionSupersededException();
      }

      resolvedVersion = pinnedVersion;
    }

    const startPackage = mapServiceStartPackage(
      resolvedVersion,
      [
        PUBLIC_NONBINDING_DISCLAIMER,
        PUBLIC_START_PACKAGE_DISCLAIMER,
        resolvedVersion.publicDisclaimer ?? '',
      ].filter(Boolean),
    );

    if (
      query.configurationFingerprint &&
      query.configurationFingerprint !== startPackage.configurationFingerprint
    ) {
      throw new VersionSupersededException();
    }

    assertNoRestrictedFields(startPackage as unknown as Record<string, unknown>);

    const cacheKey = this.cacheService.buildStartPackageCacheKey(slug, resolvedVersion.id);
    await this.cacheService.set(cacheKey, startPackage);

    return startPackage;
  }

  private buildPublicVersionWhere(
    query: QueryPublicServicesDto,
  ): Prisma.GovernmentServiceVersionWhereInput {
    const availabilities = query.status ? [query.status] : PUBLICLY_PRESENTABLE_AVAILABILITY;

    return {
      ...this.publicPresentationWhere(),
      publicAvailability: { in: availabilities },
      ...(query.applicantCategory
        ? {
            applicantCategories: {
              some: { category: query.applicantCategory },
            },
          }
        : {}),
      ...(query.keyword
        ? {
            OR: [
              { purpose: { contains: query.keyword, mode: 'insensitive' } },
              { publicDescription: { contains: query.keyword, mode: 'insensitive' } },
              { coveredActivities: { contains: query.keyword, mode: 'insensitive' } },
              {
                governmentService: {
                  OR: [
                    { publicName: { contains: query.keyword, mode: 'insensitive' } },
                    { summary: { contains: query.keyword, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
    };
  }

  private publicPresentationWhere(): Prisma.GovernmentServiceVersionWhereInput {
    return {
      maturityStatus: PUBLIC_PRESENTATION_MATURITY,
      publicAvailability: { in: PUBLICLY_PRESENTABLE_AVAILABILITY },
      supersededAt: null,
    };
  }

  private async findCurrentPublicVersionBySlug(
    slug: string,
  ): Promise<PublicGovernmentServiceVersionRecord | null> {
    const versions = await this.prisma.governmentServiceVersion.findMany({
      where: {
        ...this.publicPresentationWhere(),
        governmentService: { slug },
      },
      include: publicVersionInclude,
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return this.selectLatestPublicVersionPerService(versions)[0] ?? null;
  }

  private async findPublicVersionByIdForSlug(
    slug: string,
    serviceVersionId: string,
  ): Promise<PublicGovernmentServiceVersionRecord | null> {
    return this.prisma.governmentServiceVersion.findFirst({
      where: {
        id: serviceVersionId,
        maturityStatus: PUBLIC_PRESENTATION_MATURITY,
        publicAvailability: { in: PUBLICLY_PRESENTABLE_AVAILABILITY },
        governmentService: { slug },
      },
      include: publicVersionInclude,
    });
  }

  private selectLatestPublicVersionPerService(
    versions: PublicGovernmentServiceVersionRecord[],
  ): PublicGovernmentServiceVersionRecord[] {
    const byServiceId = new Map<string, PublicGovernmentServiceVersionRecord>();

    for (const version of versions) {
      const existing = byServiceId.get(version.governmentServiceId);
      if (!existing || existing.createdAt < version.createdAt) {
        byServiceId.set(version.governmentServiceId, version);
      }
    }

    return [...byServiceId.values()].sort((left, right) =>
      left.governmentService.slug.localeCompare(right.governmentService.slug),
    );
  }

  private evaluateEligibilityRule(
    rule: PublicGovernmentServiceVersionRecord['eligibilityRules'][number],
    dto: PublicServiceEligibilityDto,
  ): boolean {
    const configuration = rule.configuration as Record<string, unknown>;

    if (typeof configuration.requiredApplicantCategory === 'string') {
      return dto.applicantCategory === configuration.requiredApplicantCategory;
    }

    if (typeof configuration.requiredAttribute === 'string') {
      const attributeValue = dto.attributes?.[configuration.requiredAttribute];
      if (configuration.requiredValue !== undefined) {
        return attributeValue === configuration.requiredValue;
      }

      return attributeValue !== undefined && attributeValue !== null && attributeValue !== '';
    }

    if (
      configuration.requiresTruthyAttribute === true &&
      typeof configuration.attribute === 'string'
    ) {
      return Boolean(dto.attributes?.[configuration.attribute]);
    }

    return true;
  }

  private hashQuery(query: QueryPublicServicesDto): string {
    return createHash('sha256').update(JSON.stringify(query)).digest('hex');
  }
}
