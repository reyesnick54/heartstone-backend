import { Injectable } from '@nestjs/common';
import { PropertyEncumbranceKind, PropertyEncumbranceStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PropertyEncumbranceService {
  constructor(private readonly prisma: PrismaService) {}

  async registerEncumbrance(input: {
    parcelId: string;
    encumbranceKind: PropertyEncumbranceKind;
    holderSummary: string;
    applicationId?: string;
  }) {
    const encumbrance = await this.prisma.propertyEncumbrance.create({
      data: {
        parcelId: input.parcelId,
        encumbranceKind: input.encumbranceKind,
        status: PropertyEncumbranceStatus.ACTIVE,
        holderSummary: input.holderSummary,
        applicationId: input.applicationId,
      },
    });

    await this.prisma.propertyEncumbranceHistory.create({
      data: {
        parcelId: input.parcelId,
        encumbranceKind: input.encumbranceKind,
        eventSummary: 'Encumbrance registered',
        preserved: true,
      },
    });

    return encumbrance;
  }

  async releaseEncumbrance(encumbranceId: string) {
    const encumbrance = await this.prisma.propertyEncumbrance.update({
      where: { id: encumbranceId },
      data: {
        status: PropertyEncumbranceStatus.RELEASED,
        releasedAt: new Date(),
      },
    });

    await this.prisma.propertyEncumbranceHistory.create({
      data: {
        parcelId: encumbrance.parcelId,
        encumbranceKind: encumbrance.encumbranceKind,
        eventSummary: 'Encumbrance released',
        preserved: true,
      },
    });

    return encumbrance;
  }
}
