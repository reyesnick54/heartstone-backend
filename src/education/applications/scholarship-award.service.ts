import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';
import { ScholarshipAwardStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EducationBoundaryService } from '../common/education-boundary.service';

@Injectable()
export class ScholarshipAwardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EducationBoundaryService,
  ) {}

  async recordAwardAfterDecision(input: {
    scholarshipApplicationProfileId: string;
    governmentDecisionId: string;
  }) {
    const application = await this.prisma.scholarshipApplicationProfile.findUnique({
      where: { id: input.scholarshipApplicationProfileId },
    });
    if (!application) {
      throw new BadRequestException('Scholarship application profile not found');
    }

    this.boundary.assertScholarshipAwardRequiresDecisionWorkflow({
      requiresDecisionWorkflow: true,
      governmentDecisionId: input.governmentDecisionId,
    });

    return this.prisma.scholarshipAwardRecord.upsert({
      where: { scholarshipApplicationProfileId: input.scholarshipApplicationProfileId },
      create: {
        id: randomUUID(),
        awardReference: `EDU-SCH-AWD-${randomUUID().slice(0, 8).toUpperCase()}`,
        scholarshipApplicationProfileId: input.scholarshipApplicationProfileId,
        status: ScholarshipAwardStatus.AWARDED,
        requiresDecisionWorkflow: true,
        governmentDecisionId: input.governmentDecisionId,
        awardedAt: new Date(),
      },
      update: {
        status: ScholarshipAwardStatus.AWARDED,
        governmentDecisionId: input.governmentDecisionId,
        awardedAt: new Date(),
      },
    });
  }
}
