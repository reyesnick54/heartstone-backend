import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  AutomationChallengeDispositionOutcome,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface CreateAutomationChallengeInput {
  matterId: string;
  challengedOutputReference: string;
  challengedInputReference?: string;
}

export interface DiscloseExplanationInput {
  challengeId: string;
  approvedUseSummary: string;
  inputSummary?: string;
  outputSummary?: string;
  confidentialityLevel?: string;
}

export interface DispositionChallengeInput {
  challengeId: string;
  deciderIdentityId: string;
  deciderOfficeholderId: string;
  functionAuthorityRecordId: string;
  appointmentId?: string;
  delegationId?: string;
  outcome: AutomationChallengeDispositionOutcome;
  explanation?: string;
  isAiActor?: boolean;
}

@Injectable()
export class AutomationChallengeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly actorResolver: InstitutionalActorResolver,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async createChallenge(input: CreateAutomationChallengeInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'automation challenge');

    return this.prisma.automationChallenge.create({
      data: {
        matterId: input.matterId,
        challengedOutputReference: input.challengedOutputReference,
        challengedInputReference: input.challengedInputReference,
        aiAdjudicated: false,
      },
    });
  }

  async discloseExplanation(input: DiscloseExplanationInput) {
    const challenge = await this.prisma.automationChallenge.findUnique({
      where: { id: input.challengeId },
    });

    if (!challenge) {
      throw new NotFoundException(`AutomationChallenge ${input.challengeId} not found`);
    }

    const record = await this.prisma.automationExplanationRecord.create({
      data: {
        challengeId: input.challengeId,
        approvedUseSummary: input.approvedUseSummary,
        inputSummary: input.inputSummary,
        outputSummary: input.outputSummary,
        confidentialityLevel: input.confidentialityLevel ?? 'STANDARD',
      },
    });

    await this.prisma.automationChallenge.update({
      where: { id: input.challengeId },
      data: { explanationDisclosed: true },
    });

    return record;
  }

  async dispositionChallenge(input: DispositionChallengeInput) {
    const challenge = await this.prisma.automationChallenge.findUnique({
      where: { id: input.challengeId },
      include: { explanationRecords: true },
    });

    if (!challenge) {
      throw new NotFoundException(`AutomationChallenge ${input.challengeId} not found`);
    }

    if (!challenge.explanationDisclosed || challenge.explanationRecords.length === 0) {
      throw new BadRequestException(
        'Automation challenge requires explanation disclosure before disposition',
      );
    }

    if (input.isAiActor) {
      this.boundary.assertAiCannotDecide(true);
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.deciderIdentityId },
    });

    if (!identity?.type || !this.actorResolver.isHumanActor(identity.type)) {
      throw new ForbiddenException('Automation challenge disposition requires human authority');
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
      throw new ForbiddenException('Disposition requires authority evaluation ALLOW');
    }

    const disposition = await this.prisma.automationChallengeDisposition.create({
      data: {
        challengeId: input.challengeId,
        outcome: input.outcome,
        decidedByIdentityId: input.deciderIdentityId,
        decidedByOfficeholderId: input.deciderOfficeholderId,
        authorityEvaluationRecordId: authorityResult.evaluationId,
        explanation: input.explanation,
        decidedAt: new Date(),
      },
    });

    await this.prisma.automationChallenge.update({
      where: { id: input.challengeId },
      data: {
        aiAdjudicated: false,
        faultyOutputExcluded: input.outcome === AutomationChallengeDispositionOutcome.UPHELD,
        reprocessingOrdered:
          input.outcome === AutomationChallengeDispositionOutcome.REPROCESSING_ORDERED,
      },
    });

    return disposition;
  }
}
