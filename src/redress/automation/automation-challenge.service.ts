import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityEvaluationOutcome,
  AutomationChallengeDispositionType,
  AutomationChallengeGround,
  AutomationChallengeStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AI_ACTOR_IDENTITY_PREFIX } from '../../evidence/evidence.constants';
import { AUTOMATION_CHALLENGE_NUMBER_PREFIX } from '../redress.constants';
import {
  AutomationExplanationService,
  type CreateAutomationExplanationInput,
} from './automation-explanation.service';

export interface FileAutomationChallengeInput {
  grounds: AutomationChallengeGround;
  challengedAutomationReference: string;
  decisionAssistanceRecordRef?: string;
  challengerIdentityId: string;
  description: string;
  relatedDecisionId?: string;
  relatedCaseId?: string;
}

export interface DisposeAutomationChallengeInput {
  challengeId: string;
  dispositionType: AutomationChallengeDispositionType;
  disposedByIdentityId: string;
  disposedByOfficeholderId?: string;
  authorityEvaluationRecordId?: string;
  rationale: string;
  excludedOutputReference?: string;
  recordCorrectionId?: string;
  reconsiderationRouteReference?: string;
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    private readonly explanationService: AutomationExplanationService,
  ) {}

  async fileChallenge(input: FileAutomationChallengeInput) {
    const challengeNumber = `${AUTOMATION_CHALLENGE_NUMBER_PREFIX}-${String(Date.now())}`;

    return this.prisma.automationChallenge.create({
      data: {
        challengeNumber,
        grounds: input.grounds,
        challengedAutomationReference: input.challengedAutomationReference,
        decisionAssistanceRecordRef: input.decisionAssistanceRecordRef,
        challengerIdentityId: input.challengerIdentityId,
        description: input.description,
        relatedDecisionId: input.relatedDecisionId,
        relatedCaseId: input.relatedCaseId,
        status: AutomationChallengeStatus.FILED,
      },
    });
  }

  async attachExplanation(challengeId: string, input: CreateAutomationExplanationInput) {
    const challenge = await this.getChallenge(challengeId);
    const explanation = await this.explanationService.createExplanation(input);

    return this.prisma.automationChallenge.update({
      where: { id: challenge.id },
      data: {
        explanationRecordId: explanation.id,
        status: AutomationChallengeStatus.EXPLANATION_PROVIDED,
      },
      include: { explanationRecord: true },
    });
  }

  async getPublicExplanation(challengeId: string) {
    const challenge = await this.getChallenge(challengeId);

    if (!challenge.explanationRecord) {
      throw new NotFoundException('No explanation record is available for this challenge');
    }

    return this.explanationService.buildPublicView(challenge.explanationRecord);
  }

  async disposeChallenge(input: DisposeAutomationChallengeInput) {
    if (input.disposedByIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI cannot adjudicate its own automation challenge');
    }

    const challenge = await this.getChallenge(input.challengeId);

    if (challenge.status === AutomationChallengeStatus.DISPOSED) {
      throw new ForbiddenException('Challenge has already been disposed');
    }

    if (input.authorityEvaluationRecordId) {
      const evaluation = await this.prisma.authorityEvaluationRecord.findUnique({
        where: { id: input.authorityEvaluationRecordId },
      });

      if (evaluation?.outcome !== AuthorityEvaluationOutcome.ALLOW) {
        throw new ForbiddenException(
          'Challenge disposition requires a successful authority evaluation',
        );
      }
    }

    const historicalOutputPreserved =
      input.dispositionType === AutomationChallengeDispositionType.EXCLUDE_FAULTY_OUTPUT;

    const disposition = await this.prisma.automationChallengeDisposition.create({
      data: {
        automationChallengeId: challenge.id,
        dispositionType: input.dispositionType,
        disposedByIdentityId: input.disposedByIdentityId,
        disposedByOfficeholderId: input.disposedByOfficeholderId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        rationale: input.rationale,
        excludedOutputReference: input.excludedOutputReference,
        historicalOutputPreserved,
        recordCorrectionId: input.recordCorrectionId,
        reconsiderationRouteReference: input.reconsiderationRouteReference,
      },
    });

    const nextStatus = this.resolveStatusAfterDisposition(input.dispositionType);

    await this.prisma.automationChallenge.update({
      where: { id: challenge.id },
      data: { status: nextStatus },
    });

    return disposition;
  }

  async routeFalseMatchToCorrection(challengeId: string, correctionMatterId: string) {
    const challenge = await this.getChallenge(challengeId);

    if (challenge.grounds !== AutomationChallengeGround.FALSE_MATCH) {
      throw new ForbiddenException('Only false-match challenges can be routed to correction');
    }

    return this.prisma.automationChallenge.update({
      where: { id: challenge.id },
      data: {
        status: AutomationChallengeStatus.ROUTED_TO_CORRECTION,
        description: `${challenge.description} [Routed to correction matter ${correctionMatterId}]`,
      },
    });
  }

  async routeToReconsideration(challengeId: string, routeReference: string) {
    const challenge = await this.getChallenge(challengeId);

    return this.prisma.automationChallenge.update({
      where: { id: challenge.id },
      data: {
        status: AutomationChallengeStatus.ROUTED_TO_RECONSIDERATION,
        description: `${challenge.description} [Routed to reconsideration: ${routeReference}]`,
      },
    });
  }

  private resolveStatusAfterDisposition(
    dispositionType: AutomationChallengeDispositionType,
  ): AutomationChallengeStatus {
    switch (dispositionType) {
      case AutomationChallengeDispositionType.REFER_FOR_RECONSIDERATION:
        return AutomationChallengeStatus.ROUTED_TO_RECONSIDERATION;
      case AutomationChallengeDispositionType.EXCLUDE_FAULTY_OUTPUT:
      case AutomationChallengeDispositionType.CORRECT_INPUT:
        return AutomationChallengeStatus.ROUTED_TO_CORRECTION;
      default:
        return AutomationChallengeStatus.DISPOSED;
    }
  }

  private async getChallenge(challengeId: string) {
    const challenge = await this.prisma.automationChallenge.findUnique({
      where: { id: challengeId },
      include: { explanationRecord: true, disposition: true },
    });

    if (!challenge) {
      throw new NotFoundException(`AutomationChallenge ${challengeId} not found`);
    }

    return challenge;
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
