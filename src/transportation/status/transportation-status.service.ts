import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { TransportationActorPersona, TransportationRegistryLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface RecordDriverLicenseStatusInput {
  driverProfileId: string;
  driverLicenseRecordId: string;
  toLifecycleStatus: TransportationRegistryLifecycleStatus;
  statusCode?: string;
  actorIdentityId?: string;
  actorPersona: TransportationActorPersona;
  reason?: string;
}

@Injectable()
export class TransportationStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async recordDriverLicenseStatus(input: RecordDriverLicenseStatusInput) {
    const entry = await this.prisma.transportationStatusHistory.create({
      data: {
        id: randomUUID(),
        driverProfileId: input.driverProfileId,
        driverLicenseRecordId: input.driverLicenseRecordId,
        toLifecycleStatus: input.toLifecycleStatus,
        statusCode: input.statusCode,
        actorIdentityId: input.actorIdentityId,
        actorPersona: input.actorPersona,
        reason: input.reason,
      },
    });

    const historyCount = await this.prisma.transportationStatusHistory.count({
      where: { driverLicenseRecordId: input.driverLicenseRecordId },
    });

    return { entry, historyEntries: historyCount };
  }
}
