import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SubjectAccessQueryDto } from '../../institutional-scope/dto/subject-access-query.dto';
import { SubjectRecordAccessService } from '../../institutional-scope/subject-record-access.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly subjectRecordAccess: SubjectRecordAccessService,
  ) {}

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

  async getProfileForSubject(
    session: SessionContextDto,
    subjectIdentityId: string,
    query: SubjectAccessQueryDto,
  ) {
    await this.subjectRecordAccess.assertSubjectIdentityVisible(session, subjectIdentityId, {
      representativeAuthorityId: query.representativeAuthorityId,
      maskEnumeration: true,
    });

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
