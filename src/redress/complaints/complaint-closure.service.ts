import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ComplaintClosureReason, ComplaintPathwayActor, ComplaintStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ComplaintBoundaryService } from './complaint-boundary.service';

export interface CloseComplaintInput {
  complaintId: string;
  closureReason: ComplaintClosureReason;
  closureSummary: string;
  furtherRedressSummary?: string;
  authorIdentityId: string;
  actor: ComplaintPathwayActor;
}

@Injectable()
export class ComplaintClosureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplaintBoundaryService,
  ) {}

  async close(input: CloseComplaintInput) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: input.complaintId },
      include: {
        closure: true,
        relatedMatters: { include: { substantiveAppeal: true } },
        investigations: { include: { evidence: true } },
        governmentDecision: true,
      },
    });

    if (!complaint) {
      throw new NotFoundException(`Complaint ${input.complaintId} not found`);
    }

    if (complaint.closure) {
      throw new BadRequestException('Complaint is already closed');
    }

    const openAppeal = complaint.relatedMatters.find(
      (matter) =>
        matter.doesNotAutoClose &&
        matter.substantiveAppeal &&
        matter.substantiveAppeal.status !== 'CLOSED' &&
        matter.substantiveAppeal.status !== 'WITHDRAWN' &&
        matter.substantiveAppeal.status !== 'DECIDED',
    );

    if (openAppeal) {
      this.boundary.assertComplaintRemainsActiveWhenAppealOpen({
        complaintStatus: complaint.status,
        relatedAppealStatus: openAppeal.substantiveAppeal?.status,
        autoDismissAttempt: true,
      });
    }

    this.boundary.assertClosurePreservesEvidence(true, true);

    if (complaint.governmentDecisionId && !complaint.governmentDecision) {
      throw new BadRequestException('Complaint cannot erase substantive decision history');
    }

    return this.prisma.$transaction(async (tx) => {
      const closure = await tx.complaintClosure.create({
        data: {
          complaintId: input.complaintId,
          closureReason: input.closureReason,
          closureSummary: input.closureSummary,
          furtherRedressSummary: input.furtherRedressSummary,
          evidencePreserved: true,
          decisionHistoryPreserved: true,
          authorIdentityId: input.authorIdentityId,
          recordedByActor: input.actor,
        },
      });

      await tx.complaint.update({
        where: { id: input.complaintId },
        data: {
          status: ComplaintStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      return closure;
    });
  }
}
