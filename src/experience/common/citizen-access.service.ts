import { Injectable } from '@nestjs/common';
import { Application, Case, Prisma, RepresentativeAuthorityStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CitizenAccessDeniedException } from './exceptions/citizen-access-denied.exception';

export interface CitizenAccessibleScope {
  identityId: string;
  activeRepresentativeAuthorityIds: string[];
  representedOrganizationIds: string[];
}

@Injectable()
export class CitizenAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAccessibleScope(identityId: string): Promise<CitizenAccessibleScope> {
    const now = new Date();
    const activeAuthorities = await this.prisma.representativeAuthority.findMany({
      where: {
        identityId,
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      select: { id: true, organizationId: true },
    });

    return {
      identityId,
      activeRepresentativeAuthorityIds: activeAuthorities.map((authority) => authority.id),
      representedOrganizationIds: activeAuthorities.map((authority) => authority.organizationId),
    };
  }

  buildApplicationWhere(scope: CitizenAccessibleScope): Prisma.ApplicationWhereInput {
    const orConditions: Prisma.ApplicationWhereInput[] = [
      { applicantIdentityId: scope.identityId },
    ];

    if (scope.activeRepresentativeAuthorityIds.length > 0) {
      orConditions.push({
        representativeAuthorityId: { in: scope.activeRepresentativeAuthorityIds },
        organizationId: { in: scope.representedOrganizationIds },
      });
    }

    return { OR: orConditions };
  }

  buildCaseWhere(scope: CitizenAccessibleScope): Prisma.CaseWhereInput {
    return {
      OR: [
        { applicantIdentityId: scope.identityId },
        ...(scope.representedOrganizationIds.length > 0
          ? [
              {
                application: {
                  organizationId: { in: scope.representedOrganizationIds },
                  representativeAuthorityId: { in: scope.activeRepresentativeAuthorityIds },
                },
              },
            ]
          : []),
      ],
    };
  }

  async assertApplicationAccess(applicationId: string, identityId: string): Promise<Application> {
    const scope = await this.resolveAccessibleScope(identityId);
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        ...this.buildApplicationWhere(scope),
      },
    });

    if (!application) {
      throw new CitizenAccessDeniedException();
    }

    return application;
  }

  async assertCaseAccess(caseId: string, identityId: string): Promise<Case> {
    const scope = await this.resolveAccessibleScope(identityId);
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        ...this.buildCaseWhere(scope),
      },
    });

    if (!caseRecord) {
      throw new CitizenAccessDeniedException();
    }

    return caseRecord;
  }

  buildPaginationMeta(page: number, pageSize: number, totalItems: number) {
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
    return {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
