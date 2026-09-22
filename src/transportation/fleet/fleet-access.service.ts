import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { TransportationBoundaryService } from '../common/transportation-boundary.service';
import { type FleetAuthorizedScope } from '../transportation.constants';

@Injectable()
export class FleetAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: TransportationBoundaryService,
  ) {}

  async assertFleetVehicleAccess(input: {
    fleetRecordId: string;
    requesterOrganizationId: string;
    scope: FleetAuthorizedScope;
    requested: 'viewFleetVehicles' | 'manageFleetVehicles';
  }): Promise<void> {
    const fleet = await this.prisma.fleetRecord.findUnique({ where: { id: input.fleetRecordId } });
    if (!fleet) {
      throw new NotFoundException('Fleet record not found');
    }

    this.boundary.assertFleetOrganizationScope({
      organizationId: fleet.organizationId,
      requesterOrganizationId: input.requesterOrganizationId,
      authorizedScope: input.scope,
      requested: input.requested,
    });
  }

  assertOrganizationMembership(
    requiredOrganizationId: string,
    memberOrganizationId?: string,
  ): void {
    if (requiredOrganizationId !== memberOrganizationId) {
      throw new ForbiddenException('Business fleet access requires organization scope');
    }
  }
}
