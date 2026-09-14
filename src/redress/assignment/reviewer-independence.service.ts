import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  IdentityType,
  type ReviewerIndependenceAssessment,
  ReviewerIndependenceOutcome,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { REDRESS_REASON_CODES } from '../redress.constants';

export interface AssessReviewerIndependenceInput {
  reviewAssignmentId: string;
  reviewerIdentityId: string;
  reviewerIdentityType: IdentityType;
  originalDecisionMakerIdentityId: string;
  originalRecommenderIdentityId?: string;
  materialDirectionReference?: string;
  sameReportingLineProhibited?: boolean;
  priorAdvisoryInvolvement?: boolean;
  personalFinancialConflict?: boolean;
  professionalConflict?: boolean;
  otherSeparationRequirements?: string[];
  adminOverrideRequested?: boolean;
}

@Injectable()
export class ReviewerIndependenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
  ) {}

  async assessIndependence(
    input: AssessReviewerIndependenceInput,
  ): Promise<ReviewerIndependenceAssessment> {
    this.boundary.assertNoSystemAdministratorOverride(input.adminOverrideRequested);

    if (input.reviewerIdentityType === IdentityType.SERVICE) {
      throw new ForbiddenException(REDRESS_REASON_CODES.SYSTEM_ROLE_CANNOT_SATISFY_INDEPENDENCE);
    }

    const outcome = this.determineOutcome(input);

    return this.prisma.reviewerIndependenceAssessment.create({
      data: {
        reviewAssignmentId: input.reviewAssignmentId,
        originalDecisionMakerIdentityId: input.originalDecisionMakerIdentityId,
        originalRecommenderIdentityId: input.originalRecommenderIdentityId,
        outcome,
        materialDirectionReference: input.materialDirectionReference,
        sameReportingLineProhibited: input.sameReportingLineProhibited ?? false,
        priorAdvisoryInvolvement: input.priorAdvisoryInvolvement ?? false,
        personalFinancialConflict: input.personalFinancialConflict ?? false,
        professionalConflict: input.professionalConflict ?? false,
        otherSeparationRequirements: input.otherSeparationRequirements ?? [],
      },
    });
  }

  assertAssignmentPermitted(outcome: ReviewerIndependenceOutcome): void {
    if (outcome === ReviewerIndependenceOutcome.REQUIRES_RECUSAL) {
      throw new ForbiddenException(REDRESS_REASON_CODES.INDEPENDENCE_REQUIRES_RECUSAL);
    }

    if (
      outcome === ReviewerIndependenceOutcome.CONFLICT_IDENTIFIED ||
      outcome === ReviewerIndependenceOutcome.PRIOR_INVOLVEMENT_IDENTIFIED ||
      outcome === ReviewerIndependenceOutcome.UNRESOLVED
    ) {
      throw new ForbiddenException(REDRESS_REASON_CODES.MATERIAL_INVOLVEMENT_BLOCKED);
    }

    if (outcome === ReviewerIndependenceOutcome.REQUIRES_AUTHORIZED_EXCEPTION) {
      throw new ForbiddenException(REDRESS_REASON_CODES.INDEPENDENCE_UNRESOLVED);
    }
  }

  private determineOutcome(input: AssessReviewerIndependenceInput): ReviewerIndependenceOutcome {
    if (input.reviewerIdentityId === input.originalDecisionMakerIdentityId) {
      return ReviewerIndependenceOutcome.REQUIRES_RECUSAL;
    }

    if (
      input.originalRecommenderIdentityId &&
      input.reviewerIdentityId === input.originalRecommenderIdentityId
    ) {
      return ReviewerIndependenceOutcome.PRIOR_INVOLVEMENT_IDENTIFIED;
    }

    if (input.priorAdvisoryInvolvement) {
      return ReviewerIndependenceOutcome.PRIOR_INVOLVEMENT_IDENTIFIED;
    }

    if (input.personalFinancialConflict || input.professionalConflict) {
      return ReviewerIndependenceOutcome.CONFLICT_IDENTIFIED;
    }

    if (input.sameReportingLineProhibited) {
      return ReviewerIndependenceOutcome.CONFLICT_IDENTIFIED;
    }

    return ReviewerIndependenceOutcome.INDEPENDENT;
  }
}
