import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { EDUCATION_STUDENT_PROFILE_PREFIX } from '../education.constants';

@Injectable()
export class EducationStudentProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureStudentProfile(input: { subjectIdentityId: string; jurisdictionId?: string }) {
    const existing = await this.prisma.educationStudentProfile.findFirst({
      where: { subjectIdentityId: input.subjectIdentityId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.educationStudentProfile.create({
      data: {
        id: randomUUID(),
        profileNumber: `${EDUCATION_STUDENT_PROFILE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`,
        subjectIdentityId: input.subjectIdentityId,
        jurisdictionId: input.jurisdictionId,
      },
    });
  }
}
