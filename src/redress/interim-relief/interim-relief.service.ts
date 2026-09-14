import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  IdentityType,
  InterimReliefDecisionOutcome,
  InterimReliefRequestStatus,
  InterimReliefRequestType,
  Prisma,
  ReviewInterimEffect,
  ReviewStayRecordStatus,
  ReviewStayStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';

export interface RequestInterimReliefInput {
  redressMatterId: string;
  requestType: InterimReliefRequestType;
  groundsSummary: string;
  requestedByIdentityId?: string;
}

export interface DecideInterimReliefInput {
  interimReliefRequestId: string;
  outcome: InterimReliefDecisionOutcome;
  reviewerIdentityId: string;
  reviewerOfficeholderId: string;
  appointmentId?: string;
  delegationId?: string;
  actorType: IdentityType;
  reasonsSummary?: string;
  stayScope?: string;
  effectiveAt?: Date;
  expiresAt?: Date;
  conditions?: unknown[];
}

const STAY_RELATED_TYPES: InterimReliefRequestType[] = [
  InterimReliefRequestType.STAY,
  InterimReliefRequestType.PARTIAL_STAY,
];

@Injectable()
export class InterimReliefService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly actorResolver: InstitutionalActorResolver,
  ) {}

  async requestInterimRelief(input: RequestInterimReliefInput) {
    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: input.redressMatterId },
      include: { routeVersion: true, decisionReviewReference: true },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${input.redressMatterId} not found`);
    }

    const permissibleTypes = matter.routeVersion.permissibleInterimReliefTypes as string[];
    this.boundary.assertInterimReliefPermittedForRoute(input.requestType, permissibleTypes);

    return this.prisma.interimReliefRequest.create({
      data: {
        redressMatterId: matter.id,
        requestType: input.requestType,
        groundsSummary: input.groundsSummary,
        requestedByIdentityId: input.requestedByIdentityId,
      },
    });
  }

  async decideInterimRelief(input: DecideInterimReliefInput) {
    this.boundary.assertHumanReviewer(input.actorType);

    const request = await this.prisma.interimReliefRequest.findUnique({
      where: { id: input.interimReliefRequestId },
      include: {
        redressMatter: {
          include: {
            routeVersion: true,
            decisionReviewReference: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`InterimReliefRequest ${input.interimReliefRequestId} not found`);
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.reviewerIdentityId },
    });

    if (!identity?.type || !this.actorResolver.isHumanActor(identity.type)) {
      throw new ForbiddenException('Only authorized human officeholders may decide interim relief');
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.reviewerIdentityId,
      functionAuthorityRecordId: request.redressMatter.routeVersion.functionAuthorityRecordId,
      action: AuthorityActionType.HEAR_REVIEW,
      officeholderId: input.reviewerOfficeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(
        'Fresh authority evaluation is required for interim relief decisions',
      );
    }

    const decision = await this.prisma.interimReliefDecision.create({
      data: {
        interimReliefRequestId: request.id,
        outcome: input.outcome,
        reviewerIdentityId: input.reviewerIdentityId,
        reviewerOfficeholderId: input.reviewerOfficeholderId,
        functionAuthorityRecordId: request.redressMatter.routeVersion.functionAuthorityRecordId,
        authorityEvaluationRecordId: authorityResult.evaluationId,
        reasonsSummary: input.reasonsSummary,
      },
    });

    await this.prisma.interimReliefRequest.update({
      where: { id: request.id },
      data: { status: InterimReliefRequestStatus.DECIDED },
    });

    const grantsStay =
      STAY_RELATED_TYPES.includes(request.requestType) &&
      (input.outcome === InterimReliefDecisionOutcome.GRANTED ||
        input.outcome === InterimReliefDecisionOutcome.PARTIALLY_GRANTED);

    if (grantsStay) {
      this.boundary.assertStayIsNotReversal(false);

      const stay = await this.prisma.reviewStayRecord.create({
        data: {
          redressMatterId: request.redressMatterId,
          decisionReviewReferenceId: request.redressMatter.decisionReviewReferenceId,
          interimReliefDecisionId: decision.id,
          challengedDecisionId: request.redressMatter.challengedDecisionId,
          challengedInstrumentId: request.redressMatter.challengedInstrumentId,
          scope: input.stayScope ?? request.requestType,
          authorityReference: request.redressMatter.routeVersion.functionAuthorityRecordId,
          groundsSummary: input.reasonsSummary ?? request.groundsSummary,
          effectiveAt: input.effectiveAt ?? new Date(),
          expiresAt: input.expiresAt,
          conditions: (input.conditions ?? []) as Prisma.InputJsonValue,
          status: ReviewStayRecordStatus.ACTIVE,
          deciderIdentityId: input.reviewerIdentityId,
          deciderOfficeholderId: input.reviewerOfficeholderId,
          functionAuthorityRecordId: request.redressMatter.routeVersion.functionAuthorityRecordId,
          authorityEvaluationRecordId: authorityResult.evaluationId,
          isReversal: false,
        },
      });

      if (request.redressMatter.decisionReviewReferenceId) {
        await this.prisma.decisionReviewReference.update({
          where: { id: request.redressMatter.decisionReviewReferenceId },
          data: {
            stayStatus: ReviewStayStatus.INTERIM_STAY_AUTHORIZED,
            interimEffect:
              request.requestType === InterimReliefRequestType.PARTIAL_STAY
                ? ReviewInterimEffect.PARTIAL_STAY
                : ReviewInterimEffect.FULL_STAY,
          },
        });
      }

      return { decision, stay };
    }

    if (request.redressMatter.decisionReviewReferenceId) {
      await this.prisma.decisionReviewReference.update({
        where: { id: request.redressMatter.decisionReviewReferenceId },
        data: { stayStatus: ReviewStayStatus.STAY_DENIED },
      });
    }

    return { decision, stay: null };
  }
}
