import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalTrialConsentSignatureStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ClinicalTrialConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async recordConsentSignature(input: { participantProfileId: string; consentVersionId: string }) {
    const version = await this.prisma.clinicalTrialConsentVersion.findUnique({
      where: { id: input.consentVersionId },
    });
    if (!version) {
      throw new NotFoundException('Consent version not found');
    }

    return this.prisma.clinicalTrialConsentSignature.create({
      data: {
        participantProfileId: input.participantProfileId,
        consentVersionId: input.consentVersionId,
        status: ClinicalTrialConsentSignatureStatus.SIGNED,
        signedAt: new Date(),
        consentIsNotEnrollment: true,
      },
    });
  }
}
