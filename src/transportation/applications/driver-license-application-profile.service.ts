import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { DRIVER_LICENSE_APPLICATION_PROFILE_NUMBER_PREFIX } from '../transportation.constants';

@Injectable()
export class DriverLicenseApplicationProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async linkDriverLicenseApplicationProfile(input: {
    driverProfileId: string;
    caseId: string;
    applicationId: string;
    licenseProgramCode?: string;
  }) {
    const profileNumber = `${DRIVER_LICENSE_APPLICATION_PROFILE_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const profile = await this.prisma.driverLicenseApplicationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber,
        driverProfileId: input.driverProfileId,
        caseId: input.caseId,
        applicationId: input.applicationId,
        licenseProgramCode: input.licenseProgramCode,
        submissionAcknowledgedAt: new Date(),
        doesNotIssueDriverLicense: true,
      },
    });

    return { profile, driverLicenseRecordsCreated: 0 };
  }

  async getDriverLicenseApplicationProfile(id: string) {
    const profile = await this.prisma.driverLicenseApplicationProfile.findUnique({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`Driver license application profile "${id}" was not found`);
    }
    return profile;
  }
}
