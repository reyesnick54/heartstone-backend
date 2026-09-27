import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

/**
 * Canonical property path uses cadastre LandParcel + PropertyRegistryEntry.
 * Legacy PropertyParcel experience rows link to LandParcel rather than duplicating cadastre.
 */
@Injectable()
export class PropertyRegistryCanonicalPathService {
  constructor(private readonly prisma: PrismaService) {}

  async linkLegacyParcelToCadastre(input: {
    propertyParcelId: string;
    landParcelId: string;
  }): Promise<void> {
    await this.prisma.propertyParcel.update({
      where: { id: input.propertyParcelId },
      data: { landParcelId: input.landParcelId },
    });
  }

  async resolveOrCreateCadastreLink(input: {
    propertyParcelId: string;
    jurisdictionId: string;
    parcelReference: string;
    institutionId: string;
  }): Promise<string> {
    const existing = await this.prisma.propertyParcel.findUnique({
      where: { id: input.propertyParcelId },
      select: { landParcelId: true },
    });

    if (existing?.landParcelId) {
      return existing.landParcelId;
    }

    const landParcel =
      (await this.prisma.landParcel.findFirst({
        where: {
          jurisdictionId: input.jurisdictionId,
          parcelReference: input.parcelReference,
        },
        select: { id: true },
      })) ??
      (await this.prisma.landParcel.create({
        data: {
          parcelReference: input.parcelReference,
          jurisdictionId: input.jurisdictionId,
          institutionId: input.institutionId,
        },
        select: { id: true },
      }));

    await this.linkLegacyParcelToCadastre({
      propertyParcelId: input.propertyParcelId,
      landParcelId: landParcel.id,
    });

    return landParcel.id;
  }

  async resolveLandParcelForPropertyParcel(propertyParcelId: string): Promise<string | null> {
    const parcel = await this.prisma.propertyParcel.findUnique({
      where: { id: propertyParcelId },
      select: { landParcelId: true, parcelReference: true, jurisdictionId: true },
    });

    if (!parcel) {
      return null;
    }

    if (parcel.landParcelId) {
      return parcel.landParcelId;
    }

    const match = await this.prisma.landParcel.findFirst({
      where: {
        jurisdictionId: parcel.jurisdictionId,
        parcelReference: parcel.parcelReference,
      },
      select: { id: true },
    });

    return match?.id ?? null;
  }
}
