import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { VesselPartyRelationshipStatus, VesselPartyType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { MaritimeBoundaryService } from '../common/maritime-boundary.service';

@Injectable()
export class VesselPartyRelationshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: MaritimeBoundaryService,
  ) {}

  async linkParty(input: {
    vesselRecordId: string;
    partyType: VesselPartyType;
    partyRoleCode: string;
    partyIdentityId?: string;
    partyOrganizationId?: string;
    representativeAuthorityId?: string;
  }) {
    this.boundary.assertVesselPartyDoesNotDuplicateIdentity(true);

    const relationship = await this.prisma.vesselPartyRelationship.create({
      data: {
        id: randomUUID(),
        vesselRecordId: input.vesselRecordId,
        partyType: input.partyType,
        partyRoleCode: input.partyRoleCode,
        partyIdentityId: input.partyIdentityId,
        partyOrganizationId: input.partyOrganizationId,
        representativeAuthorityId: input.representativeAuthorityId,
        isCurrent: true,
        status: VesselPartyRelationshipStatus.CURRENT,
        doesNotDuplicatePartyRecord: true,
      },
    });

    await this.prisma.vesselRecord.update({
      where: { id: input.vesselRecordId },
      data: { currentPartyRelationshipId: relationship.id },
    });

    return relationship;
  }
}
