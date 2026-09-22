import { Injectable } from '@nestjs/common';
import { DriverLicenseLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class TransportationScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async findDriverProfile(identityId: string) {
    return this.prisma.driverProfile.findFirst({
      where: { subjectIdentityId: identityId },
      include: {
        currentDriverLicenseRecord: {
          include: { licenseClasses: true, licenseEndorsements: true },
        },
      },
    });
  }

  async listAuthorizedVehicleRecords(identityId: string) {
    const ownerships = await this.prisma.vehicleOwnershipRecord.findMany({
      where: { ownerIdentityId: identityId, isCurrent: true },
      include: {
        vehicleRecord: {
          include: {
            currentRegistration: true,
            inspections: { orderBy: { completedAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    return ownerships.map((ownership) => ownership.vehicleRecord);
  }

  isSuspendedLicense(status: DriverLicenseLifecycleStatus | undefined): boolean {
    return status === DriverLicenseLifecycleStatus.SUSPENDED;
  }
}
