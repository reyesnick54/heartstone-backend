import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ClinicalResearchActorPersona,
  ClinicalTrialEnrollmentStatus,
  ClinicalTrialWithdrawalReasonCategory,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ClinicalTrialWithdrawalService {
  constructor(private readonly prisma: PrismaService) {}

  async withdrawParticipant(input: {
    enrollmentId: string;
    reasonCategory: ClinicalTrialWithdrawalReasonCategory;
    reasonSummary: string;
    recordedByPersona: ClinicalResearchActorPersona;
    recordedByIdentityId?: string;
  }) {
    const enrollment = await this.prisma.clinicalTrialEnrollment.findUnique({
      where: { id: input.enrollmentId },
      include: { withdrawal: true, statusHistory: true },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    if (enrollment.withdrawal) {
      throw new BadRequestException('Enrollment already withdrawn');
    }

    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.clinicalTrialWithdrawal.create({
        data: {
          enrollmentId: input.enrollmentId,
          reasonCategory: input.reasonCategory,
          reasonSummary: input.reasonSummary,
          recordedByPersona: input.recordedByPersona,
          recordedByIdentityId: input.recordedByIdentityId,
          preservesParticipationHistory: true,
        },
      });

      const updatedEnrollment = await tx.clinicalTrialEnrollment.update({
        where: { id: input.enrollmentId },
        data: { status: ClinicalTrialEnrollmentStatus.WITHDRAWN },
      });

      await tx.clinicalTrialEnrollmentStatusHistory.create({
        data: {
          enrollmentId: input.enrollmentId,
          fromStatus: enrollment.status,
          toStatus: ClinicalTrialEnrollmentStatus.WITHDRAWN,
          actorPersona: input.recordedByPersona,
          actorIdentityId: input.recordedByIdentityId,
          reasonSummary: input.reasonSummary,
        },
      });

      const historyCount = await tx.clinicalTrialEnrollmentStatusHistory.count({
        where: { enrollmentId: input.enrollmentId },
      });

      return {
        withdrawal,
        enrollment: updatedEnrollment,
        participationHistoryPreserved: historyCount > 0 && withdrawal.preservesParticipationHistory,
        priorStatusHistoryCount: enrollment.statusHistory.length,
      };
    });
  }
}
