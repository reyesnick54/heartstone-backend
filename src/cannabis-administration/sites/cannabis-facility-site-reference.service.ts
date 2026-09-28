import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { CannabisAdministrationBoundaryService } from '../common/cannabis-administration-boundary.service';

export interface LinkCannabisFacilitySiteInput {
  regulatedEntityId: string;
  siteLabel?: string;
  landParcelId?: string;
  propertyParcelId?: string;
  developmentProjectId?: string;
  developmentPermitId?: string;
  publicSafetyEngagementId?: string;
  createLandParcel?: boolean;
  createPlanningPermit?: boolean;
}

@Injectable()
export class CannabisFacilitySiteReferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CannabisAdministrationBoundaryService,
  ) {}

  async linkFacilitySite(input: LinkCannabisFacilitySiteInput) {
    this.boundary.assertSiteLinkageDoesNotCreateCanonicalRecords({
      createLandParcel: input.createLandParcel,
      createPlanningPermit: input.createPlanningPermit,
    });

    return this.prisma.cannabisFacilitySiteReference.create({
      data: {
        id: randomUUID(),
        regulatedEntityId: input.regulatedEntityId,
        siteLabel: input.siteLabel,
        landParcelId: input.landParcelId,
        propertyParcelId: input.propertyParcelId,
        developmentProjectId: input.developmentProjectId,
        developmentPermitId: input.developmentPermitId,
        publicSafetyEngagementId: input.publicSafetyEngagementId,
        doesNotCreateLandOrPlanningRecords: true,
      },
    });
  }
}
