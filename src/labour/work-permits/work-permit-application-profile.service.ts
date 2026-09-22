import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { LabourActorPersona } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { LabourBoundaryService } from '../common/labour-boundary.service';
import { WORK_PERMIT_APPLICATION_PROFILE_PREFIX } from '../labour.constants';

@Injectable()
export class WorkPermitApplicationProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: LabourBoundaryService,
  ) {}

  async linkWorkPermitApplicationProfile(input: {
    workerProfileReferenceId: string;
    caseId: string;
    applicationId: string;
    immigrationProfileId?: string;
    actorPersona?: LabourActorPersona;
  }) {
    if (input.actorPersona) {
      this.boundary.assertPaymentDoesNotApproveWorkPermit(input.actorPersona);
    }

    const profileNumber = `${WORK_PERMIT_APPLICATION_PROFILE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const profile = await this.prisma.workPermitApplicationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber,
        workerProfileReferenceId: input.workerProfileReferenceId,
        caseId: input.caseId,
        applicationId: input.applicationId,
        immigrationProfileId: input.immigrationProfileId,
        submissionAcknowledgedAt: new Date(),
        doesNotIssueWorkPermit: true,
        paymentDoesNotApprove: true,
      },
    });

    return { profile, workPermitsIssued: 0 };
  }
}
