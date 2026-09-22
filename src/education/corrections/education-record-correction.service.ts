import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { EducationActorPersona, EducationRecordCorrectionStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EducationBoundaryService } from '../common/education-boundary.service';

@Injectable()
export class EducationRecordCorrectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EducationBoundaryService,
  ) {}

  async submitCorrection(input: {
    studentProfileId: string;
    applicantIdentityId: string;
    correctionSummary: string;
    actorPersona?: EducationActorPersona;
  }) {
    const correction = await this.prisma.educationRecordCorrection.create({
      data: {
        id: randomUUID(),
        correctionReference: `EDU-COR-${randomUUID().slice(0, 8).toUpperCase()}`,
        studentProfileId: input.studentProfileId,
        applicantIdentityId: input.applicantIdentityId,
        correctionSummary: input.correctionSummary,
        status: EducationRecordCorrectionStatus.SUBMITTED,
      },
    });

    await this.prisma.educationRecordCorrectionHistory.create({
      data: {
        id: randomUUID(),
        educationRecordCorrectionId: correction.id,
        fromStatus: EducationRecordCorrectionStatus.DRAFT,
        toStatus: EducationRecordCorrectionStatus.SUBMITTED,
        changedFieldSummary: input.correctionSummary,
        actorIdentityId: input.applicantIdentityId,
        actorPersona: input.actorPersona ?? EducationActorPersona.STUDENT,
      },
    });

    this.boundary.assertCorrectionPreservesHistory(1);
    return correction;
  }
}
