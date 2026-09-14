import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  InterimReliefOutcome,
  ReviewInterimEffect,
  ReviewStayStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { InstrumentLifecycleService } from '../../instruments/lifecycle/instrument-lifecycle.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface RequestInterimReliefInput {
  matterId: string;
  requestedByIdentityId: string;
  scopeDescription?: string;
}

export interface DecideInterimReliefInput {
  requestId: string;
  deciderIdentityId: string;
  deciderOfficeholderId: string;
  functionAuthorityRecordId: string;
  appointmentId?: string;
  delegationId?: string;
  outcome: InterimReliefOutcome;
  challengedInstrumentId?: string;
  reviewReferenceId?: string;
}

@Injectable()
export class InterimReliefService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly actorResolver: InstitutionalActorResolver,
    private readonly instrumentLifecycle: InstrumentLifecycleService,
    private readonly boundary: RedressBoundaryService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async requestRelief(input: RequestInterimReliefInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'interim relief request');

    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: input.matterId },
      include: { routeVersion: true },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${input.matterId} not found`);
    }

    this.boundary.assertNoAutoStay(
      matter.routeVersion?.automaticStayOnFiling ?? false,
      false,
    );

    return this.prisma.interimReliefRequest.create({
      data: {
        matterId: input.matterId,
        requestedByIdentityId: input.requestedByIdentityId,
        scopeDescription: input.scopeDescription,
        outcome: InterimReliefOutcome.PENDING,
      },
    });
  }

  async decideRelief(input: DecideInterimReliefInput) {
    const request = await this.prisma.interimReliefRequest.findUnique({
      where: { id: input.requestId },
      include: { matter: { include: { routeVersion: true } } },
    });

    if (!request) {
      throw new NotFoundException(`InterimReliefRequest ${input.requestId} not found`);
    }

    if (request.outcome !== InterimReliefOutcome.PENDING) {
      throw new BadRequestException('Interim relief request has already been decided');
    }

    await this.safeHalt.assertMatterNotSafeHalted(request.matterId, 'interim relief decision');

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.deciderIdentityId },
    });

    if (!identity?.type || !this.actorResolver.isHumanActor(identity.type)) {
      throw new ForbiddenException('Interim relief decision requires human institutional actor');
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.deciderIdentityId,
      officeholderId: input.deciderOfficeholderId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.HEAR_REVIEW,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Interim stay requires authority evaluation ALLOW');
    }

    const updated = await this.prisma.interimReliefRequest.update({
      where: { id: input.requestId },
      data: {
        outcome: input.outcome,
        decidedByIdentityId: input.deciderIdentityId,
        decidedByOfficeholderId: input.deciderOfficeholderId,
        authorityEvaluationRecordId: authorityResult.evaluationId,
        decidedAt: new Date(),
      },
    });

    if (input.outcome === InterimReliefOutcome.GRANTED) {
      const stayRecord = await this.prisma.reviewStayRecord.create({
        data: {
          matterId: request.matterId,
          interimReliefRequestId: input.requestId,
          challengedInstrumentId: input.challengedInstrumentId,
          stayGranted: true,
          scopeDescription: request.scopeDescription,
          effectiveAt: new Date(),
          authorityEvaluationRecordId: authorityResult.evaluationId,
        },
      });

      if (input.reviewReferenceId) {
        await this.instrumentLifecycle.authorizeStay({
          reviewReferenceId: input.reviewReferenceId,
          stayStatus: ReviewStayStatus.INTERIM_STAY_AUTHORIZED,
          interimEffect: ReviewInterimEffect.FULL_STAY,
        });
      }

      return { request: updated, stayRecord };
    }

    return { request: updated };
  }
}
