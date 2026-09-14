import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplaintEscalationTarget,
  ComplaintPathwayActor,
  ComplaintRemedyType,
  ComplaintStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  PRIVACY_ESCALATION_TARGET,
  PROFESSIONAL_CONDUCT_ESCALATION_TARGET,
  SECURITY_ESCALATION_TARGET,
} from '../redress.constants';
import { ComplaintBoundaryService } from './complaint-boundary.service';

export interface RecordCorrectiveActionInput {
  complaintId: string;
  remedyType: ComplaintRemedyType;
  description: string;
  authorIdentityId: string;
  actor: ComplaintPathwayActor;
}

export interface EscalateComplaintInput {
  complaintId: string;
  escalationTarget: ComplaintEscalationTarget;
  reasonSummary: string;
  authorIdentityId: string;
  actor: ComplaintPathwayActor;
}

@Injectable()
export class ComplaintRemedyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplaintBoundaryService,
  ) {}

  async recordCorrectiveAction(input: RecordCorrectiveActionInput) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: input.complaintId },
      include: { governmentDecision: true },
    });

    if (!complaint) {
      throw new NotFoundException(`Complaint ${input.complaintId} not found`);
    }

    this.boundary.assertRemedyDoesNotSilentlyReverseDecision({
      remedyType: input.remedyType,
      mayReverseFinalDecision: false,
      decisionStatus: complaint.governmentDecision?.decisionStatus,
      authorizedSubstantiveReviewOnly: true,
    });

    const action = await this.prisma.$transaction(async (tx) => {
      const created = await tx.complaintCorrectiveAction.create({
        data: {
          complaintId: input.complaintId,
          remedyType: input.remedyType,
          description: input.description,
          mayReverseFinalDecision: false,
          authorizedSubstantiveReviewOnly: true,
          authorIdentityId: input.authorIdentityId,
          recordedByActor: input.actor,
        },
      });

      await tx.complaint.update({
        where: { id: input.complaintId },
        data: { status: ComplaintStatus.REMEDY_PENDING },
      });

      return created;
    });

    return action;
  }

  async escalate(input: EscalateComplaintInput) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: input.complaintId },
      include: { classifications: true },
    });

    if (!complaint) {
      throw new NotFoundException(`Complaint ${input.complaintId} not found`);
    }

    this.validateSpecializedReferral(complaint.classifications.map((item) => item.category), input.escalationTarget);

    const escalation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.complaintEscalation.create({
        data: {
          complaintId: input.complaintId,
          escalationTarget: input.escalationTarget,
          reasonSummary: input.reasonSummary,
          authorIdentityId: input.authorIdentityId,
          recordedByActor: input.actor,
        },
      });

      await tx.complaint.update({
        where: { id: input.complaintId },
        data: { status: ComplaintStatus.ESCALATED },
      });

      return created;
    });

    return escalation;
  }

  private validateSpecializedReferral(categories: string[], target: ComplaintEscalationTarget): void {
    if (
      target === PROFESSIONAL_CONDUCT_ESCALATION_TARGET &&
      !categories.includes('PROFESSIONAL_CONDUCT')
    ) {
      throw new BadRequestException(
        'Professional body referral requires a professional conduct complaint classification',
      );
    }

    if (
      (target === PRIVACY_ESCALATION_TARGET || target === SECURITY_ESCALATION_TARGET) &&
      !categories.some((category) => ['PRIVACY', 'SECURITY', 'UNAUTHORIZED_DISCLOSURE'].includes(category))
    ) {
      throw new BadRequestException(
        'Privacy or security incident referral requires a matching complaint classification',
      );
    }
  }
}
