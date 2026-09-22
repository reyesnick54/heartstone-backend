import { Injectable } from '@nestjs/common';
import {
  CivilRegistryRecordStatus,
  type CivilRegistryVitalRecord,
  type Prisma,
  RepresentativeAuthorityStatus,
} from '@prisma/client';

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

export type CivilRegistryVitalRecordWithEntitlements = Prisma.CivilRegistryVitalRecordGetPayload<{
  include: {
    entitlements: true;
    currentVersion: true;
    institution: { select: { id: true; name: true } };
  };
}>;

@Injectable()
export class CivilRegistryAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveCitizenScope(identityId: string): Promise<CitizenAccessScope> {
    return this.resolveScope(identityId);
  }

  private async resolveScope(identityId: string): Promise<CitizenAccessScope> {
    const now = new Date();
    const directApplications = await this.prisma.application.findMany({
      where: { applicantIdentityId: identityId },
      select: {
        id: true,
        case: { select: { id: true, masterAdministrativeFile: { select: { id: true } } } },
        masterAdministrativeFile: { select: { id: true } },
        submissions: { select: { id: true } },
      },
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
            select: {
              id: true,
              case: { select: { id: true, masterAdministrativeFile: { select: { id: true } } } },
              masterAdministrativeFile: { select: { id: true } },
              submissions: { select: { id: true } },
            },
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
          if (a.masterAdministrativeFile?.id) ids.push(a.masterAdministrativeFile.id);
          if (a.case?.masterAdministrativeFile?.id) ids.push(a.case.masterAdministrativeFile.id);
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

  isRecordVisibleToCitizen(
    record: CivilRegistryVitalRecordWithEntitlements,
    scope: CitizenAccessScope,
  ): boolean {
    if (record.isSealed || record.isRestricted) {
      return record.entitlements.some((entitlement) => entitlement.identityId === scope.identityId);
    }

    if (record.subjectIdentityId === scope.identityId) {
      return true;
    }

    if (record.entitlements.some((entitlement) => entitlement.identityId === scope.identityId)) {
      return true;
    }

    if (record.registrationCaseId && scope.caseIds.includes(record.registrationCaseId)) {
      return true;
    }

    return false;
  }

  isOfficialRecord(record: CivilRegistryVitalRecord): boolean {
    return (
      record.status === CivilRegistryRecordStatus.OFFICIAL ||
      record.status === CivilRegistryRecordStatus.CORRECTED
    );
  }

  async findEntitledRecords(
    identityId: string,
  ): Promise<CivilRegistryVitalRecordWithEntitlements[]> {
    const scope = await this.resolveScope(identityId);
    const records = await this.prisma.civilRegistryVitalRecord.findMany({
      where: {
        OR: [
          { subjectIdentityId: identityId },
          { entitlements: { some: { identityId } } },
          ...(scope.caseIds.length > 0 ? [{ registrationCaseId: { in: scope.caseIds } }] : []),
        ],
      },
      include: {
        entitlements: true,
        currentVersion: true,
        institution: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return records.filter((record) => this.isRecordVisibleToCitizen(record, scope));
  }

  async findEntitledRecordById(
    identityId: string,
    recordId: string,
  ): Promise<CivilRegistryVitalRecordWithEntitlements | null> {
    const scope = await this.resolveScope(identityId);
    const record = await this.prisma.civilRegistryVitalRecord.findUnique({
      where: { id: recordId },
      include: {
        entitlements: true,
        currentVersion: true,
        institution: { select: { id: true, name: true } },
      },
    });

    if (!record || !this.isRecordVisibleToCitizen(record, scope)) {
      return null;
    }

    return record;
  }
}
