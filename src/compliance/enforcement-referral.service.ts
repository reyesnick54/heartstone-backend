import { Injectable } from '@nestjs/common';
import { EnforcementReferralStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ComplianceBoundaryService } from './compliance-boundary.service';

export interface CreateEnforcementReferralInput {
  complianceEscalationId?: string;
  noncomplianceFindingId?: string;
  referredByIdentityId: string;
  referredByOfficeholderId: string;
  targetAuthorityReference: string;
}

@Injectable()
export class EnforcementReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplianceBoundaryService,
  ) {}

  async refer(input: CreateEnforcementReferralInput) {
    this.boundary.assertPhase9CannotCreateSuspensionDecision({
      isCreatingSuspensionDecision: false,
    });
    this.boundary.assertPhase9CannotPatchInstrumentStatus({});

    return this.prisma.enforcementReferral.create({
      data: {
        complianceEscalationId: input.complianceEscalationId,
        noncomplianceFindingId: input.noncomplianceFindingId,
        referredByIdentityId: input.referredByIdentityId,
        referredByOfficeholderId: input.referredByOfficeholderId,
        targetAuthorityReference: input.targetAuthorityReference,
        status: EnforcementReferralStatus.PREPARED,
      },
    });
  }

  async submit(referralId: string) {
    return this.prisma.enforcementReferral.update({
      where: { id: referralId },
      data: { status: EnforcementReferralStatus.SUBMITTED },
    });
  }
}
