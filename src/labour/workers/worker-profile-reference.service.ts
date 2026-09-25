import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SubjectAccessQueryDto } from '../../institutional-scope/dto/subject-access-query.dto';
import { SubjectRecordAccessService } from '../../institutional-scope/subject-record-access.service';
import { WORKER_PROFILE_REFERENCE_PREFIX } from '../labour.constants';

@Injectable()
export class WorkerProfileReferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subjectRecordAccess: SubjectRecordAccessService,
  ) {}

  async createWorkerProfileReference(input: {
    workerIdentityId: string;
    jurisdictionId?: string;
    masterAdministrativeFileId?: string;
  }) {
    const profileReferenceNumber = `${WORKER_PROFILE_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.workerProfileReference.create({
      data: {
        id: randomUUID(),
        profileReferenceNumber,
        workerIdentityId: input.workerIdentityId,
        jurisdictionId: input.jurisdictionId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
      },
    });
  }

  async getWorkerProfileForSubject(
    session: SessionContextDto,
    workerProfileReferenceId: string,
    query: SubjectAccessQueryDto,
  ) {
    const profile = await this.prisma.workerProfileReference.findUnique({
      where: { id: workerProfileReferenceId },
    });
    if (!profile) {
      throw new NotFoundException('Worker profile reference not found');
    }

    if (profile.workerIdentityId !== session.identityId) {
      await this.subjectRecordAccess.assertSubjectIdentityVisible(session, profile.workerIdentityId, {
        maskEnumeration: true,
        representativeAuthorityId: query.representativeAuthorityId,
      });
    }

    return profile;
  }
}
