import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { LabourAccessService } from '../common/labour-access.service';
import { WORKER_PROFILE_REFERENCE_PREFIX } from '../labour.constants';

@Injectable()
export class WorkerProfileReferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LabourAccessService,
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

  async getWorkerProfileForSubject(workerProfileReferenceId: string, requesterIdentityId: string) {
    await this.access.assertWorkerSelfAccess({
      accessorIdentityId: requesterIdentityId,
      workerProfileReferenceId,
      endpoint: 'GET worker profile',
    });

    const profile = await this.prisma.workerProfileReference.findUnique({
      where: { id: workerProfileReferenceId },
    });
    if (!profile) {
      throw new NotFoundException('Worker profile reference not found');
    }
    return profile;
  }
}
