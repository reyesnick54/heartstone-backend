import { Injectable } from '@nestjs/common';
import { RepresentativeAuthorityStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CitizenAccessScope {
  identityId: string;
  applicationIds: string[];
  caseIds: string[];
  submissionIds: string[];
  masterAdministrativeFileIds: string[];
  organizationIds: string[];
  representativeAuthorityIds: string[];
}

const applicationSelect = {
  id: true,
  case: {
    select: {
      id: true,
      masterAdministrativeFile: { select: { id: true } },
    },
  },
  masterAdministrativeFile: { select: { id: true } },
  submissions: { select: { id: true } },
} as const;

@Injectable()
export class CitizenAccessScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveScope(identityId: string): Promise<CitizenAccessScope> {
    const now = new Date();

    const directApplications = await this.prisma.application.findMany({
      where: { applicantIdentityId: identityId },
      select: applicationSelect,
    });

    const representativeAuthorities = await this.prisma.representativeAuthority.findMany({
      where: {
        identityId,
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      select: { id: true, organizationId: true },
    });

    const organizationIds = [...new Set(representativeAuthorities.map((a) => a.organizationId))];
    const representativeAuthorityIds = representativeAuthorities.map((a) => a.id);

    const organizationApplications =
      organizationIds.length > 0
        ? await this.prisma.application.findMany({
            where: {
              organizationId: { in: organizationIds },
              representativeAuthorityId: { in: representativeAuthorityIds },
            },
            select: applicationSelect,
          })
        : [];

    const applications = [...directApplications, ...organizationApplications];
    const applicationIds = [...new Set(applications.map((a) => a.id))];
    const caseIds = [...new Set(applications.flatMap((a) => (a.case?.id ? [a.case.id] : [])))];
    const submissionIds = [...new Set(applications.flatMap((a) => a.submissions.map((s) => s.id)))];
    const masterAdministrativeFileIds = [
      ...new Set(
        applications.flatMap((a) => {
          const ids: string[] = [];
          if (a.masterAdministrativeFile?.id) {
            ids.push(a.masterAdministrativeFile.id);
          }
          if (a.case?.masterAdministrativeFile?.id) {
            ids.push(a.case.masterAdministrativeFile.id);
          }
          return ids;
        }),
      ),
    ];

    return {
      identityId,
      applicationIds,
      caseIds,
      submissionIds,
      masterAdministrativeFileIds,
      organizationIds,
      representativeAuthorityIds,
    };
  }

  canAccessCase(scope: CitizenAccessScope, caseId: string): boolean {
    return scope.caseIds.includes(caseId);
  }

  canAccessApplication(scope: CitizenAccessScope, applicationId: string): boolean {
    return scope.applicationIds.includes(applicationId);
  }

  canAccessOrganization(scope: CitizenAccessScope, organizationId: string): boolean {
    return scope.organizationIds.includes(organizationId);
  }
}
