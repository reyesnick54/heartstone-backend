import { Injectable } from '@nestjs/common';
import {
  Application,
  Case,
  MembershipStatus,
  Prisma,
  RepresentativeAuthorityStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { BusinessAccessDeniedException } from './exceptions/business-access-denied.exception';

export interface BusinessOrganizationAccess {
  organizationId: string;
  identityId: string;
  hasActiveMembership: boolean;
  activeMembershipIds: string[];
  activeRepresentativeAuthorityIds: string[];
  hasFullOrganizationVisibility: boolean;
}

export interface AccessibleOrganizationSummary {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  organizationStatus: string;
  accessPaths: ('MEMBERSHIP' | 'REPRESENTATIVE_AUTHORITY')[];
  membershipRoleLabel: string | null;
  representativeScopeDescription: string | null;
}

@Injectable()
export class BusinessAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async listAccessibleOrganizations(identityId: string): Promise<AccessibleOrganizationSummary[]> {
    const now = new Date();

    const [memberships, authorities] = await Promise.all([
      this.prisma.organizationMembership.findMany({
        where: {
          identityId,
          status: MembershipStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
        },
        include: { organization: true },
      }),
      this.prisma.representativeAuthority.findMany({
        where: {
          identityId,
          status: RepresentativeAuthorityStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
        },
        include: { organization: true },
      }),
    ]);

    const organizationMap = new Map<string, AccessibleOrganizationSummary>();

    for (const membership of memberships) {
      const existing = organizationMap.get(membership.organizationId);
      if (existing) {
        existing.accessPaths.push('MEMBERSHIP');
        existing.membershipRoleLabel = membership.roleLabel;
      } else {
        organizationMap.set(membership.organizationId, {
          organizationId: membership.organizationId,
          organizationCode: membership.organization.code,
          organizationName: membership.organization.name,
          organizationStatus: membership.organization.status,
          accessPaths: ['MEMBERSHIP'],
          membershipRoleLabel: membership.roleLabel,
          representativeScopeDescription: null,
        });
      }
    }

    for (const authority of authorities) {
      const existing = organizationMap.get(authority.organizationId);
      if (existing) {
        if (!existing.accessPaths.includes('REPRESENTATIVE_AUTHORITY')) {
          existing.accessPaths.push('REPRESENTATIVE_AUTHORITY');
        }
        existing.representativeScopeDescription = authority.scopeDescription;
      } else {
        organizationMap.set(authority.organizationId, {
          organizationId: authority.organizationId,
          organizationCode: authority.organization.code,
          organizationName: authority.organization.name,
          organizationStatus: authority.organization.status,
          accessPaths: ['REPRESENTATIVE_AUTHORITY'],
          membershipRoleLabel: null,
          representativeScopeDescription: authority.scopeDescription,
        });
      }
    }

    return [...organizationMap.values()].sort((left, right) =>
      left.organizationName.localeCompare(right.organizationName),
    );
  }

  async assertOrganizationAccess(
    organizationId: string,
    identityId: string,
  ): Promise<BusinessOrganizationAccess> {
    const now = new Date();

    const [memberships, authorities] = await Promise.all([
      this.prisma.organizationMembership.findMany({
        where: {
          organizationId,
          identityId,
          status: MembershipStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
        },
        select: { id: true },
      }),
      this.prisma.representativeAuthority.findMany({
        where: {
          organizationId,
          identityId,
          status: RepresentativeAuthorityStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
        },
        select: { id: true },
      }),
    ]);

    if (memberships.length === 0 && authorities.length === 0) {
      throw new BusinessAccessDeniedException();
    }

    return {
      organizationId,
      identityId,
      hasActiveMembership: memberships.length > 0,
      activeMembershipIds: memberships.map((membership) => membership.id),
      activeRepresentativeAuthorityIds: authorities.map((authority) => authority.id),
      hasFullOrganizationVisibility: memberships.length > 0,
    };
  }

  buildApplicationWhere(access: BusinessOrganizationAccess): Prisma.ApplicationWhereInput {
    const base: Prisma.ApplicationWhereInput = {
      organizationId: access.organizationId,
    };

    if (access.hasFullOrganizationVisibility) {
      return base;
    }

    return {
      ...base,
      representativeAuthorityId: { in: access.activeRepresentativeAuthorityIds },
    };
  }

  buildCaseWhere(access: BusinessOrganizationAccess): Prisma.CaseWhereInput {
    return {
      application: this.buildApplicationWhere(access),
    };
  }

  async assertApplicationAccess(
    applicationId: string,
    access: BusinessOrganizationAccess,
  ): Promise<Application> {
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        ...this.buildApplicationWhere(access),
      },
    });

    if (!application) {
      throw new BusinessAccessDeniedException();
    }

    return application;
  }

  async assertCaseAccess(caseId: string, access: BusinessOrganizationAccess): Promise<Case> {
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        ...this.buildCaseWhere(access),
      },
    });

    if (!caseRecord) {
      throw new BusinessAccessDeniedException();
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
