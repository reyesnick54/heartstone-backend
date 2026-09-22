import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { PUBLIC_VEHICLE_VERIFICATION_ALLOWED_FIELDS } from '../transportation.constants';

@Injectable()
export class PublicVehicleVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyByPublicToken(publicVerificationToken: string) {
    const vehicle = await this.prisma.vehicleRecord.findUnique({
      where: { publicVerificationToken },
      include: {
        currentRegistration: true,
        jurisdiction: true,
      },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehicle verification token not found');
    }

    const payload: Record<string, unknown> = {
      verificationState: vehicle.currentRegistration?.lifecycleStatus ?? 'UNKNOWN',
      registrationStatusLabel: vehicle.currentRegistration?.isCurrent
        ? 'Registration on file'
        : 'No current registration',
      vehicleCategoryCode: vehicle.vehicleCategoryCode,
      jurisdictionCode: vehicle.jurisdiction?.code,
      disclaimer:
        'Public vehicle verification is data-minimized and does not disclose owner identity or medical information.',
      ownerIdentityId: vehicle.currentOwnershipRecordId,
      vin: 'REDACTED',
      engineNumber: 'REDACTED',
    };

    const minimized: Record<string, unknown> = {};
    for (const key of PUBLIC_VEHICLE_VERIFICATION_ALLOWED_FIELDS) {
      if (key in payload) {
        minimized[key] = payload[key];
      }
    }
    return minimized;
  }
}
