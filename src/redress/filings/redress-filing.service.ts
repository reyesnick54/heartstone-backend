import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RedressFilingStatus, RedressMatterStatus, RedressRouteCategory } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';
import { REDRESS_FILING_NUMBER_PREFIX } from '../redress.constants';
import { RedressRouteCatalogService } from '../routing/redress-route-catalog.service';

export interface CreateFilingInput {
  matterId: string;
  routeVersionId: string;
  filerIdentityId: string;
  representativeAuthorityId?: string;
  groundsReference?: string;
  summary?: string;
  requestedRouteCategory?: RedressRouteCategory;
  contentReference?: string;
  contentHash?: string;
}

export interface ClassifyFilingInput {
  filingId: string;
  classifiedRouteCategory: RedressRouteCategory;
  rejectMislabeled?: boolean;
}

@Injectable()
export class RedressFilingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
    private readonly routeCatalog: RedressRouteCatalogService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async createDraft(input: CreateFilingInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'filing intake');

    const routeVersion = await this.routeCatalog.assertActiveVersion(input.routeVersionId);
    this.boundary.assertRouteCategoryMatches(
      input.requestedRouteCategory,
      routeVersion.routeDefinition.category,
    );

    const filingNumber = `${REDRESS_FILING_NUMBER_PREFIX}-${String(Date.now())}-${input.matterId.slice(0, 8)}`;

    return this.prisma.redressFiling.create({
      data: {
        filingNumber,
        matterId: input.matterId,
        routeVersionId: input.routeVersionId,
        filerIdentityId: input.filerIdentityId,
        representativeAuthorityId: input.representativeAuthorityId,
        groundsReference: input.groundsReference,
        summary: input.summary,
        requestedRouteCategory: input.requestedRouteCategory,
        status: RedressFilingStatus.DRAFT,
        versions: input.contentReference
          ? {
              create: {
                versionNumber: 1,
                contentReference: input.contentReference,
                contentHash: input.contentHash,
              },
            }
          : undefined,
      },
      include: { routeVersion: { include: { routeDefinition: true } }, versions: true },
    });
  }

  async submitFiling(filingId: string) {
    const filing = await this.prisma.redressFiling.findUnique({
      where: { id: filingId },
      include: { routeVersion: { include: { routeDefinition: true } } },
    });

    if (!filing) {
      throw new NotFoundException(`RedressFiling ${filingId} not found`);
    }

    if (filing.status !== RedressFilingStatus.DRAFT) {
      throw new BadRequestException('Only draft filings may be submitted');
    }

    await this.safeHalt.assertMatterNotSafeHalted(filing.matterId, 'filing submission');
    this.boundary.assertFilingDoesNotEstablishStanding();

    const updated = await this.prisma.redressFiling.update({
      where: { id: filingId },
      data: {
        status: RedressFilingStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });

    await this.prisma.redressMatter.update({
      where: { id: filing.matterId },
      data: {
        status: RedressMatterStatus.INTAKE,
        routeVersionId: filing.routeVersionId,
      },
    });

    return updated;
  }

  async classifyFiling(input: ClassifyFilingInput) {
    const filing = await this.prisma.redressFiling.findUnique({
      where: { id: input.filingId },
      include: { routeVersion: { include: { routeDefinition: true } } },
    });

    if (!filing) {
      throw new NotFoundException(`RedressFiling ${input.filingId} not found`);
    }

    const routeCategory = filing.routeVersion.routeDefinition.category;

    if (input.rejectMislabeled && input.classifiedRouteCategory !== routeCategory) {
      await this.prisma.redressFiling.update({
        where: { id: input.filingId },
        data: { status: RedressFilingStatus.REJECTED },
      });
      throw new BadRequestException(
        'Mislabeled route rejected: classified category does not match route definition',
      );
    }

    this.boundary.assertRouteCategoryMatches(input.classifiedRouteCategory, routeCategory);

    const updated = await this.prisma.redressFiling.update({
      where: { id: input.filingId },
      data: {
        classifiedRouteCategory: input.classifiedRouteCategory,
        status: RedressFilingStatus.CLASSIFIED,
      },
    });

    await this.prisma.redressMatter.update({
      where: { id: filing.matterId },
      data: { status: RedressMatterStatus.CLASSIFICATION },
    });

    return updated;
  }

  async findById(filingId: string) {
    const filing = await this.prisma.redressFiling.findUnique({
      where: { id: filingId },
      include: {
        versions: { orderBy: { versionNumber: 'asc' } },
        routeVersion: { include: { routeDefinition: true } },
        matter: true,
      },
    });

    if (!filing) {
      throw new NotFoundException(`RedressFiling ${filingId} not found`);
    }

    return filing;
  }
}
