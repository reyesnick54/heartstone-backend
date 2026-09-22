import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BenefitAwardLifecycleStatus,
  BenefitSuspensionStatus,
  SocialProtectionActorPersona,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SocialProtectionBoundaryService } from '../common/social-protection-boundary.service';

@Injectable()
export class BenefitSuspensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: SocialProtectionBoundaryService,
  ) {}

  async proposeSuspension(input: {
    benefitAwardId: string;
    actorPersona: SocialProtectionActorPersona;
    reasonSummary?: string;
    functionAuthorityRecordId?: string;
    authorityEvaluationRecordId?: string;
    governmentDecisionId?: string;
    riskScoreTriggered?: boolean;
  }) {
    this.boundary.assertAiCannotTerminateBenefit(
      input.actorPersona,
      'SUSPEND_BENEFIT',
      input.riskScoreTriggered,
    );
    this.boundary.assertSuspensionRequiresConfiguredAuthority(input);

    const award = await this.prisma.benefitAward.findUnique({
      where: { id: input.benefitAwardId },
    });
    if (!award) {
      throw new NotFoundException('Benefit award not found');
    }

    const suspensionReference = `BNSS-${randomUUID().slice(0, 8).toUpperCase()}`;

    const suspension = await this.prisma.benefitSuspension.create({
      data: {
        id: randomUUID(),
        benefitAwardId: input.benefitAwardId,
        suspensionReference,
        status: BenefitSuspensionStatus.ACTIVE,
        reasonSummary: input.reasonSummary,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        governmentDecisionId: input.governmentDecisionId,
        actorPersona: input.actorPersona,
        effectiveFrom: new Date(),
      },
    });

    await this.prisma.benefitAward.update({
      where: { id: input.benefitAwardId },
      data: { lifecycleStatus: BenefitAwardLifecycleStatus.SUSPENDED },
    });

    return suspension;
  }
}
