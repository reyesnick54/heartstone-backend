import { Injectable, NotFoundException } from '@nestjs/common';
import { CannabisAdministrationActorPersona, CannabisLicenceLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CannabisAdministrationAuthorityService } from '../common/cannabis-administration-authority.service';
import { CannabisAdministrationBoundaryService } from '../common/cannabis-administration-boundary.service';

@Injectable()
export class CannabisLicenceSuspensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CannabisAdministrationBoundaryService,
    private readonly authority: CannabisAdministrationAuthorityService,
  ) {}

  async suspendLicence(input: {
    cannabisLicenceRecordId: string;
    actorPersona: CannabisAdministrationActorPersona;
    actorIdentityId: string;
    officeholderId: string;
    appointmentId?: string;
    reasonSummary?: string;
    functionAuthorityRecordId?: string;
    authorityEvaluationRecordId?: string;
    governmentDecisionId?: string;
    aiAction?: string;
  }) {
    if (input.aiAction) {
      this.boundary.assertAiCannotIssueLicence(input.aiAction);
    }
    this.boundary.assertSuspensionRequiresConfiguredAuthority(input);

    await this.authority.assertLicenceSuspensionAuthority({
      identityId: input.actorIdentityId,
      officeholderId: input.officeholderId,
      appointmentId: input.appointmentId,
    });

    const licence = await this.prisma.cannabisLicenceRecord.findUnique({
      where: { id: input.cannabisLicenceRecordId },
    });
    if (!licence) {
      throw new NotFoundException('Cannabis licence record not found');
    }

    await this.prisma.cannabisLicenceStatusHistory.create({
      data: {
        cannabisLicenceRecordId: licence.id,
        fromStatus: licence.lifecycleStatus,
        toStatus: CannabisLicenceLifecycleStatus.SUSPENDED,
        actorIdentityId: input.actorIdentityId,
        actorPersona: input.actorPersona,
        reason: input.reasonSummary,
        governmentDecisionId: input.governmentDecisionId,
      },
    });

    return this.prisma.cannabisLicenceRecord.update({
      where: { id: licence.id },
      data: { lifecycleStatus: CannabisLicenceLifecycleStatus.SUSPENDED },
    });
  }
}
