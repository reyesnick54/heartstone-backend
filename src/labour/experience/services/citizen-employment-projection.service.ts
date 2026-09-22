import { Injectable } from '@nestjs/common';
import {
  EmploymentRelationshipStatus,
  WorkPermitApplicationProfileStatus,
  WorkPermitLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { LabourExperienceBoundaryService } from '../labour-experience-boundary.service';
import { LabourScopeService } from './labour-scope.service';

const ACTIVE_PERMIT_STATUSES: WorkPermitLifecycleStatus[] = [
  WorkPermitLifecycleStatus.ISSUED,
  WorkPermitLifecycleStatus.EFFECTIVE,
];

@Injectable()
export class CitizenEmploymentProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: LabourScopeService,
    private readonly boundary: LabourExperienceBoundaryService,
  ) {}

  async getHome(identityId: string) {
    const profile = await this.scope.requireWorkerProfileReference(identityId);
    const [relationships, permits, applications] = await Promise.all([
      this.prisma.employmentRelationship.count({
        where: {
          workerProfileReferenceId: profile.id,
          status: EmploymentRelationshipStatus.ACTIVE,
        },
      }),
      this.prisma.workPermitRecord.findMany({
        where: { workerProfileReferenceId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.workPermitApplicationProfile.count({
        where: {
          workerProfileReferenceId: profile.id,
          status: {
            in: [
              WorkPermitApplicationProfileStatus.LINKED,
              WorkPermitApplicationProfileStatus.ACTIVE,
            ],
          },
        },
      }),
    ]);

    const activePermit = permits.find((item) =>
      ACTIVE_PERMIT_STATUSES.includes(item.lifecycleStatus),
    );

    return {
      profileReferenceNumber: profile.profileReferenceNumber,
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.rulesDisclaimer,
      immigrationCoordinationDisclaimer: this.boundary.immigrationCoordinationDisclaimer,
      activeEmployers: relationships,
      workPermit: activePermit
        ? {
            permitNumber: activePermit.permitNumber,
            lifecycleStatus: activePermit.lifecycleStatus,
            immigrationProfileLinked: activePermit.immigrationProfileId != null,
            residencyCoordinationLinked: activePermit.linkedResidencyPermitRecordId != null,
            doesNotCreateResidency: activePermit.doesNotCreateResidency,
            validUntil: activePermit.validUntil,
          }
        : null,
      pendingApplications: applications,
    };
  }

  async listRelationships(identityId: string) {
    const profile = await this.scope.requireWorkerProfileReference(identityId);
    return this.prisma.employmentRelationship.findMany({
      where: { workerProfileReferenceId: profile.id },
      include: { employerRegistryRecord: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listWorkPermits(identityId: string) {
    const profile = await this.scope.requireWorkerProfileReference(identityId);
    return this.prisma.workPermitRecord.findMany({
      where: { workerProfileReferenceId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listApplications(identityId: string) {
    const profile = await this.scope.requireWorkerProfileReference(identityId);
    return this.prisma.workPermitApplicationProfile.findMany({
      where: { workerProfileReferenceId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listActions(identityId: string) {
    const profile = await this.scope.requireWorkerProfileReference(identityId);
    const pendingRenewals = await this.prisma.workPermitRecord.count({
      where: {
        workerProfileReferenceId: profile.id,
        lifecycleStatus: { in: ACTIVE_PERMIT_STATUSES },
        validUntil: { lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
      },
    });

    const items = [];
    if (pendingRenewals > 0) {
      items.push({
        actionKey: 'renew_work_permit',
        label: 'Renew work permit',
        available: true,
        configuredObligation: true,
      });
    }

    return {
      disclaimer: this.boundary.rulesDisclaimer,
      items,
    };
  }
}
