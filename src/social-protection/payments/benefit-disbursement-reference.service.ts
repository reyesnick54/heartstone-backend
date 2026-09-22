import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { SocialProtectionActorPersona } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SocialProtectionBoundaryService } from '../common/social-protection-boundary.service';

@Injectable()
export class BenefitDisbursementReferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: SocialProtectionBoundaryService,
  ) {}

  async linkDisbursementReference(input: {
    benefitAwardId: string;
    paymentTransactionId?: string;
    actorPersona?: SocialProtectionActorPersona;
  }) {
    if (input.actorPersona) {
      this.boundary.assertPaymentDoesNotDetermineEligibility(input.actorPersona);
    }

    const disbursementReference = `BNDS-${randomUUID().slice(0, 8).toUpperCase()}`;

    const reference = await this.prisma.benefitDisbursementReference.create({
      data: {
        id: randomUUID(),
        benefitAwardId: input.benefitAwardId,
        disbursementReference,
        paymentTransactionId: input.paymentTransactionId,
        doesNotDetermineEligibility: true,
      },
    });

    return { reference, eligibilityRecordsModified: 0 };
  }
}
