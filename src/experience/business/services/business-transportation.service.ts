import { Injectable, NotFoundException } from '@nestjs/common';
import { TransportPermitLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { TransportationExperienceBoundaryService } from '../../../transportation/boundary/transportation-experience-boundary.service';
import { FleetAccessService } from '../../../transportation/fleet/fleet-access.service';
import { TRANSPORTATION_EXPERIENCE_DISCLAIMER } from '../../../transportation/transportation.constants';
import { BusinessAccessService } from '../../common/business-access.service';

@Injectable()
export class BusinessTransportationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessAccess: BusinessAccessService,
    private readonly fleetAccess: FleetAccessService,
    private readonly boundary: TransportationExperienceBoundaryService,
  ) {}

  private async requireOrganization(identityId: string, organizationId: string) {
    await this.businessAccess.assertOrganizationAccess(organizationId, identityId);
  }

  async getHome(identityId: string, organizationId: string) {
    await this.requireOrganization(identityId, organizationId);

    const operator = await this.prisma.transportOperatorRecord.findFirst({
      where: { operatorOrganizationId: organizationId },
      include: { transportPermits: true, operatorLicenses: true },
    });

    if (!operator) {
      throw new NotFoundException('No transport operator record is registered for this organization');
    }

    return {
      organizationId,
      ruleEnvironment: 'NON_PRODUCTION',
      disclaimer: TRANSPORTATION_EXPERIENCE_DISCLAIMER,
      operatorReferenceNumber: operator.operatorReferenceNumber,
      activePermits: operator.transportPermits.length,
      activeOperatorLicenses: operator.operatorLicenses.filter(
        (license) => license.lifecycleStatus === TransportPermitLifecycleStatus.EFFECTIVE,
      ).length,
    };
  }

  async listFleet(identityId: string, organizationId: string) {
    await this.requireOrganization(identityId, organizationId);
    this.fleetAccess.assertOrganizationMembership(organizationId, organizationId);

    return this.prisma.fleetRecord.findMany({
      where: { organizationId },
      include: { fleetVehicles: { include: { vehicleRecord: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listTransportPermits(identityId: string, organizationId: string) {
    await this.requireOrganization(identityId, organizationId);

    const operator = await this.prisma.transportOperatorRecord.findFirst({
      where: { operatorOrganizationId: organizationId },
    });
    if (!operator) {
      return [];
    }

    return this.prisma.transportPermit.findMany({
      where: { transportOperatorRecordId: operator.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listActions(identityId: string, organizationId: string) {
    await this.requireOrganization(identityId, organizationId);

    return {
      generatedAt: new Date().toISOString(),
      actions: [
        {
          actionCode: 'REGISTER_COMMERCIAL_VEHICLE',
          label: 'Register commercial vehicle',
          priority: 'MEDIUM',
        },
        { actionCode: 'MANAGE_FLEET', label: 'Manage fleet registration', priority: 'MEDIUM' },
        { actionCode: 'APPLY_TRANSPORT_PERMIT', label: 'Apply for transport permit', priority: 'LOW' },
      ],
    };
  }
}
