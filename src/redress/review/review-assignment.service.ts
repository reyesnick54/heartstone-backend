import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { isAppointmentCurrent } from '../../government/common/appointment-current.util';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface AssignReviewerInput {
  matterId: string;
  reviewerIdentityId: string;
  reviewerOfficeholderId: string;
  appointmentId?: string;
  originalDecisionMakerOfficeholderId?: string;
}

@Injectable()
export class ReviewAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async assignReviewer(input: AssignReviewerInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'review assignment');

    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: input.matterId },
      include: { challengedDecision: true },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${input.matterId} not found`);
    }

    const originalDecisionMakerId =
      input.originalDecisionMakerOfficeholderId ??
      matter.challengedDecision?.decisionMakerOfficeholderId;

    if (originalDecisionMakerId && originalDecisionMakerId === input.reviewerOfficeholderId) {
      throw new ForbiddenException('Original decision-maker cannot be assigned as reviewer');
    }

    if (input.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: input.appointmentId },
      });

      if (!appointment) {
        await this.safeHalt.triggerSafeHalt({
          matterId: input.matterId,
          reason: this.safeHalt.forReviewerInvalid(),
        });
        throw new BadRequestException('Reviewer appointment is invalid');
      }

      if (
        appointment.status !== AppointmentStatus.ACTIVE ||
        !isAppointmentCurrent(appointment) ||
        appointment.officeholderId !== input.reviewerOfficeholderId
      ) {
        await this.safeHalt.triggerSafeHalt({
          matterId: input.matterId,
          reason: this.safeHalt.forReviewerInvalid(),
        });
        throw new BadRequestException('Reviewer appointment is invalid');
      }
    }

    return this.prisma.reviewAssignment.create({
      data: {
        matterId: input.matterId,
        reviewerIdentityId: input.reviewerIdentityId,
        reviewerOfficeholderId: input.reviewerOfficeholderId,
        appointmentId: input.appointmentId,
        isBlocked: false,
      },
    });
  }

  async blockAssignment(assignmentId: string, blockedReason: string) {
    return this.prisma.reviewAssignment.update({
      where: { id: assignmentId },
      data: {
        isBlocked: true,
        blockedReason,
      },
    });
  }
}
