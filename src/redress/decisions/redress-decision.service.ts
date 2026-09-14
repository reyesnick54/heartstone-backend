import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  RedressDecisionOutcome,
  RedressDecisionStatus,
  RedressMatterStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';
import { REDRESS_DECISION_NUMBER_PREFIX } from '../redress.constants';

export interface RecordRedressDecisionInput {
  matterId: string;
  outcome: RedressDecisionOutcome;
  deciderIdentityId: string;
  deciderOfficeholderId: string;
  functionAuthorityRecordId: string;
  appointmentId?: string;
  delegationId?: string;
  isRecommendation?: boolean;
  isFinalDisposition?: boolean;
  findings?: { findingSummary: string; sortOrder?: number }[];
  reasons?: { reasonSummary: string; isMaterial?: boolean; sortOrder?: number }[];
  remedies?: {
    remedySummary: string;
    remedyDefinitionId?: string;
    isSubstantive?: boolean;
  }[];
}

@Injectable()
export class RedressDecisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly actorResolver: InstitutionalActorResolver,
    private readonly boundary: RedressBoundaryService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async recordDecision(input: RecordRedressDecisionInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'redress disposition');

    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: input.matterId },
      include: { routeVersion: true },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${input.matterId} not found`);
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.deciderIdentityId },
    });

    if (!identity?.type || !this.actorResolver.isHumanActor(identity.type)) {
      throw new ForbiddenException('Redress disposition requires a human institutional actor');
    }

    this.boundary.assertRecommendationNotFinal(
      input.isRecommendation ?? false,
      input.isFinalDisposition ?? false,
    );

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.deciderIdentityId,
      officeholderId: input.deciderOfficeholderId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.HEAR_REVIEW,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      await this.safeHalt.triggerSafeHalt({
        matterId: input.matterId,
        reason: this.safeHalt.forAuthorityUnresolved(),
      });
      throw new ForbiddenException('Redress disposition requires HEAR_REVIEW authority ALLOW');
    }

    for (const remedy of input.remedies ?? []) {
      if (remedy.isSubstantive) {
        this.boundary.assertSubstantiveRemedyPermitted(
          matter.routeVersion?.permitsSubstantiveChange ?? true,
          true,
        );
      }
    }

    if (input.outcome === RedressDecisionOutcome.RECOMMENDATION && input.isFinalDisposition) {
      throw new BadRequestException('Recommendation cannot be marked as final disposition');
    }

    const decisionNumber = `${REDRESS_DECISION_NUMBER_PREFIX}-${String(Date.now())}-${input.matterId.slice(0, 8)}`;

    const decision = await this.prisma.redressDecision.create({
      data: {
        matterId: input.matterId,
        decisionNumber,
        outcome: input.outcome,
        status: RedressDecisionStatus.RECORDED,
        isRecommendation:
          input.isRecommendation ?? input.outcome === RedressDecisionOutcome.RECOMMENDATION,
        isFinalDisposition: input.isFinalDisposition ?? false,
        isImplemented: false,
        deciderIdentityId: input.deciderIdentityId,
        deciderOfficeholderId: input.deciderOfficeholderId,
        authorityEvaluationRecordId: authorityResult.evaluationId,
        originalDecisionPreserved: true,
        decidedAt: new Date(),
        findings: input.findings ? { create: input.findings } : undefined,
        reasons: input.reasons ? { create: input.reasons } : undefined,
        remedies: input.remedies
          ? {
              create: input.remedies.map((r) => ({
                remedySummary: r.remedySummary,
                remedyDefinitionId: r.remedyDefinitionId,
                isSubstantive: r.isSubstantive ?? false,
                isAuthorized: true,
              })),
            }
          : undefined,
      },
      include: { findings: true, reasons: true, remedies: true },
    });

    await this.prisma.redressMatter.update({
      where: { id: input.matterId },
      data: {
        status: input.isFinalDisposition
          ? RedressMatterStatus.IMPLEMENTATION
          : RedressMatterStatus.DECISION_PENDING,
      },
    });

    return decision;
  }

  async findById(decisionId: string) {
    const decision = await this.prisma.redressDecision.findUnique({
      where: { id: decisionId },
      include: {
        findings: { orderBy: { sortOrder: 'asc' } },
        reasons: { orderBy: { sortOrder: 'asc' } },
        remedies: true,
        authorityEvaluationRecord: true,
      },
    });

    if (!decision) {
      throw new NotFoundException(`RedressDecision ${decisionId} not found`);
    }

    return decision;
  }
}
