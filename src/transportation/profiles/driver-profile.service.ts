import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { DRIVER_PROFILE_NUMBER_PREFIX } from '../transportation.constants';

@Injectable()
export class DriverProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(input: {
    subjectIdentityId: string;
    jurisdictionId?: string;
    masterAdministrativeFileId?: string;
    recordsClassificationReference?: string;
  }) {
    const profileNumber = `${DRIVER_PROFILE_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.driverProfile.create({
      data: {
        id: randomUUID(),
        profileNumber,
        subjectIdentityId: input.subjectIdentityId,
        jurisdictionId: input.jurisdictionId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        recordsClassificationReference: input.recordsClassificationReference,
      },
    });
  }

  async getProfileForSubject(subjectIdentityId: string, requesterIdentityId: string) {
    if (subjectIdentityId !== requesterIdentityId) {
      throw new NotFoundException('Driver profile not found');
    }
    const profile = await this.prisma.driverProfile.findFirst({
      where: { subjectIdentityId },
      orderBy: { createdAt: 'desc' },
    });
    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }
    return profile;
  }
}
