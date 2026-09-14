import { Injectable, NotFoundException } from '@nestjs/common';
import { EmploymentEvidenceClassification, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';

export interface RecordEmploymentEvidenceInput {
  profileId: string;
  classification: EmploymentEvidenceClassification;
  headcount: number;
  evidenceRecordRefs?: Prisma.InputJsonValue;
  independentVerificationRefs?: Prisma.InputJsonValue;
  recordedByIdentityId: string;
  isAiActor?: boolean;
}

@Injectable()
export class EmploymentEvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: StrategicProjectBoundaryService,
  ) {}

  async recordEmploymentEvidence(input: RecordEmploymentEvidenceInput) {
    const profile = await this.prisma.strategicProjectProfile.findUnique({
      where: { id: input.profileId },
    });

    if (!profile) {
      throw new NotFoundException(`StrategicProjectProfile ${input.profileId} not found`);
    }

    if (input.classification === EmploymentEvidenceClassification.ACTIVE_VERIFIED) {
      this.boundary.assertAiCannotPerformStrategicProjectAction(
        'COUNT_FORECAST_AS_EMPLOYMENT',
        input.isAiActor,
      );
    }

    this.boundary.assertForecastIsNotVerifiedEmployment(input.classification);

    return this.prisma.employmentEvidenceRecord.create({
      data: {
        profileId: input.profileId,
        classification: input.classification,
        headcount: input.headcount,
        evidenceRecordRefs: input.evidenceRecordRefs ?? [],
        independentVerificationRefs: input.independentVerificationRefs ?? [],
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });
  }

  async getVerifiedEmploymentHeadcount(profileId: string): Promise<number> {
    const records = await this.prisma.employmentEvidenceRecord.findMany({
      where: {
        profileId,
        classification: EmploymentEvidenceClassification.ACTIVE_VERIFIED,
      },
    });

    return records.reduce((sum, record) => sum + record.headcount, 0);
  }

  async getForecastHeadcount(profileId: string): Promise<number> {
    const records = await this.prisma.employmentEvidenceRecord.findMany({
      where: {
        profileId,
        classification: EmploymentEvidenceClassification.FORECAST,
      },
    });

    return records.reduce((sum, record) => sum + record.headcount, 0);
  }
}
