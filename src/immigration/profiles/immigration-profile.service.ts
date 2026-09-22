import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { IMMIGRATION_PROFILE_NUMBER_PREFIX } from '../immigration.constants';

export interface CreateImmigrationProfileInput {
  subjectIdentityId: string;
  jurisdictionId?: string;
  masterAdministrativeFileId?: string;
  recordsClassificationReference?: string;
  dataCompartmentCode?: string;
}

@Injectable()
export class ImmigrationProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(input: CreateImmigrationProfileInput) {
    const profileNumber = `${IMMIGRATION_PROFILE_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.immigrationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber,
        subjectIdentityId: input.subjectIdentityId,
        jurisdictionId: input.jurisdictionId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        recordsClassificationReference: input.recordsClassificationReference,
        dataCompartmentCode: input.dataCompartmentCode,
      },
    });
  }

  async getProfileForSubject(subjectIdentityId: string, requesterIdentityId: string) {
    if (subjectIdentityId !== requesterIdentityId) {
      throw new NotFoundException('Immigration profile not found');
    }
    const profile = await this.prisma.immigrationProfile.findFirst({
      where: { subjectIdentityId },
      orderBy: { createdAt: 'desc' },
    });
    if (!profile) {
      throw new NotFoundException('Immigration profile not found');
    }
    return profile;
  }
}
