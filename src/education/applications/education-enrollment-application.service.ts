import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { EducationBoundaryService } from '../common/education-boundary.service';
import { EDUCATION_ENROLLMENT_APPLICATION_PREFIX } from '../education.constants';

@Injectable()
export class EducationEnrollmentApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EducationBoundaryService,
  ) {}

  async linkEnrollmentApplicationProfile(input: {
    studentProfileId: string;
    caseId: string;
    applicationId: string;
  }) {
    const profile = await this.prisma.educationEnrollmentApplicationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber: `${EDUCATION_ENROLLMENT_APPLICATION_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`,
        studentProfileId: input.studentProfileId,
        caseId: input.caseId,
        applicationId: input.applicationId,
        submissionAcknowledgedAt: new Date(),
        doesNotGrantEnrollment: true,
      },
    });

    this.boundary.assertEnrollmentApplicationDoesNotGrantEnrollment({
      doesNotGrantEnrollment: profile.doesNotGrantEnrollment,
      enrollmentsCreated: 0,
    });

    return { profile, enrollmentsCreated: 0 };
  }
}
