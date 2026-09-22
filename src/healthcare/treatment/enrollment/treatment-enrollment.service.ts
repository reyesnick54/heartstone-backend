import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ClinicalSuitabilityOutcome,
  HealthcareActorPersona,
  TreatmentEnrollmentStatus,
  TreatmentProgramLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { TreatmentBoundaryService } from '../common/treatment-boundary.service';

@Injectable()
export class TreatmentEnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: TreatmentBoundaryService,
  ) {}

  async proposeEnrollment(input: { enrollmentId: string; fromReferralOnly?: boolean }) {
    const enrollment = await this.prisma.treatmentEnrollment.findUnique({
      where: { id: input.enrollmentId },
      include: {
        treatmentProgram: true,
        treatmentReferral: true,
        treatmentEligibilityReview: true,
      },
    });
    if (!enrollment) {
      throw new NotFoundException('Treatment enrollment not found');
    }

    if (enrollment.status === TreatmentEnrollmentStatus.PROPOSED) {
      this.boundary.assertSuspendedProgramBlocksNewEnrollment({
        lifecycleStatus: enrollment.treatmentProgram.lifecycleStatus,
        blocksNewEnrollmentWhenSuspended:
          enrollment.treatmentProgram.blocksNewEnrollmentWhenSuspended,
      });
    }

    if (input.fromReferralOnly && enrollment.treatmentReferral) {
      this.boundary.assertReferralDoesNotEqualEnrollment({
        doesNotEqualEnrollment: enrollment.treatmentReferral.doesNotEqualEnrollment,
        enrollmentCreatedFromReferralAlone: true,
      });
    }

    const review = enrollment.treatmentEligibilityReview;
    if (
      review &&
      review.clinicalSuitabilityOutcome !== ClinicalSuitabilityOutcome.CLINICALLY_SUITABLE
    ) {
      throw new BadRequestException(
        'Enrollment requires finalized clinical suitability when a review is linked',
      );
    }

    return enrollment;
  }

  async appendStatusHistory(input: {
    enrollmentId: string;
    toStatus: TreatmentEnrollmentStatus;
    actorIdentityId?: string;
    actorPersona?: HealthcareActorPersona;
    reasonSummary?: string;
  }) {
    const enrollment = await this.prisma.treatmentEnrollment.findUnique({
      where: { id: input.enrollmentId },
    });
    if (!enrollment) {
      throw new NotFoundException('Treatment enrollment not found');
    }

    const history = await this.prisma.treatmentEnrollmentStatusHistory.create({
      data: {
        treatmentEnrollmentId: input.enrollmentId,
        fromStatus: enrollment.status,
        toStatus: input.toStatus,
        actorIdentityId: input.actorIdentityId,
        actorPersona: input.actorPersona,
        reasonSummary: input.reasonSummary,
      },
    });

    return this.prisma.treatmentEnrollment.update({
      where: { id: input.enrollmentId },
      data: {
        status: input.toStatus,
        currentStatusHistoryId: history.id,
        enrolledAt:
          input.toStatus === TreatmentEnrollmentStatus.ACTIVE
            ? (enrollment.enrolledAt ?? new Date())
            : enrollment.enrolledAt,
      },
      include: { statusHistory: { orderBy: { changedAt: 'asc' } } },
    });
  }

  assertProgramAllowsEnrollment(lifecycleStatus: TreatmentProgramLifecycleStatus, blocks: boolean) {
    if (lifecycleStatus === TreatmentProgramLifecycleStatus.SUSPENDED && blocks) {
      throw new BadRequestException('Treatment program suspension prevents new enrollment');
    }
  }
}
