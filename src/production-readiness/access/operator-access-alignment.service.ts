import { Injectable, NotFoundException } from '@nestjs/common';
import {
  OperatorAccessReview,
  OperatorAccessReviewStatus,
  OperatorAccessReviewTrigger,
  OperatorQualificationStatus,
  QualificationExpiryEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface TriggerAccessReviewInput {
  operatorQualificationId: string;
  trigger: OperatorAccessReviewTrigger;
  initiatedByIdentityId: string;
  delegationId?: string;
  appointmentId?: string;
  findings?: string;
}

@Injectable()
export class OperatorAccessAlignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async triggerAccessReview(input: TriggerAccessReviewInput): Promise<OperatorAccessReview> {
    const qualification = await this.prisma.operatorQualification.findUnique({
      where: { id: input.operatorQualificationId },
    });

    if (!qualification) {
      throw new NotFoundException(`OperatorQualification ${input.operatorQualificationId} not found`);
    }

    const review = await this.prisma.operatorAccessReview.create({
      data: {
        operatorQualificationId: input.operatorQualificationId,
        trigger: input.trigger,
        status: OperatorAccessReviewStatus.PENDING,
        initiatedByIdentityId: input.initiatedByIdentityId,
        delegationId: input.delegationId,
        appointmentId: input.appointmentId,
        findings: input.findings,
        accessRetained: false,
      },
    });

    const statusUpdates: Partial<Record<OperatorAccessReviewTrigger, OperatorQualificationStatus>> = {
      [OperatorAccessReviewTrigger.OPERATOR_SUSPENDED]: OperatorQualificationStatus.SUSPENDED,
      [OperatorAccessReviewTrigger.QUALIFICATION_EXPIRED]: OperatorQualificationStatus.EXPIRED,
    };
    const nextStatus = statusUpdates[input.trigger];
    if (nextStatus) {
      await this.prisma.operatorQualification.update({
        where: { id: qualification.id },
        data: { status: nextStatus },
      });
    }

    return review;
  }

  async completeAccessReview(
    reviewId: string,
    accessRetained: boolean,
    findings?: string,
  ): Promise<OperatorAccessReview> {
    const review = await this.prisma.operatorAccessReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`OperatorAccessReview ${reviewId} not found`);
    }

    return this.prisma.operatorAccessReview.update({
      where: { id: reviewId },
      data: {
        status: OperatorAccessReviewStatus.COMPLETED,
        accessRetained,
        findings,
        completedAt: new Date(),
      },
    });
  }

  async recordQualificationExpiry(
    operatorQualificationId: string,
    eventType: QualificationExpiryEventType,
    recordedByIdentityId: string,
    notes?: string,
  ): Promise<{ expiryEvent: unknown; accessReview: OperatorAccessReview }> {
    const qualification = await this.prisma.operatorQualification.findUnique({
      where: { id: operatorQualificationId },
    });

    if (!qualification) {
      throw new NotFoundException(`OperatorQualification ${operatorQualificationId} not found`);
    }

    const expiryEvent = await this.prisma.qualificationExpiryEvent.create({
      data: {
        operatorQualificationId,
        eventType,
        recordedByIdentityId,
        expiredAt: new Date(),
        notes,
        accessReviewTriggered: true,
      },
    });

    const accessReview = await this.triggerAccessReview({
      operatorQualificationId,
      trigger: OperatorAccessReviewTrigger.QUALIFICATION_EXPIRED,
      initiatedByIdentityId: recordedByIdentityId,
      findings: `Qualification expiry event: ${eventType}`,
    });

    await this.prisma.operatorQualification.update({
      where: { id: operatorQualificationId },
      data: { status: OperatorQualificationStatus.EXPIRED },
    });

    return { expiryEvent, accessReview };
  }

  async onDelegationRevoked(
    operatorQualificationId: string,
    delegationId: string,
    initiatedByIdentityId: string,
  ): Promise<OperatorAccessReview> {
    return this.triggerAccessReview({
      operatorQualificationId,
      trigger: OperatorAccessReviewTrigger.DELEGATION_REVOKED,
      initiatedByIdentityId,
      delegationId,
      findings: 'Delegation revoked; operational access must be re-evaluated',
    });
  }

  async onAppointmentExpired(
    operatorQualificationId: string,
    appointmentId: string,
    initiatedByIdentityId: string,
  ): Promise<OperatorAccessReview> {
    return this.triggerAccessReview({
      operatorQualificationId,
      trigger: OperatorAccessReviewTrigger.APPOINTMENT_EXPIRED,
      initiatedByIdentityId,
      appointmentId,
      findings: 'Appointment expired; operational access must be re-evaluated',
    });
  }
}
