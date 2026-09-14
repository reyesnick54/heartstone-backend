import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  DelegationStatus,
  IdentityType,
  ReviewAssignmentStatus,
  ReviewProceedingKind,
  ReviewerIndependenceOutcome,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { isAppointmentCurrent } from '../../government/common/appointment-current.util';
import { REDRESS_REASON_CODES, REVIEW_ASSIGNMENT_NUMBER_PREFIX } from '../redress.constants';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { ReviewerIndependenceService } from './reviewer-independence.service';

export interface AssignReviewerInput {
  proceedingKind: ReviewProceedingKind;
  reconsiderationProceedingId?: string;
  internalAdministrativeReviewId?: string;
  reviewerIdentityId: string;
  reviewerIdentityType: IdentityType;
  reviewerOfficeholderId: string;
  appointmentId: string;
  delegationId?: string;
  jurisdictionId: string;
  functionAuthorityRecordId: string;
  scope: string;
  requiredReviewerLevel: string;
  reviewerLevel: string;
  originalDecisionMakerIdentityId: string;
  originalRecommenderIdentityId?: string;
  priorAdvisoryInvolvement?: boolean;
  personalFinancialConflict?: boolean;
  professionalConflict?: boolean;
  sameReportingLineProhibited?: boolean;
  effectiveUntil?: Date;
  at?: Date;
}

@Injectable()
export class ReviewAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly independenceService: ReviewerIndependenceService,
  ) {}

  async assignReviewer(input: AssignReviewerInput) {
    this.boundary.assertAssignmentDoesNotCreateAuthority();
    this.boundary.assertTechnicalPermissionDoesNotCreateReviewAuthority();
    this.assertProceedingTarget(input);

    const at = input.at ?? new Date();
    const proceeding = await this.resolveProceeding(input);

    this.boundary.assertJurisdictionMatches(proceeding.jurisdictionId, input.jurisdictionId);
    this.boundary.assertReviewerLevelSufficient(
      proceeding.requiredReviewerLevel,
      input.reviewerLevel,
    );

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.reviewerIdentityId },
    });

    if (!identity) {
      throw new NotFoundException('Reviewer identity not found');
    }

    const officeholder = await this.prisma.officeholder.findUnique({
      where: { id: input.reviewerOfficeholderId },
    });

    if (!officeholder) {
      throw new NotFoundException('Reviewer officeholder not found');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: input.appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (!isAppointmentCurrent(appointment, at)) {
      throw new BadRequestException(REDRESS_REASON_CODES.EXPIRED_APPOINTMENT);
    }

    if (appointment.officeholderId !== input.reviewerOfficeholderId) {
      throw new BadRequestException('Appointment does not match officeholder');
    }

    if (input.delegationId) {
      const delegation = await this.prisma.delegation.findUnique({
        where: { id: input.delegationId },
      });

      if (!delegation || delegation.status === DelegationStatus.REVOKED) {
        throw new BadRequestException(REDRESS_REASON_CODES.REVOKED_DELEGATION);
      }
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: input.reviewerIdentityId,
      officeholderId: input.reviewerOfficeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.HEAR_REVIEW,
      at,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(REDRESS_REASON_CODES.MISSING_AUTHORITY);
    }

    const assignmentNumber = await this.generateAssignmentNumber();

    const assignment = await this.prisma.reviewAssignment.create({
      data: {
        assignmentNumber,
        proceedingKind: input.proceedingKind,
        reconsiderationProceedingId: input.reconsiderationProceedingId,
        internalAdministrativeReviewId: input.internalAdministrativeReviewId,
        reviewerIdentityId: input.reviewerIdentityId,
        reviewerOfficeholderId: input.reviewerOfficeholderId,
        appointmentId: input.appointmentId,
        delegationId: input.delegationId,
        jurisdictionId: input.jurisdictionId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        scope: input.scope,
        requiredReviewerLevel: input.requiredReviewerLevel,
        status: ReviewAssignmentStatus.PENDING_VALIDATION,
        effectiveUntil: input.effectiveUntil,
        authorityEvaluationRecordId: evaluation.evaluationId,
      },
    });

    const independence = await this.independenceService.assessIndependence({
      reviewAssignmentId: assignment.id,
      reviewerIdentityId: input.reviewerIdentityId,
      reviewerIdentityType: input.reviewerIdentityType,
      originalDecisionMakerIdentityId: input.originalDecisionMakerIdentityId,
      originalRecommenderIdentityId: input.originalRecommenderIdentityId,
      priorAdvisoryInvolvement: input.priorAdvisoryInvolvement,
      personalFinancialConflict: input.personalFinancialConflict,
      professionalConflict: input.professionalConflict,
      sameReportingLineProhibited: input.sameReportingLineProhibited,
    });

    try {
      this.independenceService.assertAssignmentPermitted(independence.outcome);
    } catch (error) {
      await this.prisma.reviewAssignment.update({
        where: { id: assignment.id },
        data: {
          status:
            independence.outcome === ReviewerIndependenceOutcome.REQUIRES_RECUSAL
              ? ReviewAssignmentStatus.RECUSED
              : ReviewAssignmentStatus.BLOCKED_INDEPENDENCE,
        },
      });
      throw error;
    }

    await this.prisma.reviewAuthorityAssessment.create({
      data: {
        reviewAssignmentId: assignment.id,
        authorityEvaluationRecordId: evaluation.evaluationId,
        competenceVerified: true,
        accessRightsVerified: true,
        decisionScopeVerified: true,
        reviewerLevelVerified: true,
      },
    });

    return this.prisma.reviewAssignment.update({
      where: { id: assignment.id },
      data: { status: ReviewAssignmentStatus.ACTIVE },
      include: {
        independenceAssessment: true,
        authorityAssessment: true,
      },
    });
  }

  assignmentCreatesAuthority(): boolean {
    return false;
  }

  private assertProceedingTarget(input: AssignReviewerInput): void {
    const hasReconsideration = Boolean(input.reconsiderationProceedingId);
    const hasInternal = Boolean(input.internalAdministrativeReviewId);

    if (hasReconsideration === hasInternal) {
      throw new BadRequestException(REDRESS_REASON_CODES.PROCEEDING_TARGET_REQUIRED);
    }
  }

  private async resolveProceeding(input: AssignReviewerInput) {
    if (input.reconsiderationProceedingId) {
      const proceeding = await this.prisma.reconsiderationProceeding.findUnique({
        where: { id: input.reconsiderationProceedingId },
      });

      if (!proceeding) {
        throw new NotFoundException('Reconsideration proceeding not found');
      }

      return proceeding;
    }

    const review = await this.prisma.internalAdministrativeReview.findUnique({
      where: { id: input.internalAdministrativeReviewId },
    });

    if (!review) {
      throw new NotFoundException('Internal administrative review not found');
    }

    return review;
  }

  private async generateAssignmentNumber(): Promise<string> {
    const count = await this.prisma.reviewAssignment.count();
    return `${REVIEW_ASSIGNMENT_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;
  }
}
