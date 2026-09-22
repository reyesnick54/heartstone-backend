import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { EducationBoundaryService } from '../common/education-boundary.service';
import { SCHOLARSHIP_APPLICATION_PREFIX } from '../education.constants';

@Injectable()
export class ScholarshipApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EducationBoundaryService,
  ) {}

  async linkScholarshipApplicationProfile(input: {
    studentProfileId: string;
    caseId: string;
    applicationId: string;
  }) {
    const profile = await this.prisma.scholarshipApplicationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber: `${SCHOLARSHIP_APPLICATION_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`,
        studentProfileId: input.studentProfileId,
        caseId: input.caseId,
        applicationId: input.applicationId,
        doesNotCreateAward: true,
        recommendationOnly: true,
      },
    });

    this.boundary.assertScholarshipApplicationDoesNotCreateAward({
      doesNotCreateAward: profile.doesNotCreateAward,
      awardsCreated: 0,
    });

    return { profile, awardsCreated: 0 };
  }
}
