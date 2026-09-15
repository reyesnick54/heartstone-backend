import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AcceptanceDossierVersionStatus,
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  ResidualRiskDecision,
  ResidualRiskStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';

export interface CreateResidualRiskInput {
  dossierVersionId: string;
  description: string;
  category: string;
  affectedCapability: string;
  likelihood: string;
  impact: string;
  controls?: unknown[];
  remainingExposure: string;
  limitations?: unknown[];
  ownerOfficeholderId: string;
  riskAcceptanceAuthorityFunctionRecordId: string;
  expirationDate?: Date;
  reviewDate?: Date;
  isCritical?: boolean;
}

export interface ResidualRiskAcceptanceInput {
  residualRiskId: string;
  decision: ResidualRiskDecision;
  decidedByOfficeholderId: string;
  decidedByIdentityId: string;
  officeId?: string;
  appointmentId?: string;
  delegationId?: string;
  reason?: string;
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
export class ResidualRiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async createResidualRisk(input: CreateResidualRiskInput) {
    const version = await this.prisma.acceptanceDossierVersion.findUnique({
      where: { id: input.dossierVersionId },
    });
    if (!version) {
      throw new NotFoundException(`AcceptanceDossierVersion ${input.dossierVersionId} not found`);
    }
    if (version.status === AcceptanceDossierVersionStatus.FROZEN_ACCEPTED) {
      throw new BadRequestException('Cannot add residual risks under signed acceptance dossier');
    }

    return this.prisma.residualRisk.create({
      data: {
        dossierVersionId: input.dossierVersionId,
        description: input.description,
        category: input.category as never,
        affectedCapability: input.affectedCapability,
        likelihood: input.likelihood as never,
        impact: input.impact as never,
        controls: (input.controls ?? []) as never,
        remainingExposure: input.remainingExposure,
        limitations: (input.limitations ?? []) as never,
        ownerOfficeholderId: input.ownerOfficeholderId,
        riskAcceptanceAuthorityFunctionRecordId: input.riskAcceptanceAuthorityFunctionRecordId,
        expirationDate: input.expirationDate,
        reviewDate: input.reviewDate,
        isCritical: input.isCritical ?? false,
      },
    });
  }

  async recordRiskAcceptance(input: ResidualRiskAcceptanceInput) {
    this.boundary.assertAiCannotAcceptResidualRisk(input.decidedByIdentityId);
    this.boundary.assertDeveloperCannotInstitutionallyAcceptOwnDelivery(
      input.decidedByIdentityId,
      input.technicalImplementerIdentityId,
    );

    const risk = await this.prisma.residualRisk.findUnique({
      where: { id: input.residualRiskId },
    });
    if (!risk) {
      throw new NotFoundException(`ResidualRisk ${input.residualRiskId} not found`);
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: input.decidedByIdentityId,
      functionAuthorityRecordId: risk.riskAcceptanceAuthorityFunctionRecordId,
      action: AuthorityActionType.APPROVE,
      officeholderId: input.decidedByOfficeholderId,
      officeId: input.officeId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Unauthorized official cannot accept residual risk');
    }

    const acceptedDecisions: ResidualRiskDecision[] = [
      ResidualRiskDecision.ACCEPT,
      ResidualRiskDecision.ACCEPT_WITH_CONDITIONS,
      ResidualRiskDecision.TRANSFER_OR_SHARE_IF_AUTHORIZED,
    ];

    if (
      input.decision === ResidualRiskDecision.ACCEPT_WITH_CONDITIONS &&
      (!input.conditions || input.conditions.length === 0)
    ) {
      throw new BadRequestException('Conditional risk acceptance requires explicit conditions');
    }

    return this.prisma.$transaction(async (tx) => {
      const acceptance = await tx.residualRiskAcceptance.create({
        data: {
          residualRiskId: input.residualRiskId,
          decision: input.decision,
          decidedByOfficeholderId: input.decidedByOfficeholderId,
          decidedByIdentityId: input.decidedByIdentityId,
          authorityEvaluationRecordId: evaluation.evaluationId,
          reason: input.reason,
        },
      });

      if (input.conditions?.length) {
        await tx.acceptanceCondition.createMany({
          data: input.conditions.map((condition) => ({
            residualRiskAcceptanceId: acceptance.id,
            conditionText: condition.conditionText,
            ownerOfficeholderId: condition.ownerOfficeholderId,
            deadline: condition.deadline,
            verificationMethod: condition.verificationMethod,
            effectIfMissed: condition.effectIfMissed,
          })),
        });
      }

      if (acceptedDecisions.includes(input.decision)) {
        await tx.residualRisk.update({
          where: { id: input.residualRiskId },
          data: { status: ResidualRiskStatus.ACCEPTED },
        });
      } else if (input.decision === ResidualRiskDecision.REJECT) {
        await tx.residualRisk.update({
          where: { id: input.residualRiskId },
          data: { status: ResidualRiskStatus.REJECTED },
        });
      } else if (input.decision === ResidualRiskDecision.MITIGATE_BEFORE_ACTIVATION) {
        await tx.residualRisk.update({
          where: { id: input.residualRiskId },
          data: { status: ResidualRiskStatus.OPEN },
        });
      }

      return acceptance;
    });
  }

  async assertCriticalRisksAccepted(dossierVersionId: string) {
    const criticalRisks = await this.prisma.residualRisk.findMany({
      where: { dossierVersionId, isCritical: true },
    });

    const unaccepted = criticalRisks.filter((risk) => risk.status !== ResidualRiskStatus.ACCEPTED);
    if (unaccepted.length > 0) {
      throw new BadRequestException(
        `Unaccepted critical residual risk blocks activation: ${unaccepted.map((r) => r.id).join(', ')}`,
      );
    }
  }
}
