import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FinancialLicenceLifecycleStatus,
  FinancialServicesActorPersona,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { FinancialServicesAuthorityService } from '../common/financial-services-authority.service';
import { FinancialServicesBoundaryService } from '../common/financial-services-boundary.service';

@Injectable()
export class FinancialLicenceSuspensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: FinancialServicesBoundaryService,
    private readonly authority: FinancialServicesAuthorityService,
  ) {}

  async suspendLicence(input: {
    financialLicenceRecordId: string;
    actorPersona: FinancialServicesActorPersona;
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

    const licence = await this.prisma.financialLicenceRecord.findUnique({
      where: { id: input.financialLicenceRecordId },
    });
    if (!licence) {
      throw new NotFoundException('Financial licence record not found');
    }

    await this.prisma.financialLicenceStatusHistory.create({
      data: {
        financialLicenceRecordId: licence.id,
        fromStatus: licence.lifecycleStatus,
        toStatus: FinancialLicenceLifecycleStatus.SUSPENDED,
        actorIdentityId: input.actorIdentityId,
        actorPersona: input.actorPersona,
        reason: input.reasonSummary,
        governmentDecisionId: input.governmentDecisionId,
      },
    });

    return this.prisma.financialLicenceRecord.update({
      where: { id: licence.id },
      data: { lifecycleStatus: FinancialLicenceLifecycleStatus.SUSPENDED },
    });
  }
}
