import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReviewIndependenceOutcome } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface AssessIndependenceInput {
  assignmentId: string;
  assessedByIdentityId?: string;
  originalDecisionMakerBlocked?: boolean;
  priorInvolvementBlocked?: boolean;
  conflictBlocked?: boolean;
  explanation?: string;
}

@Injectable()
export class ReviewerIndependenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async assessIndependence(input: AssessIndependenceInput) {
    const assignment = await this.prisma.reviewAssignment.findUnique({
      where: { id: input.assignmentId },
      include: { matter: { include: { challengedDecision: true } } },
    });

    if (!assignment) {
      throw new NotFoundException(`ReviewAssignment ${input.assignmentId} not found`);
    }

    const originalDecisionMakerBlocked =
      input.originalDecisionMakerBlocked ??
      assignment.matter.challengedDecision?.decisionMakerOfficeholderId ===
        assignment.reviewerOfficeholderId;

    const priorInvolvementBlocked = input.priorInvolvementBlocked ?? false;
    const conflictBlocked = input.conflictBlocked ?? false;

    let outcome: ReviewIndependenceOutcome = ReviewIndependenceOutcome.INDEPENDENCE_ESTABLISHED;

    if (originalDecisionMakerBlocked || priorInvolvementBlocked || conflictBlocked) {
      outcome = ReviewIndependenceOutcome.INDEPENDENCE_BLOCKED;
    }

    const assessment = await this.prisma.reviewerIndependenceAssessment.upsert({
      where: { assignmentId: input.assignmentId },
      create: {
        assignmentId: input.assignmentId,
        outcome,
        originalDecisionMakerBlocked,
        priorInvolvementBlocked,
        conflictBlocked,
        assessedByIdentityId: input.assessedByIdentityId,
        explanation: input.explanation,
        assessedAt: new Date(),
      },
      update: {
        outcome,
        originalDecisionMakerBlocked,
        priorInvolvementBlocked,
        conflictBlocked,
        assessedByIdentityId: input.assessedByIdentityId,
        explanation: input.explanation,
        assessedAt: new Date(),
      },
    });

    if (outcome === ReviewIndependenceOutcome.INDEPENDENCE_BLOCKED) {
      await this.prisma.reviewAssignment.update({
        where: { id: input.assignmentId },
        data: {
          isBlocked: true,
          blockedReason: 'Reviewer independence not established',
        },
      });

      await this.safeHalt.triggerSafeHalt({
        matterId: assignment.matterId,
        reason: this.safeHalt.forIndependenceNotEstablished(),
      });
    }

    return assessment;
  }

  assertIndependenceEstablished(outcome: ReviewIndependenceOutcome): void {
    if (outcome !== ReviewIndependenceOutcome.INDEPENDENCE_ESTABLISHED) {
      throw new BadRequestException('Reviewer independence must be established before proceeding');
    }
  }
}
