import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { EducationActorPersona } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EducationBoundaryService } from '../common/education-boundary.service';
import { SCHOLARSHIP_APPLICATION_PROFILE_PREFIX } from '../education.constants';

@Injectable()
export class ScholarshipApplicationProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EducationBoundaryService,
  ) {}

  async linkScholarshipApplicationProfile(input: {
    studentEducationProfileId: string;
    scholarshipProgramReferenceId: string;
    caseId: string;
    applicationId: string;
    actorPersona?: EducationActorPersona;
  }) {
    if (input.actorPersona) {
      this.boundary.assertAiCannotApproveEducationDecision(
        input.actorPersona,
        'APPROVE_SCHOLARSHIP',
      );
    }

    const profileNumber = `${SCHOLARSHIP_APPLICATION_PROFILE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const profile = await this.prisma.scholarshipApplicationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber,
        studentEducationProfileId: input.studentEducationProfileId,
        scholarshipProgramReferenceId: input.scholarshipProgramReferenceId,
        caseId: input.caseId,
        applicationId: input.applicationId,
        doesNotCreateAward: true,
        aiRecommendationIsNotDecision: true,
      },
    });

    this.boundary.assertScholarshipApplicationDoesNotCreateAward({
      doesNotCreateAward: profile.doesNotCreateAward,
      awardsCreated: 0,
    });

    return { profile, awardsCreated: 0 };
  }
}
