import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  RedressMatterStatus,
  RedressStandingOutcome,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface AssessStandingInput {
  matterId: string;
  assessorIdentityId: string;
  assessorOfficeholderId: string;
  functionAuthorityRecordId: string;
  appointmentId?: string;
  delegationId?: string;
  outcome: RedressStandingOutcome;
  explanation?: string;
}

@Injectable()
export class RedressStandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly actorResolver: InstitutionalActorResolver,
    private readonly boundary: RedressBoundaryService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async assessStanding(input: AssessStandingInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'standing assessment');

    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: input.matterId },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${input.matterId} not found`);
    }

    this.boundary.assertFilingDoesNotEstablishStanding();

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.assessorIdentityId },
    });

    if (!identity?.type || !this.actorResolver.isHumanActor(identity.type)) {
      throw new ForbiddenException('Standing assessment requires a human institutional actor');
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.assessorIdentityId,
      officeholderId: input.assessorOfficeholderId,
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
      throw new ForbiddenException('Standing assessment requires authority evaluation ALLOW');
    }

    if (input.outcome === RedressStandingOutcome.STANDING_ESTABLISHED) {
      this.boundary.assertFilingDoesNotEstablishStanding(
        'Filing establishes standing is not permitted',
      );
    }

    const assessment = await this.prisma.redressStandingAssessment.create({
      data: {
        matterId: input.matterId,
        outcome: input.outcome,
        assessedByIdentityId: input.assessorIdentityId,
        assessedByOfficeholderId: input.assessorOfficeholderId,
        authorityEvaluationRecordId: authorityResult.evaluationId,
        explanation: input.explanation,
        assessedAt: new Date(),
      },
    });

    await this.prisma.redressMatter.update({
      where: { id: input.matterId },
      data: { status: RedressMatterStatus.STANDING_ASSESSMENT },
    });

    return assessment;
  }

  async getLatestAssessment(matterId: string) {
    return this.prisma.redressStandingAssessment.findFirst({
      where: { matterId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
