import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AcceptanceDossierVersionStatus,
  AcceptanceLevel,
  ActivationAuditEventType,
  ActivationScopeType,
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  ProductionActivationDecisionOutcome,
  ProductionActivationRequestStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';
import { ResidualRiskService } from './residual-risk.service';

export interface ActivationScopeInput {
  scopeType: ActivationScopeType;
  scopeReference: string;
  scopeLabel: string;
  constraints?: Record<string, unknown>;
}

export interface CreateActivationRequestInput {
  requestNumber: string;
  dossierId: string;
  dossierVersionId: string;
  acceptedReleaseReference: string;
  environment: string;
  effectiveDate: Date;
  monitoringPlan?: Record<string, unknown>;
  supportPlan?: Record<string, unknown>;
  rollbackPlan?: Record<string, unknown>;
  safeHaltPlan?: Record<string, unknown>;
  revalidationDate?: Date;
  scopes: ActivationScopeInput[];
  submittedByIdentityId?: string;
}

export interface ProductionActivationDecisionInput {
  activationRequestId: string;
  outcome: ProductionActivationDecisionOutcome;
  decidedByOfficeholderId: string;
  decidedByIdentityId: string;
  activationAuthorityFunctionRecordId: string;
  officeId?: string;
  appointmentId?: string;
  delegationId?: string;
  freshAuthorityEvaluationRecordId?: string;
  securityPrivacyStatus: string;
  recordsControlsStatus: string;
  continuityReadinessVerified: boolean;
  workforceQualified: boolean;
  integrationsAccepted: boolean;
  residualRisksAccepted: boolean;
  monitoringConfigured: boolean;
  rollbackCapable: boolean;
  restrictions?: unknown[];
  reason?: string;
  approvedScopes?: ActivationScopeInput[];
}

