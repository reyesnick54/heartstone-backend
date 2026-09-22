import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';
import { EnrollmentRecordStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ENROLLMENT_REFERENCE_PREFIX } from '../education.constants';

@Injectable()
export class EnrollmentRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async createOfficialEnrollment(input: {
    studentEducationProfileId: string;
    educationInstitutionId: string;
    educationProgramVersionId?: string;
    educationAdmissionApplicationProfileId?: string;
  }) {
    if (input.educationAdmissionApplicationProfileId) {
      const applicationProfile = await this.prisma.educationAdmissionApplicationProfile.findUnique({
        where: { id: input.educationAdmissionApplicationProfileId },
      });
      if (applicationProfile?.doesNotCreateEnrollment) {
        // Enrollment is created only through explicit enrollment workflow, not at application link time.
      }
    }

    const enrollmentReference = `${ENROLLMENT_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const enrollment = await this.prisma.enrollmentRecord.create({
      data: {
        id: randomUUID(),
        enrollmentReference,
        studentEducationProfileId: input.studentEducationProfileId,
        educationInstitutionId: input.educationInstitutionId,
        educationProgramVersionId: input.educationProgramVersionId,
        educationAdmissionApplicationProfileId: input.educationAdmissionApplicationProfileId,
        status: EnrollmentRecordStatus.ACTIVE,
        admissionIsNotEnrollment: true,
      },
    });

    await this.prisma.enrollmentHistory.create({
      data: {
        id: randomUUID(),
        enrollmentRecordId: enrollment.id,
        toStatusCode: EnrollmentRecordStatus.ACTIVE,
      },
    });

    return enrollment;
  }

  assertApplicationLinkDidNotAutoEnroll(enrollmentsCreatedFromApplicationLink: number): void {
    if (enrollmentsCreatedFromApplicationLink > 0) {
      throw new BadRequestException(
        'Education application profile linking must not auto-create enrollment records',
      );
    }
  }
}
