import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { GuardianEducationRelationshipStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SubjectAccessQueryDto } from '../../institutional-scope/dto/subject-access-query.dto';
import { ScopedResourceType } from '../../institutional-scope/institutional-scope.types';
import { SubjectRecordAccessService } from '../../institutional-scope/subject-record-access.service';
import { EducationAccessService } from '../common/education-access.service';
import { STUDENT_EDUCATION_PROFILE_PREFIX } from '../education.constants';

@Injectable()
export class StudentEducationProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: EducationAccessService,
    private readonly subjectRecordAccess: SubjectRecordAccessService,
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
    session: SessionContextDto,
    studentEducationProfileId: string,
    query: SubjectAccessQueryDto,
  ) {
    const profile = await this.prisma.studentEducationProfile.findUnique({
      where: { id: studentEducationProfileId },
    });
    if (!profile) {
      throw new NotFoundException('Student education profile not found');
    }

    if (profile.studentIdentityId === session.identityId) {
      return profile;
    }

    const now = new Date();
    const guardianLink = await this.prisma.guardianEducationRelationship.findFirst({
      where: {
        studentEducationProfileId,
        guardianIdentityId: session.identityId,
        status: GuardianEducationRelationshipStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
    });

    if (guardianLink) {
      await this.access.assertGuardianAuthorizedAccess({
        accessorIdentityId: session.identityId,
        studentEducationProfileId,
        endpoint: 'GET /api/v1/education/students/profiles/:id',
        requestedScope: 'viewEnrollmentSummary',
      });
      return profile;
    }

    await this.subjectRecordAccess.assertSubjectIdentityVisible(
      session,
      profile.studentIdentityId,
      {
        maskEnumeration: true,
        representativeAuthorityId: query.representativeAuthorityId,
      },
    );

    await this.subjectRecordAccess.assertScopedResourceVisibility(
      session,
      ScopedResourceType.STUDENT_EDUCATION_PROFILE,
      studentEducationProfileId,
      {
        maskEnumeration: true,
        representativeAuthorityId: query.representativeAuthorityId,
      },
    );

    return profile;
  }
}
