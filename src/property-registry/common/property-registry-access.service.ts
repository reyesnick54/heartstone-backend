import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  PropertyAccessActorKind,
  PropertyInterestKind,
  PropertyInterestStatus,
  RepresentativeAuthorityStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PROPERTY_REASON_CODES } from '../property-registry.constants';

export interface PropertyParcelAccessContext {
  accessorIdentityId: string;
  parcelId: string;
  actorKind: PropertyAccessActorKind;
  endpoint: string;
  organizationId?: string;
  representativeAuthorityId?: string;
}

@Injectable()
export class PropertyRegistryAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertParcelAccess(context: PropertyParcelAccessContext): Promise<void> {
    const parcel = await this.prisma.propertyParcel.findUnique({
      where: { id: context.parcelId },
    });
    if (!parcel) {
      throw new ForbiddenException(PROPERTY_REASON_CODES.CROSS_PARCEL_ACCESS_DENIED);
    }

    let granted = false;
    let reasonCode: string | undefined;

    if (context.actorKind === PropertyAccessActorKind.REGISTRY_OFFICER) {
      granted = true;
    } else if (context.actorKind === PropertyAccessActorKind.OWNER) {
      const [interest, entitlement] = await Promise.all([
        this.prisma.propertyInterest.findFirst({
          where: {
            parcelId: context.parcelId,
            identityId: context.accessorIdentityId,
            status: PropertyInterestStatus.ACTIVE,
          },
        }),
        this.prisma.propertyInterestEntitlement.findFirst({
          where: {
            parcelId: context.parcelId,
            identityId: context.accessorIdentityId,
          },
        }),
      ]);
      granted = interest != null || entitlement != null;
      if (!granted) {
        reasonCode = PROPERTY_REASON_CODES.CROSS_PARCEL_ACCESS_DENIED;
      }
    } else if (context.actorKind === PropertyAccessActorKind.REPRESENTATIVE) {
      if (!context.representativeAuthorityId || !context.organizationId) {
        throw new ForbiddenException(PROPERTY_REASON_CODES.REPRESENTATIVE_SCOPE_REQUIRED);
      }
      const authority = await this.prisma.representativeAuthority.findUnique({
        where: { id: context.representativeAuthorityId },
      });
      const now = new Date();
      const authorityValid =
        authority?.status === RepresentativeAuthorityStatus.ACTIVE &&
        authority.identityId === context.accessorIdentityId &&
        authority.organizationId === context.organizationId &&
        authority.effectiveFrom <= now &&
        (authority.effectiveUntil == null || authority.effectiveUntil > now);

      if (!authorityValid) {
        throw new ForbiddenException(PROPERTY_REASON_CODES.REPRESENTATIVE_SCOPE_REQUIRED);
      }

      const orgInterest = await this.prisma.propertyInterest.findFirst({
        where: {
          parcelId: context.parcelId,
          organizationId: context.organizationId,
          status: PropertyInterestStatus.ACTIVE,
        },
      });
      granted = orgInterest != null;
      if (!granted) {
        reasonCode = PROPERTY_REASON_CODES.REPRESENTATIVE_SCOPE_REQUIRED;
      }
    } else {
      granted = false;
      reasonCode = PROPERTY_REASON_CODES.CROSS_PARCEL_ACCESS_DENIED;
    }

    await this.prisma.propertyAccessAudit.create({
      data: {
        accessorIdentityId: context.accessorIdentityId,
        parcelId: context.parcelId,
        actorKind: context.actorKind,
        endpoint: context.endpoint,
        granted,
        reasonCode,
      },
    });

    if (!granted) {
      throw new ForbiddenException(reasonCode ?? PROPERTY_REASON_CODES.CROSS_PARCEL_ACCESS_DENIED);
    }
  }

  async listAuthorizedParcelIdsForIdentity(identityId: string): Promise<string[]> {
    const [interests, entitlements] = await Promise.all([
      this.prisma.propertyInterest.findMany({
        where: { identityId, status: PropertyInterestStatus.ACTIVE },
        select: { parcelId: true },
      }),
      this.prisma.propertyInterestEntitlement.findMany({
        where: { identityId },
        select: { parcelId: true },
      }),
    ]);
    return [...new Set([...interests, ...entitlements].map((row) => row.parcelId))];
  }

  async listAuthorizedParcelIdsForOrganization(organizationId: string): Promise<string[]> {
    const interests = await this.prisma.propertyInterest.findMany({
      where: {
        organizationId,
        status: PropertyInterestStatus.ACTIVE,
        interestKind: { in: [PropertyInterestKind.OWNER, PropertyInterestKind.LEASEHOLDER] },
      },
      select: { parcelId: true },
    });
    return interests.map((row) => row.parcelId);
  }
}
