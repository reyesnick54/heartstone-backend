import { Injectable } from '@nestjs/common';
import {
  PropertyEncumbranceStatus,
  PropertyInterestStatus,
  PropertyRegistryApplicationStatus,
  PropertyRegistryApplicationType,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { BusinessAccessService } from '../../../experience/common/business-access.service';
import { PropertyExperienceBoundaryService } from '../property-experience-boundary.service';
import { PropertyScopeService } from './property-scope.service';

@Injectable()
export class BusinessPropertyProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly scope: PropertyScopeService,
    private readonly boundary: PropertyExperienceBoundaryService,
  ) {}

  private async requireOrganizationParcels(identityId: string, organizationId: string) {
    await this.access.assertOrganizationAccess(organizationId, identityId);
    const parcelIds = await this.scope.listOrganizationParcelIds(organizationId);
    return parcelIds;
  }

  async getHome(identityId: string, organizationId: string) {
    const parcelIds = await this.requireOrganizationParcels(identityId, organizationId);
    const parcels = await this.prisma.propertyParcel.findMany({
      where: { id: { in: parcelIds } },
      take: 25,
    });

    return {
      organizationId,
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.rulesDisclaimer,
      parcelCount: parcelIds.length,
      parcels: parcels.map((parcel) => ({
        parcelReference: parcel.parcelReference,
        registryStatus: parcel.status,
      })),
    };
  }

  async listInterests(identityId: string, organizationId: string) {
    const parcelIds = await this.requireOrganizationParcels(identityId, organizationId);
    const interests = await this.prisma.propertyInterest.findMany({
      where: {
        organizationId,
        parcelId: { in: parcelIds },
        status: PropertyInterestStatus.ACTIVE,
      },
      include: { parcel: { select: { parcelReference: true } } },
    });

    return interests.map((interest) => ({
      interestId: interest.id,
      parcelReference: interest.parcel.parcelReference,
      interestKind: interest.interestKind,
    }));
  }

  async listTransactions(identityId: string, organizationId: string) {
    const parcelIds = await this.requireOrganizationParcels(identityId, organizationId);
    return this.prisma.propertyRegistryApplication.findMany({
      where: {
        parcelId: { in: parcelIds },
        applicationType: {
          in: [
            PropertyRegistryApplicationType.TRANSFER,
            PropertyRegistryApplicationType.ENCUMBRANCE,
            PropertyRegistryApplicationType.ENCUMBRANCE_RELEASE,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listActions(identityId: string, organizationId: string) {
    const parcelIds = await this.requireOrganizationParcels(identityId, organizationId);
    const pendingTransfers = await this.prisma.propertyRegistryApplication.count({
      where: {
        parcelId: { in: parcelIds },
        applicationType: PropertyRegistryApplicationType.TRANSFER,
        status: {
          in: [
            PropertyRegistryApplicationStatus.SUBMITTED,
            PropertyRegistryApplicationStatus.UNDER_REVIEW,
          ],
        },
      },
    });
    const encumbrances = await this.prisma.propertyEncumbrance.count({
      where: { parcelId: { in: parcelIds }, status: PropertyEncumbranceStatus.ACTIVE },
    });

    return { pendingTransfers, encumbrances };
  }
}
