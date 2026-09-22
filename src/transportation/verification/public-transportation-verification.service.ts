import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import {
  PUBLIC_VEHICLE_VERIFICATION_ALLOWED_FIELDS,
  TRANSPORTATION_PUBLIC_VERIFICATION_DISCLAIMER,
} from '../transportation.constants';

export interface PublicLicenseVerificationResponse {
  verificationKind: 'DRIVER_LICENSE';
  lifecycleStatus: string;
  expiresAt: string | null;
  verificationTimestamp: string;
  disclaimer: string;
}

export interface PublicOperatorVerificationResponse {
  verificationKind: 'TRANSPORT_OPERATOR';
  lifecycleStatus: string;
  verificationTimestamp: string;
  disclaimer: string;
}

@Injectable()
export class PublicTransportationVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyLicenseReference(reference: string): Promise<PublicLicenseVerificationResponse> {
    const record = await this.prisma.driverLicenseRecord.findFirst({
      where: { licenseNumber: reference },
    });

    if (!record) {
      throw new NotFoundException('Verification reference not found');
    }

    return {
      verificationKind: 'DRIVER_LICENSE',
      lifecycleStatus: record.lifecycleStatus,
      expiresAt: record.validUntil?.toISOString() ?? null,
      verificationTimestamp: new Date().toISOString(),
      disclaimer: TRANSPORTATION_PUBLIC_VERIFICATION_DISCLAIMER,
    };
  }

  async verifyVehicleRegistration(reference: string): Promise<Record<string, unknown>> {
    const vehicle = await this.prisma.vehicleRecord.findFirst({
      where: {
        OR: [{ publicVerificationToken: reference }, { vehicleReferenceNumber: reference }],
      },
      include: { currentRegistration: true, jurisdiction: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Verification reference not found');
    }

    const payload: Record<string, unknown> = {
      verificationState: vehicle.currentRegistration?.lifecycleStatus ?? 'UNKNOWN',
      registrationStatusLabel: vehicle.currentRegistration?.isCurrent
        ? 'Registration on file'
        : 'No current registration',
      vehicleCategoryCode: vehicle.vehicleCategoryCode,
      jurisdictionCode: vehicle.jurisdiction?.code,
      disclaimer: TRANSPORTATION_PUBLIC_VERIFICATION_DISCLAIMER,
    };

    const minimized: Record<string, unknown> = {};
    for (const key of PUBLIC_VEHICLE_VERIFICATION_ALLOWED_FIELDS) {
      if (key in payload) {
        minimized[key] = payload[key];
      }
    }
    return minimized;
  }

  async verifyTransportOperator(reference: string): Promise<PublicOperatorVerificationResponse> {
    const operator = await this.prisma.transportOperatorRecord.findFirst({
      where: { operatorReferenceNumber: reference },
      include: {
        operatorLicenses: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!operator) {
      throw new NotFoundException('Verification reference not found');
    }

    const license = operator.operatorLicenses[0];

    return {
      verificationKind: 'TRANSPORT_OPERATOR',
      lifecycleStatus: license?.lifecycleStatus ?? 'UNKNOWN',
      verificationTimestamp: new Date().toISOString(),
      disclaimer: TRANSPORTATION_PUBLIC_VERIFICATION_DISCLAIMER,
    };
  }
}
