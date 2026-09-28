import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ZoneLandLeaseLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { S18F_BOUNDARY_DISCLAIMERS, ZONE_LAND_LEASE_REFERENCE_PREFIX } from '../absez-s18f.constants';

@Injectable()
export class ZoneLandLeaseService {
  constructor(private readonly prisma: PrismaService) {}

  async registerLeaseDraft(input: {
    institutionId: string;
    landParcelId: string;
    organizationId?: string;
    personId?: string;
    strategicProjectProfileId?: string;
    governingSourceId?: string;
    governmentDecisionId?: string;
    effectiveFrom?: Date;
    effectiveUntil?: Date;
    conditionsSummary?: string;
    useTypeCode?: string;
  }) {
    const leaseReference = `${ZONE_LAND_LEASE_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const lease = await this.prisma.zoneLandLeaseRecord.create({
      data: {
        id: randomUUID(),
        leaseReference,
        institutionId: input.institutionId,
        landParcelId: input.landParcelId,
        organizationId: input.organizationId,
        personId: input.personId,
        strategicProjectProfileId: input.strategicProjectProfileId,
        governingSourceId: input.governingSourceId,
        governmentDecisionId: input.governmentDecisionId,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        conditionsSummary: input.conditionsSummary,
        status: ZoneLandLeaseLifecycleStatus.DRAFT,
        doesNotImplyPlanningPermission: true,
      },
    });

    if (input.useTypeCode) {
      await this.prisma.zoneLandOccupancyUseRelationship.create({
        data: {
          id: randomUUID(),
          zoneLandLeaseRecordId: lease.id,
          useTypeCode: input.useTypeCode,
        },
      });
    }

    return {
      lease,
      planningBoundaryDisclaimer: S18F_BOUNDARY_DISCLAIMERS.leaseNotPlanning,
    };
  }

  assertLeaseDoesNotImplyPlanning(lease: { doesNotImplyPlanningPermission: boolean }) {
    if (!lease.doesNotImplyPlanningPermission) {
      throw new Error(S18F_BOUNDARY_DISCLAIMERS.leaseNotPlanning);
    }
  }
}