@Injectable()
export class ProductionActivationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly residualRiskService: ResidualRiskService,
  ) {}

  async createActivationRequest(input: CreateActivationRequestInput) {
    if (!input.scopes.length) {
      throw new BadRequestException(
        'Production activation requires explicit scope; universal activation is not permitted',
      );
    }

    const version = await this.prisma.acceptanceDossierVersion.findUnique({
      where: { id: input.dossierVersionId },
      include: {
        levelAchievements: true,
        decisions: true,
      },
    });
    if (!version) {
      throw new NotFoundException(`AcceptanceDossierVersion ${input.dossierVersionId} not found`);
    }

    if (version.status !== AcceptanceDossierVersionStatus.FROZEN_ACCEPTED) {
      throw new BadRequestException(
        'Production activation requires frozen institutional acceptance dossier',
      );
    }

    const institutionalAchievement = version.levelAchievements.find(
      (achievement) => achievement.acceptanceLevel === AcceptanceLevel.INSTITUTIONAL,
    );
    if (!institutionalAchievement) {
      throw new BadRequestException(
        'Institutional acceptance must be recorded before production activation request',
      );
    }

    if (version.releaseReference !== input.acceptedReleaseReference) {
      throw new BadRequestException('Activation request release must match accepted dossier release');
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.productionActivationRequest.create({
        data: {
          requestNumber: input.requestNumber,
          dossierId: input.dossierId,
          dossierVersionId: input.dossierVersionId,
          acceptedReleaseReference: input.acceptedReleaseReference,
          environment: input.environment,
          effectiveDate: input.effectiveDate,
          monitoringPlan: (input.monitoringPlan ?? {}) as never,
          supportPlan: (input.supportPlan ?? {}) as never,
          rollbackPlan: (input.rollbackPlan ?? {}) as never,
          safeHaltPlan: (input.safeHaltPlan ?? {}) as never,
          revalidationDate: input.revalidationDate,
          status: ProductionActivationRequestStatus.SUBMITTED,
          submittedByIdentityId: input.submittedByIdentityId,
          submittedAt: new Date(),
        },
      });

      await tx.activationScope.createMany({
        data: input.scopes.map((scope) => ({
          activationRequestId: request.id,
          scopeType: scope.scopeType,
          scopeReference: scope.scopeReference,
          scopeLabel: scope.scopeLabel,
          constraints: (scope.constraints ?? {}) as never,
        })),
      });

      if (input.submittedByIdentityId) {
        await tx.activationAuditRecord.create({
          data: {
            eventType: ActivationAuditEventType.REQUEST_SUBMITTED,
            activationRequestId: request.id,
            actorIdentityId: input.submittedByIdentityId,
            eventSnapshot: {
              requestNumber: input.requestNumber,
              scopes: input.scopes,
            } as never,
          },
        });
      }

      return request;
    });
  }

  async recordActivationDecision(input: ProductionActivationDecisionInput) {
    this.boundary.assertAiCannotActivateProduction(input.decidedByIdentityId);

    const request = await this.prisma.productionActivationRequest.findUnique({
      where: { id: input.activationRequestId },
      include: {
        dossierVersion: {
          include: {
            levelAchievements: true,
            dependencies: true,
            conditions: true,
          },
        },
        scopes: true,
        decision: true,
      },
    });

    if (!request) {
      throw new NotFoundException(
        `ProductionActivationRequest ${input.activationRequestId} not found`,
      );
    }

    if (request.decision) {
      throw new BadRequestException('Activation request already has a decision');
    }

    if (request.dossierVersion.status !== AcceptanceDossierVersionStatus.FROZEN_ACCEPTED) {
      throw new BadRequestException('Institutional acceptance dossier must be frozen');
    }

    const approvedOutcomes: ProductionActivationDecisionOutcome[] = [
      ProductionActivationDecisionOutcome.APPROVED,
      ProductionActivationDecisionOutcome.APPROVED_WITH_RESTRICTIONS,
    ];

    const approvedScopes: ActivationScopeInput[] =
      input.approvedScopes ??
      request.scopes.map((scope) => ({
        scopeType: scope.scopeType,
        scopeReference: scope.scopeReference,
        scopeLabel: scope.scopeLabel,
        constraints:
          scope.constraints && typeof scope.constraints === 'object' && !Array.isArray(scope.constraints)
            ? (scope.constraints as Record<string, unknown>)
            : {},
      }));

    if (approvedOutcomes.includes(input.outcome)) {
      if (!input.continuityReadinessVerified) {
        throw new BadRequestException('Unverified continuity readiness blocks activation');
      }
      if (!input.workforceQualified) {
        throw new BadRequestException('Unqualified mandatory operator blocks activation');
      }
      if (!input.integrationsAccepted) {
        throw new BadRequestException('Unaccepted integration blocks scoped activation');
      }
      await this.residualRiskService.assertCriticalRisksAccepted(request.dossierVersionId);
      if (!input.residualRisksAccepted) {
        throw new BadRequestException(
          'Residual risks must be explicitly accepted before production activation',
        );
      }
      if (!input.monitoringConfigured || !input.rollbackCapable) {
        throw new BadRequestException(
          'Activation requires configured monitoring and rollback capability',
        );
      }

      this.validateScopesWithinDossier(request.scopes, approvedScopes);
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: input.decidedByIdentityId,
      functionAuthorityRecordId: input.activationAuthorityFunctionRecordId,
      action: AuthorityActionType.APPROVE,
      officeholderId: input.decidedByOfficeholderId,
      officeId: input.officeId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Unauthorized official cannot record production activation decision');
    }

    const replaySnapshot = {
      requestId: request.id,
      dossierVersionId: request.dossierVersionId,
      releaseReference: request.acceptedReleaseReference,
      environment: request.environment,
      scopes: request.scopes,
      readiness: {
        continuityReadinessVerified: input.continuityReadinessVerified,
        workforceQualified: input.workforceQualified,
        integrationsAccepted: input.integrationsAccepted,
        residualRisksAccepted: input.residualRisksAccepted,
        monitoringConfigured: input.monitoringConfigured,
        rollbackCapable: input.rollbackCapable,
      },
      authorityEvaluationId: evaluation.evaluationId,
      freshAuthorityEvaluationId: input.freshAuthorityEvaluationRecordId,
      decidedAt: new Date().toISOString(),
    };

    return this.prisma.$transaction(async (tx) => {
      const decision = await tx.productionActivationDecision.create({
        data: {
          activationRequestId: input.activationRequestId,
          outcome: input.outcome,
          decidedByOfficeholderId: input.decidedByOfficeholderId,
          decidedByIdentityId: input.decidedByIdentityId,
          authorityEvaluationRecordId: evaluation.evaluationId,
          freshAuthorityEvaluationRecordId: input.freshAuthorityEvaluationRecordId,
          securityPrivacyStatus: input.securityPrivacyStatus,
          recordsControlsStatus: input.recordsControlsStatus,
          continuityReadinessVerified: input.continuityReadinessVerified,
          workforceQualified: input.workforceQualified,
          integrationsAccepted: input.integrationsAccepted,
          residualRisksAccepted: input.residualRisksAccepted,
          monitoringConfigured: input.monitoringConfigured,
          rollbackCapable: input.rollbackCapable,
          restrictions: (input.restrictions ?? []) as never,
          replaySnapshot: replaySnapshot as never,
          reason: input.reason,
        },
      });

      const scopesToRecord = approvedScopes;
      await tx.activationScope.createMany({
        data: scopesToRecord.map((scope) => ({
          activationDecisionId: decision.id,
          scopeType: scope.scopeType,
          scopeReference: scope.scopeReference,
          scopeLabel: scope.scopeLabel,
          constraints: (scope.constraints ?? {}) as never,
        })),
      });

      await tx.productionActivationRequest.update({
        where: { id: input.activationRequestId },
        data: { status: ProductionActivationRequestStatus.DECIDED },
      });

      await tx.activationAuditRecord.create({
        data: {
          eventType: ActivationAuditEventType.DECISION_RECORDED,
          activationRequestId: input.activationRequestId,
          activationDecisionId: decision.id,
          actorIdentityId: input.decidedByIdentityId,
          eventSnapshot: replaySnapshot as never,
        },
      });

      return decision;
    });
  }

  async recordCommunication(
    activationDecisionId: string,
    audienceType: string,
    communicationReference: string,
    sentByIdentityId: string,
    notes?: string,
  ) {
    this.boundary.assertNotificationDoesNotCreateActivation();

    const decision = await this.prisma.productionActivationDecision.findUnique({
      where: { id: activationDecisionId },
    });
    if (!decision) {
      throw new NotFoundException(
        `ProductionActivationDecision ${activationDecisionId} not found`,
      );
    }

    const communication = await this.prisma.activationCommunication.create({
      data: {
        activationDecisionId,
        audienceType: audienceType as never,
        communicationReference,
        sentByIdentityId,
        notes,
      },
    });

    await this.prisma.activationAuditRecord.create({
      data: {
        eventType: ActivationAuditEventType.COMMUNICATION_SENT,
        activationDecisionId,
        actorIdentityId: sentByIdentityId,
        eventSnapshot: { audienceType, communicationReference },
      },
    });

    return communication;
  }

  async replayDecision(activationDecisionId: string) {
    const decision = await this.prisma.productionActivationDecision.findUnique({
      where: { id: activationDecisionId },
      include: {
        activationRequest: { include: { scopes: true, dossierVersion: true } },
        scopes: true,
        authorityEvaluationRecord: true,
        freshAuthorityEvaluationRecord: true,
      },
    });

    if (!decision) {
      throw new NotFoundException(
        `ProductionActivationDecision ${activationDecisionId} not found`,
      );
    }

    return {
      decisionId: decision.id,
      outcome: decision.outcome,
      replaySnapshot: decision.replaySnapshot,
      restrictions: decision.restrictions,
      scopes: decision.scopes,
      authorityEvaluationRecordId: decision.authorityEvaluationRecordId,
      freshAuthorityEvaluationRecordId: decision.freshAuthorityEvaluationRecordId,
      replayable: Boolean(decision.replaySnapshot),
    };
  }

  private validateScopesWithinDossier(
    requestScopes: { scopeType: ActivationScopeType; scopeReference: string }[],
    approvedScopes: ActivationScopeInput[],
  ) {
    for (const approved of approvedScopes) {
      const allowed = requestScopes.some(
        (scope) =>
          scope.scopeType === approved.scopeType &&
          scope.scopeReference === approved.scopeReference,
      );
      if (!allowed) {
        throw new BadRequestException(
          `Activation cannot exceed dossier scope: ${approved.scopeType}/${approved.scopeReference}`,
        );
      }
    }
  }
}
