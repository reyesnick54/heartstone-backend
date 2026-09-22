import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalTrialInterestStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ClinicalTrialInterestService {
  constructor(private readonly prisma: PrismaService) {}

  async expressInterest(input: { clinicalTrialId: string; participantProfileId: string }) {
    const trial = await this.prisma.clinicalTrial.findUnique({
      where: { id: input.clinicalTrialId },
    });
    if (!trial) {
      throw new NotFoundException('Clinical trial not found');
    }

    return this.prisma.clinicalTrialInterest.create({
      data: {
        clinicalTrialId: input.clinicalTrialId,
        participantProfileId: input.participantProfileId,
        status: ClinicalTrialInterestStatus.EXPRESSED,
        interestIsNotEnrollment: true,
      },
    });
  }
}
