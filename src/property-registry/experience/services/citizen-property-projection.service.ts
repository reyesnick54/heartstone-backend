import { Injectable } from '@nestjs/common';
import {
  PropertyEncumbranceStatus,
  PropertyInterestStatus,
  PropertyRegistryApplicationStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { PropertyExperienceBoundaryService } from '../property-experience-boundary.service';
import { PropertyScopeService } from './property-scope.service';

@Injectable()
export class CitizenPropertyProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: PropertyScopeService,
    private readonly boundary: PropertyExperienceBoundaryService,
  ) {}

  private async authorizedParcelFilter(identityId: string) {
    const parcelIds = await this.scope.listCitizenParcelIds(identityId);
    return { id: { in: parcelIds } };
  }

  async getHome(identityId: string) {
    const parcelIds = await this.scope.listCitizenParcelIds(identityId);
    const parcels = await this.prisma.propertyParcel.findMany({
      where: { id: { in: parcelIds } },
      take: 25,
    });

    return {
      generatedAt: new Date().toISOString(),
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.rulesDisclaimer,
      parcelCount: parcelIds.length,
      parcels: parcels.map((parcel) => ({
        parcelId: parcel.id,
        parcelReference: parcel.parcelReference,
        registryStatus: parcel.status,
        relationshipSummary: 'Authorized interest or entitlement',
      })),
    };
  }

  async listInterests(identityId: string) {
    const parcelFilter = await this.authorizedParcelFilter(identityId);
    const interests = await this.prisma.propertyInterest.findMany({
      where: {
        identityId,
        parcel: parcelFilter,
        status: PropertyInterestStatus.ACTIVE,
      },
      include: { parcel: { select: { parcelReference: true, status: true } } },
    });

    return interests.map((interest) => ({
      interestId: interest.id,
      parcelReference: interest.parcel.parcelReference,
      interestKind: interest.interestKind,
      registryStatus: interest.parcel.status,
      titleSummary: `${interest.interestKind} interest`,
    }));
  }

  async listApplications(identityId: string) {
    const parcelIds = await this.scope.listCitizenParcelIds(identityId);
    return this.prisma.propertyRegistryApplication.findMany({
      where: {
        OR: [{ applicantIdentityId: identityId }, { parcelId: { in: parcelIds } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listDocuments(identityId: string) {
    const parcelFilter = await this.authorizedParcelFilter(identityId);
    const certificates = await this.prisma.propertyRegistryCertificate.findMany({
      where: { parcel: parcelFilter },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    return certificates.map((certificate) => ({
      certificateReference: certificate.certificateReference,
      registryVersionNumber: certificate.registryVersionNumber,
      status: certificate.status,
    }));
  }

  async listActions(identityId: string) {
    const parcelIds = await this.scope.listCitizenParcelIds(identityId);
    const [pendingApplications, activeEncumbrances] = await Promise.all([
      this.prisma.propertyRegistryApplication.count({
        where: {
          parcelId: { in: parcelIds },
          status: {
            in: [
              PropertyRegistryApplicationStatus.SUBMITTED,
              PropertyRegistryApplicationStatus.UNDER_REVIEW,
              PropertyRegistryApplicationStatus.PENDING_DECISION,
            ],
          },
        },
      }),
      this.prisma.propertyEncumbrance.count({
        where: { parcelId: { in: parcelIds }, status: PropertyEncumbranceStatus.ACTIVE },
      }),
    ]);

    return {
      pendingApplications,
      activeEncumbrances,
      suggestedActions: pendingApplications > 0 ? ['Track application status'] : [],
    };
  }
}
