import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  RedressMatterStatus,
  RedressTimelinessOutcome,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface AssessTimelinessInput {
  matterId: string;
  assessorIdentityId: string;
  assessorOfficeholderId: string;
  functionAuthorityRecordId: string;
  appointmentId?: string;
  delegationId?: string;
  filingDeadline: Date;
  actualFilingDate: Date;
  outcome: RedressTimelinessOutcome;
  explanation?: string;
}

@Injectable()
export class RedressTimelinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly actorResolver: InstitutionalActorResolver,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async assessTimeliness(input: AssessTimelinessInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'timeliness assessment');

    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: input.matterId },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${input.matterId} not found`);
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.assessorIdentityId },
    });

    if (!identity?.type || !this.actorResolver.isHumanActor(identity.type)) {
      throw new ForbiddenException('Timeliness assessment requires a human institutional actor');
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
      throw new ForbiddenException('Timeliness assessment requires authority evaluation ALLOW');
    }

    const computedLate = input.actualFilingDate > input.filingDeadline;
    if (input.outcome === RedressTimelinessOutcome.TIMELY && computedLate) {
      throw new ForbiddenException('Cannot record TIMELY when filing date exceeds deadline');
    }

    if (input.outcome === RedressTimelinessOutcome.LATE && !computedLate) {
      throw new ForbiddenException('Cannot record LATE when filing date is within deadline');
    }

    const assessment = await this.prisma.redressTimelinessAssessment.create({
      data: {
        matterId: input.matterId,
        outcome: input.outcome,
        filingDeadline: input.filingDeadline,
        actualFilingDate: input.actualFilingDate,
        assessedByIdentityId: input.assessorIdentityId,
        assessedByOfficeholderId: input.assessorOfficeholderId,
        authorityEvaluationRecordId: authorityResult.evaluationId,
        explanation: input.explanation,
        assessedAt: new Date(),
      },
    });

    await this.prisma.redressMatter.update({
      where: { id: input.matterId },
      data: { status: RedressMatterStatus.TIMELINESS_ASSESSMENT },
    });

    return assessment;
  }

  async getLatestAssessment(matterId: string) {
    return this.prisma.redressTimelinessAssessment.findFirst({
      where: { matterId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
