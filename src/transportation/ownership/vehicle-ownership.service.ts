import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { VehicleOwnershipPartyType, VehicleOwnershipRecordStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { TransportationBoundaryService } from '../common/transportation-boundary.service';
import { VEHICLE_TRANSFER_REFERENCE_PREFIX } from '../transportation.constants';

@Injectable()
export class VehicleOwnershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: TransportationBoundaryService,
  ) {}

  async registerInitialOwnership(input: {
    vehicleRecordId: string;
    ownerPartyType: VehicleOwnershipPartyType;
    ownerIdentityId?: string;
    ownerOrganizationId?: string;
    requesterIdentityId: string;
    hasRepresentativeAuthority?: boolean;
  }) {
    if (input.ownerPartyType === VehicleOwnershipPartyType.IDENTITY) {
      this.boundary.assertCitizenCannotRegisterAnotherOwnersVehicle({
        requesterIdentityId: input.requesterIdentityId,
        ownerIdentityId: input.ownerIdentityId,
        hasRepresentativeAuthority: input.hasRepresentativeAuthority ?? false,
      });
    }

    const ownership = await this.prisma.vehicleOwnershipRecord.create({
      data: {
        id: randomUUID(),
        vehicleRecordId: input.vehicleRecordId,
        ownerPartyType: input.ownerPartyType,
        ownerIdentityId: input.ownerIdentityId,
        ownerOrganizationId: input.ownerOrganizationId,
        isCurrent: true,
        status: VehicleOwnershipRecordStatus.CURRENT,
      },
    });

    await this.prisma.vehicleOwnershipHistory.create({
      data: {
        id: randomUUID(),
        vehicleRecordId: input.vehicleRecordId,
        toOwnershipRecordId: ownership.id,
        reasonCode: 'INITIAL_REGISTRATION',
      },
    });

    await this.prisma.vehicleRecord.update({
      where: { id: input.vehicleRecordId },
      data: { currentOwnershipRecordId: ownership.id },
    });

    return ownership;
  }

  async transferOwnership(input: {
    vehicleRecordId: string;
    fromOwnershipRecordId: string;
    toOwnerPartyType: VehicleOwnershipPartyType;
    toOwnerIdentityId?: string;
    toOwnerOrganizationId?: string;
    caseId?: string;
    governmentDecisionId?: string;
  }) {
    const vehicle = await this.prisma.vehicleRecord.findUnique({
      where: { id: input.vehicleRecordId },
      include: { currentOwnershipRecord: true },
    });
    if (!vehicle?.currentOwnershipRecord) {
      throw new NotFoundException('Vehicle ownership context not found');
    }

    const transferReference = `${VEHICLE_TRANSFER_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      await tx.vehicleOwnershipRecord.update({
        where: { id: input.fromOwnershipRecordId },
        data: {
          isCurrent: false,
          status: VehicleOwnershipRecordStatus.TRANSFERRED_OUT,
          supersededAt: new Date(),
          effectiveUntil: new Date(),
        },
      });

      const toOwnership = await tx.vehicleOwnershipRecord.create({
        data: {
          id: randomUUID(),
          vehicleRecordId: input.vehicleRecordId,
          ownerPartyType: input.toOwnerPartyType,
          ownerIdentityId: input.toOwnerIdentityId,
          ownerOrganizationId: input.toOwnerOrganizationId,
          isCurrent: true,
          status: VehicleOwnershipRecordStatus.CURRENT,
          governmentDecisionId: input.governmentDecisionId,
        },
      });

      const transfer = await tx.vehicleTransfer.create({
        data: {
          id: randomUUID(),
          transferReference,
          vehicleRecordId: input.vehicleRecordId,
          caseId: input.caseId,
          fromOwnershipRecordId: input.fromOwnershipRecordId,
          toOwnershipRecordId: toOwnership.id,
          governmentDecisionId: input.governmentDecisionId,
          preservesPriorOwnershipHistory: true,
        },
      });

      await tx.vehicleOwnershipHistory.create({
        data: {
          id: randomUUID(),
          vehicleRecordId: input.vehicleRecordId,
          fromOwnershipRecordId: input.fromOwnershipRecordId,
          toOwnershipRecordId: toOwnership.id,
          vehicleTransferId: transfer.id,
          reasonCode: 'TRANSFER',
        },
      });

      await tx.vehicleRecord.update({
        where: { id: input.vehicleRecordId },
        data: { currentOwnershipRecordId: toOwnership.id },
      });

      const historyCount = await tx.vehicleOwnershipHistory.count({
        where: { vehicleRecordId: input.vehicleRecordId },
      });

      return {
        transfer,
        toOwnership,
        priorOwnershipPreserved: true,
        ownershipHistoryEntries: historyCount,
      };
    });
  }
}
