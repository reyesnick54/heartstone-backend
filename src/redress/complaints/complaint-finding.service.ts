import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplaintFindingStatus,
  ComplaintInvestigationFindingOutcome,
  ComplaintPathwayActor,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ComplaintBoundaryService } from './complaint-boundary.service';

export interface RecordComplaintFindingInput {
  complaintId: string;
  investigationId?: string;
  outcome: ComplaintInvestigationFindingOutcome;
  findingSummary: string;
  consequential?: boolean;
  actor: ComplaintPathwayActor;
}

export interface FinalizeComplaintFindingInput {
  findingId: string;
  reviewerIdentityId: string;
  actor: ComplaintPathwayActor;
}

@Injectable()
export class ComplaintFindingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplaintBoundaryService,
  ) {}

  async recordDraft(input: RecordComplaintFindingInput) {
    this.boundary.assertFindingIsNotAppealOutcome(false);
    this.boundary.assertAiCannotFinalizeComplaint(input.actor);

    const complaint = await this.prisma.complaint.findUnique({ where: { id: input.complaintId } });
    if (!complaint) {
      throw new NotFoundException(`Complaint ${input.complaintId} not found`);
    }

    return this.prisma.complaintFinding.create({
      data: {
        complaintId: input.complaintId,
        investigationId: input.investigationId,
        outcome: input.outcome,
        findingSummary: input.findingSummary,
        consequential: input.consequential ?? false,
        isSubstantiveAppealOutcome: false,
        status: ComplaintFindingStatus.DRAFT,
        recordedByActor: input.actor,
      },
    });
  }

  async finalize(input: FinalizeComplaintFindingInput) {
    const finding = await this.prisma.complaintFinding.findUnique({ where: { id: input.findingId } });
    if (!finding) {
      throw new NotFoundException(`ComplaintFinding ${input.findingId} not found`);
    }

    this.boundary.assertAuthorizedReviewerFinalizesFinding({
      actor: input.actor,
      consequential: finding.consequential,
      targetStatus: ComplaintFindingStatus.FINALIZED,
      reviewerIdentityId: input.reviewerIdentityId,
    });

    this.boundary.assertFindingIsNotAppealOutcome(finding.isSubstantiveAppealOutcome);

    return this.prisma.complaintFinding.update({
      where: { id: input.findingId },
      data: {
        status: ComplaintFindingStatus.FINALIZED,
        finalizedAt: new Date(),
        finalizedByIdentityId: input.reviewerIdentityId,
        recordedByActor: input.actor,
      },
    });
  }
}
