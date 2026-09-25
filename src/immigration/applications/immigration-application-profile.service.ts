import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SubjectRecordAccessService } from '../../institutional-scope/subject-record-access.service';
import {
  CITIZENSHIP_APPLICATION_PROFILE_NUMBER_PREFIX,
  RESIDENCY_APPLICATION_PROFILE_NUMBER_PREFIX,
  VISA_APPLICATION_PROFILE_NUMBER_PREFIX,
} from '../immigration.constants';

@Injectable()
export class ImmigrationApplicationProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subjectRecordAccess: SubjectRecordAccessService,
  ) {}

  async linkVisaApplicationProfile(input: {
    immigrationProfileId: string;
    caseId: string;
    applicationId: string;
    serviceCategoryCode?: string;
  }) {
    const profileNumber = `${VISA_APPLICATION_PROFILE_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const profile = await this.prisma.visaApplicationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber,
        immigrationProfileId: input.immigrationProfileId,
        caseId: input.caseId,
        applicationId: input.applicationId,
        serviceCategoryCode: input.serviceCategoryCode,
        submissionAcknowledgedAt: new Date(),
        doesNotIssueVisa: true,
      },
    });

    return { profile, visaPermissionsCreated: 0 };
  }

  async linkResidencyApplicationProfile(input: {
    immigrationProfileId: string;
    caseId: string;
    applicationId: string;
    residencyProgramCode?: string;
  }) {
    const profileNumber = `${RESIDENCY_APPLICATION_PROFILE_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const profile = await this.prisma.residencyApplicationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber,
        immigrationProfileId: input.immigrationProfileId,
        caseId: input.caseId,
        applicationId: input.applicationId,
        residencyProgramCode: input.residencyProgramCode,
        submissionAcknowledgedAt: new Date(),
        doesNotCreateResidency: true,
      },
    });

    return { profile, residencyStatusRecordsCreated: 0 };
  }

  async linkCitizenshipApplicationProfile(input: {
    immigrationProfileId: string;
    caseId: string;
    applicationId: string;
    programCode?: string;
  }) {
    const profileNumber = `${CITIZENSHIP_APPLICATION_PROFILE_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const profile = await this.prisma.citizenshipApplicationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber,
        immigrationProfileId: input.immigrationProfileId,
        caseId: input.caseId,
        applicationId: input.applicationId,
        programCode: input.programCode,
        submissionAcknowledgedAt: new Date(),
        doesNotGrantCitizenship: true,
      },
    });

    return { profile, citizenshipStatusRecordsCreated: 0 };
  }

  async getVisaApplicationProfile(session: SessionContextDto, id: string) {
    const profile = await this.prisma.visaApplicationProfile.findUnique({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`Visa application profile "${id}" was not found`);
    }

    await this.subjectRecordAccess.assertApplicationLinkedRecord(session, profile.applicationId, {
      maskEnumeration: true,
    });

    return profile;
  }
}
