import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { EducationActorPersona } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EducationBoundaryService } from '../common/education-boundary.service';
import { ADMISSION_APPLICATION_PROFILE_PREFIX } from '../education.constants';

@Injectable()
export class EducationAdmissionApplicationProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EducationBoundaryService,
  ) {}

  async linkAdmissionApplicationProfile(input: {
    studentEducationProfileId: string;
    caseId: string;
    applicationId: string;
    actorPersona?: EducationActorPersona;
  }) {
    if (input.actorPersona) {
      this.boundary.assertPaymentDoesNotCreateAdmission(input.actorPersona);
    }

    const profileNumber = `${ADMISSION_APPLICATION_PROFILE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const profile = await this.prisma.educationAdmissionApplicationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber,
        studentEducationProfileId: input.studentEducationProfileId,
        caseId: input.caseId,
        applicationId: input.applicationId,
        doesNotCreateEnrollment: true,
        doesNotGrantAdmission: true,
        paymentDoesNotCreateAdmission: true,
      },
    });

    this.boundary.assertApplicationDoesNotCreateEnrollment({
      doesNotCreateEnrollment: profile.doesNotCreateEnrollment,
      enrollmentsCreated: 0,
    });

    return { profile, enrollmentsCreated: 0 };
  }
}
