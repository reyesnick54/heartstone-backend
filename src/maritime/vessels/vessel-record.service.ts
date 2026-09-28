import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { VesselAdministrativeStatus, VesselProvenanceKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { VESSEL_RECORD_REFERENCE_PREFIX } from '../maritime.constants';

export interface RegisterVesselRecordInput {
  vesselName?: string;
  vesselTypeCategoryCode?: string;
  registrationJurisdictionCode?: string;
  jurisdictionId?: string;
  institutionId?: string;
  masterAdministrativeFileId?: string;
  officialRegistrationReference?: string;
  provenanceKind?: VesselProvenanceKind;
  provenanceSummary?: string;
}

@Injectable()
export class VesselRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async registerVessel(input: RegisterVesselRecordInput) {
    const vesselReferenceNumber = `${VESSEL_RECORD_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const vessel = await this.prisma.vesselRecord.create({
      data: {
        id: randomUUID(),
        vesselReferenceNumber,
        vesselName: input.vesselName,
        vesselTypeCategoryCode: input.vesselTypeCategoryCode,
        registrationJurisdictionCode: input.registrationJurisdictionCode,
        jurisdictionId: input.jurisdictionId,
        institutionId: input.institutionId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        administrativeStatus: VesselAdministrativeStatus.DRAFT,
        doesNotDuplicatePartyIdentity: true,
      },
    });

    if (input.officialRegistrationReference) {
      await this.prisma.vesselOfficialRegistrationReference.create({
        data: {
          id: randomUUID(),
          vesselRecordId: vessel.id,
          officialRegistrationReference: input.officialRegistrationReference,
          provenanceKind: input.provenanceKind ?? VesselProvenanceKind.CONFIGURED_SOURCE,
          provenanceSummary: input.provenanceSummary,
        },
      });
    }

    await this.prisma.vesselProvenanceRecord.create({
      data: {
        id: randomUUID(),
        vesselRecordId: vessel.id,
        provenanceKind: input.provenanceKind ?? VesselProvenanceKind.CONFIGURED_SOURCE,
        summary: input.provenanceSummary ?? 'Initial vessel administrative record',
      },
    });

    return { vessel, organizationIdentityDuplicated: false, personIdentityDuplicated: false };
  }
}
