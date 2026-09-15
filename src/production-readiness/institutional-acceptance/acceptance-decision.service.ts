import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AcceptanceDecisionOutcome,
  AcceptanceDossierVersionStatus,
  AcceptanceLevel,
  AuthorityActionType,
  AuthorityEvaluationOutcome,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';
import { AcceptanceReviewService } from './acceptance-review.service';

export interface AcceptanceDecisionInput {
  dossierVersionId: string;
  outcome: AcceptanceDecisionOutcome;
  acceptanceLevel: AcceptanceLevel;
  decidedByOfficeholderId: string;
  actorIdentityId: string;
  officeId?: string;
  appointmentId?: string;
  delegationId?: string;
  authorityEvaluationRecordId?: string;
  reason?: string;
  signatureReference?: string;
  technicalImplementerIdentityId?: string;
  conditions?: {
    conditionText: string;
    ownerOfficeholderId: string;
    deadline?: Date;
    verificationMethod?: string;
    effectIfMissed?: string;
  }[];
}

@Injectable()
export class AcceptanceDecisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly reviewService: AcceptanceReviewService,
  ) {}

  async recordDecision(input: AcceptanceDecisionInput) {
    this.boundary.rejectClientProtectedFields(input as unknown as Record<string, unknown>);
    this.boundary.assertAiCannotAcceptDossier(input.actorIdentityId);
    this.boundary.assertDeveloperCannotInstitutionallyAcceptOwnDelivery(
      input.actorIdentityId,
      input.technicalImplementerIdentityId,
    );

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.actorIdentityId },
    });
    if (!identity) {
      throw new NotFoundException(`Identity ${input.actorIdentityId} not found`);
    }
    this.boundary.assertHumanOfficeholderRequired(identity.type);

    const version = await this.prisma.acceptanceDossierVersion.findUnique({
      where: { id: input.dossierVersionId },
      include: { dossier: true },
    });
    if (!version) {
      throw new NotFoundException(`AcceptanceDossierVersion ${input.dossierVersionId} not found`);
    }

    if (version.status === AcceptanceDossierVersionStatus.FROZEN_ACCEPTED) {
      throw new BadRequestException('Signed dossier version is immutable');
    }

    if (version.status !== AcceptanceDossierVersionStatus.SUBMITTED_FOR_FINAL_ACCEPTANCE) {
      throw new BadRequestException(
        'Dossier must be submitted for final acceptance before institutional decision',
      );
    }

    const institutionalLevel = input.acceptanceLevel === AcceptanceLevel.INSTITUTIONAL;
    if (institutionalLevel) {
      this.boundary.assertInstitutionalLevelForFinalAcceptance(input.acceptanceLevel);
      await this.reviewService.assertRequiredReviewsSatisfactory(input.dossierVersionId);
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: input.actorIdentityId,
      functionAuthorityRecordId: version.acceptanceAuthorityFunctionRecordId,
      action: AuthorityActionType.APPROVE,
      officeholderId: input.decidedByOfficeholderId,
      officeId: input.officeId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Unauthorized official cannot record acceptance decision');
    }

    if (
      input.outcome === AcceptanceDecisionOutcome.ACCEPTED_WITH_CONDITIONS &&
      (!input.conditions || input.conditions.length === 0)
    ) {
      throw new BadRequestException(
        'Conditional acceptance requires condition, owner, deadline, verification, and effect if missed',
      );
    }

    const acceptedOutcomes: AcceptanceDecisionOutcome[] = [
      AcceptanceDecisionOutcome.ACCEPTED,
      AcceptanceDecisionOutcome.ACCEPTED_WITH_CONDITIONS,
    ];

    return this.prisma.$transaction(async (tx) => {
      const decision = await tx.acceptanceDecision.create({
        data: {
          dossierVersionId: input.dossierVersionId,
          outcome: input.outcome,
          acceptanceLevel: input.acceptanceLevel,
          decidedByOfficeholderId: input.decidedByOfficeholderId,
          authorityEvaluationRecordId:
            input.authorityEvaluationRecordId ?? evaluation.evaluationId,
          reason: input.reason,
        },
      });

      if (input.signatureReference) {
        await tx.acceptanceSignature.create({
          data: {
            acceptanceDecisionId: decision.id,
            signerOfficeholderId: input.decidedByOfficeholderId,
            signatureReference: input.signatureReference,
          },
        });
      }

      if (input.conditions?.length) {
        await tx.acceptanceCondition.createMany({
          data: input.conditions.map((condition) => ({
            acceptanceDecisionId: decision.id,
            conditionText: condition.conditionText,
            ownerOfficeholderId: condition.ownerOfficeholderId,
            deadline: condition.deadline,
            verificationMethod: condition.verificationMethod,
            effectIfMissed: condition.effectIfMissed,
          })),
        });
      }

      if (acceptedOutcomes.includes(input.outcome) && institutionalLevel) {
        await tx.acceptanceDossierVersion.update({
          where: { id: input.dossierVersionId },
          data: {
            status: AcceptanceDossierVersionStatus.FROZEN_ACCEPTED,
            frozenAt: new Date(),
          },
        });

        await tx.acceptanceLevelAchievement.upsert({
          where: {
            dossierVersionId_acceptanceLevel: {
              dossierVersionId: input.dossierVersionId,
              acceptanceLevel: AcceptanceLevel.INSTITUTIONAL,
            },
          },
          create: {
            dossierVersionId: input.dossierVersionId,
            acceptanceLevel: AcceptanceLevel.INSTITUTIONAL,
            achievedByIdentityId: input.actorIdentityId,
            authorityEvaluationRecordId: evaluation.evaluationId,
            basisReference: decision.id,
            notes: 'Institutional acceptance decision recorded',
          },
          update: {},
        });
      }

      return decision;
    });
  }

  async getOpenConditions(dossierVersionId: string) {
    return this.prisma.acceptanceCondition.findMany({
      where: {
        OR: [
          { dossierVersionId },
          { acceptanceDecision: { dossierVersionId } },
        ],
        status: 'OPEN',
      },
      orderBy: { deadline: 'asc' },
    });
  }
}
