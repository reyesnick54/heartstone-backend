import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { EducationAccessService } from '../common/education-access.service';
import { STUDENT_EDUCATION_PROFILE_PREFIX } from '../education.constants';

@Injectable()
export class StudentEducationProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: EducationAccessService,
  ) {}

  async createStudentEducationProfile(input: {
    studentIdentityId: string;
    jurisdictionId?: string;
    masterAdministrativeFileId?: string;
  }) {
    const profileReferenceNumber = `${STUDENT_EDUCATION_PROFILE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const profile = await this.prisma.studentEducationProfile.create({
      data: {
        id: randomUUID(),
        profileReferenceNumber,
        studentIdentityId: input.studentIdentityId,
        jurisdictionId: input.jurisdictionId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        studentAccountIsNotEnrollment: true,
      },
    });

    return { profile, enrollmentsCreated: 0 };
  }

  async getStudentProfileForSubject(
    studentEducationProfileId: string,
    requesterIdentityId: string,
  ) {
    await this.access.assertStudentSelfAccess({
      accessorIdentityId: requesterIdentityId,
      studentEducationProfileId,
      endpoint: 'GET /api/v1/education/students/profiles/:id',
    });

    return this.prisma.studentEducationProfile.findUnique({
      where: { id: studentEducationProfileId },
    });
  }
}
