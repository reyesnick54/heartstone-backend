import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { PropertyRegistryClassificationAccessService } from '../common/property-registry-classification-access.service';

@Injectable()
export class PropertyRegistryReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PropertyRegistryClassificationAccessService,
  ) {}

  async getEntryForActor(actorIdentityId: string, entryId: string) {
    const entry = await this.prisma.propertyRegistryEntry.findUnique({
      where: { id: entryId },
      include: {
        restrictions: true,
        verifications: { orderBy: { createdAt: 'desc' }, take: 1 },
        titleRecord: {
          include: {
            landParcel: true,
            versions: { where: { isCurrent: true }, take: 1 },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Property registry entry not found');
    }

    const effectiveClassification = this.access.resolveEffectiveClassification({
      entryClassification: entry.accessClassification,
      restrictions: entry.restrictions.map((r) => r.accessClassification),
    });

    const payload = {
      id: entry.id,
      entryReference: entry.entryReference,
      registeredAt: entry.registeredAt,
      verificationState: entry.verifications[0]?.verificationState,
      titleReference: entry.titleRecord.titleReference,
      landParcelReference: entry.titleRecord.landParcel.parcelReference,
      titlePayload: entry.titleRecord.versions[0]?.payloadSnapshot,
      propertyRecordId: entry.propertyRecordId,
      titleRecordId: entry.titleRecordId,
    };

    return this.access.maskOrThrow(
      {
        actorIdentityId,
        accessClassification: effectiveClassification,
        linkedSubjectIdentityId: null,
      },
      payload,
    );
  }

  async assertParcelDistinctFromTitle(parcelId: string, titleId: string) {
    const parcel = await this.prisma.landParcel.findUnique({ where: { id: parcelId } });
    const title = await this.prisma.titleRecord.findUnique({
      where: { id: titleId },
      include: { landParcel: true },
    });

    if (!parcel || !title) {
      throw new NotFoundException('Parcel or title record not found');
    }

    return {
      parcelReference: parcel.parcelReference,
      titleReference: title.titleReference,
      linkedToSameParcel: title.landParcelId === parcel.id,
      distinctConcepts: true,
    };
  }
}
