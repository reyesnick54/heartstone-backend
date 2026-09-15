import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CapabilityMaturityAssessmentDecision,
  CapabilityMaturityState,
  Prisma,
  ProductionReadinessStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { isValidMaturityAdvancement, requiresProductionReadinessGate } from '../common/maturity-transition.util';
import { OperationalReadinessBoundaryService } from '../common/operational-readiness-boundary.service';
import { OPERATIONAL_READINESS_REASON_CODES } from '../operational-readiness.constants';
import { CapabilityDefinitionService } from './capability-definition.service';

export interface CreateMaturityAssessmentInput {
  capabilityDefinitionId: string;
  capabilityVersionId: string;
  requestedMaturity: CapabilityMaturityState;
  scope?: string;
  environment?: string;
  usersPopulation?: string;
  authorityBasis?: string;
  institutionalOwnerId?: string;
  technicalOwnerIdentityId?: string;
  requirements?: unknown[];
  evidence?: { type: string; reference: string }[];
  openDefects?: unknown[];
  residualRisks?: unknown[];
  dependencies?: unknown[];
  staffingReadiness?: Record<string, unknown>;
  trainingReadiness?: Record<string, unknown>;
  securityReadiness?: Record<string, unknown>;
  privacyReadiness?: Record<string, unknown>;
  recordsReadiness?: Record<string, unknown>;
  continuityReadiness?: Record<string, unknown>;
  integrationReadiness?: Record<string, unknown>;
  supportReadiness?: Record<string, unknown>;
  actorIdentityId?: string;
  actorRoleMarker?: string;
  isTechnicalAdministrator?: boolean;
  acceptsInstitutionalRisk?: boolean;
}

export interface RecordMaturityDecisionInput {
  assessmentId: string;
  decision: CapabilityMaturityAssessmentDecision;
  reviewerIdentityId: string;
  actorRoleMarker?: string;
}

@Injectable()
export class CapabilityMaturityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: OperationalReadinessBoundaryService,
    private readonly definitionService: CapabilityDefinitionService,
  ) {}

  async createAssessment(input: CreateMaturityAssessmentInput) {
    const definition = await this.definitionService.findDefinitionById(input.capabilityDefinitionId);
    const version = await this.prisma.capabilityVersion.findUnique({
      where: { id: input.capabilityVersionId },
    });

    if (version?.capabilityDefinitionId !== input.capabilityDefinitionId) {
      throw new NotFoundException('Capability version not found for definition');
    }

    const evidenceTypes = (input.evidence ?? []).map((item) => item.type);

    this.boundary.validateMaturityAdvancement({
      currentMaturity: definition.currentMaturityState,
      requestedMaturity: input.requestedMaturity,
      evidenceTypes,
      actorRoleMarker: input.actorRoleMarker,
      actorIdentityId: input.actorIdentityId,
      isTechnicalAdministrator: input.isTechnicalAdministrator,
      acceptsInstitutionalRisk: input.acceptsInstitutionalRisk,
      isSuspended: definition.isSuspended,
      isRetired: definition.isRetired,
      hasReplacementCapability: Boolean(definition.replacedByCapabilityId),
    });

    if (!isValidMaturityAdvancement(definition.currentMaturityState, input.requestedMaturity)) {
      throw new BadRequestException(OPERATIONAL_READINESS_REASON_CODES.MATURITY_SKIP_FORBIDDEN);
    }

    this.boundary.assertEvidenceRequiredForAdvancement(input.evidence?.length ?? 0);

    if (requiresProductionReadinessGate(input.requestedMaturity)) {
      await this.assertProductionReadinessGate(input.capabilityDefinitionId, input.capabilityVersionId);
    }

    return this.prisma.capabilityMaturityAssessment.create({
      data: {
        capabilityDefinitionId: input.capabilityDefinitionId,
        capabilityVersionId: input.capabilityVersionId,
        currentMaturity: definition.currentMaturityState,
        requestedMaturity: input.requestedMaturity,
        scope: input.scope,
        environment: input.environment,
        usersPopulation: input.usersPopulation,
        authorityBasis: input.authorityBasis,
        institutionalOwnerId: input.institutionalOwnerId,
        technicalOwnerIdentityId: input.technicalOwnerIdentityId,
        requirements: (input.requirements ?? []) as Prisma.InputJsonValue,
        evidence: (input.evidence ?? []),
        openDefects: (input.openDefects ?? []) as Prisma.InputJsonValue,
        residualRisks: (input.residualRisks ?? []) as Prisma.InputJsonValue,
        dependencies: (input.dependencies ?? []) as Prisma.InputJsonValue,
        staffingReadiness: (input.staffingReadiness ?? {}) as Prisma.InputJsonValue,
        trainingReadiness: (input.trainingReadiness ?? {}) as Prisma.InputJsonValue,
        securityReadiness: (input.securityReadiness ?? {}) as Prisma.InputJsonValue,
        privacyReadiness: (input.privacyReadiness ?? {}) as Prisma.InputJsonValue,
        recordsReadiness: (input.recordsReadiness ?? {}) as Prisma.InputJsonValue,
        continuityReadiness: (input.continuityReadiness ?? {}) as Prisma.InputJsonValue,
        integrationReadiness: (input.integrationReadiness ?? {}) as Prisma.InputJsonValue,
        supportReadiness: (input.supportReadiness ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async recordDecision(input: RecordMaturityDecisionInput) {
    this.boundary.assertAiActorCannotAct(input.actorRoleMarker, input.reviewerIdentityId);

    const assessment = await this.prisma.capabilityMaturityAssessment.findUnique({
      where: { id: input.assessmentId },
      include: { capabilityDefinition: true },
    });

    if (!assessment) {
      throw new NotFoundException(`Maturity assessment ${input.assessmentId} not found`);
    }

    if (assessment.decision) {
      throw new BadRequestException('Assessment decision has already been recorded');
    }

    const updated = await this.prisma.capabilityMaturityAssessment.update({
      where: { id: input.assessmentId },
      data: {
        decision: input.decision,
        reviewerIdentityId: input.reviewerIdentityId,
        decidedAt: new Date(),
      },
    });

    if (
      input.decision === CapabilityMaturityAssessmentDecision.APPROVED ||
      input.decision === CapabilityMaturityAssessmentDecision.CONDITIONALLY_APPROVED
    ) {
      await this.applyApprovedMaturityChange(assessment, input.reviewerIdentityId);
    }

    return updated;
  }

  async getMaturityHistory(capabilityDefinitionId: string) {
    return this.prisma.capabilityMaturityHistory.findMany({
      where: { capabilityDefinitionId },
      orderBy: { recordedAt: 'asc' },
    });
  }

  private async applyApprovedMaturityChange(
    assessment: {
      id: string;
      capabilityDefinitionId: string;
      capabilityVersionId: string;
      currentMaturity: CapabilityMaturityState;
      requestedMaturity: CapabilityMaturityState;
      capabilityDefinition: { isSuspended: boolean; isRetired: boolean; replacedByCapabilityId: string | null };
    },
    changedByIdentityId: string,
  ) {
    this.boundary.assertSuspendedCannotAppearOperational(
      assessment.capabilityDefinition.isSuspended,
      assessment.requestedMaturity,
    );
    this.boundary.assertRetiredCannotReactivateWithoutReplacement(
      assessment.capabilityDefinition.isRetired,
      assessment.requestedMaturity,
      Boolean(assessment.capabilityDefinition.replacedByCapabilityId),
    );

    const isOperational = assessment.requestedMaturity === CapabilityMaturityState.OPERATIONALLY_ACTIVATED;

    await this.prisma.$transaction(async (tx) => {
      await tx.capabilityMaturityHistory.create({
        data: {
          capabilityDefinitionId: assessment.capabilityDefinitionId,
          capabilityVersionId: assessment.capabilityVersionId,
          priorMaturity: assessment.currentMaturity,
          newMaturity: assessment.requestedMaturity,
          assessmentId: assessment.id,
          changeReason: 'Governed maturity assessment approved',
          changedByIdentityId,
        },
      });

      await tx.capabilityDefinition.update({
        where: { id: assessment.capabilityDefinitionId },
        data: {
          currentMaturityState: assessment.requestedMaturity,
          isOperational,
          isSuspended: assessment.requestedMaturity === CapabilityMaturityState.SUSPENDED,
          isRetired:
            assessment.requestedMaturity === CapabilityMaturityState.RETIRED ||
            assessment.requestedMaturity === CapabilityMaturityState.REPLACED,
        },
      });
    });
  }

  private async assertProductionReadinessGate(capabilityDefinitionId: string, capabilityVersionId: string) {
    const assessment = await this.prisma.productionReadinessAssessment.findFirst({
      where: { capabilityDefinitionId, capabilityVersionId },
      orderBy: { createdAt: 'desc' },
      include: { requirements: true },
    });

    if (!assessment) {
      throw new BadRequestException(OPERATIONAL_READINESS_REASON_CODES.EVIDENCE_REQUIRED_FOR_ADVANCEMENT);
    }

    const acceptableStatuses: ProductionReadinessStatus[] = [
      ProductionReadinessStatus.READY,
      ProductionReadinessStatus.READY_WITH_CONDITIONS,
    ];

    if (!acceptableStatuses.includes(assessment.overallStatus)) {
      throw new BadRequestException(OPERATIONAL_READINESS_REASON_CODES.TECHNICAL_COMPLETION_NOT_PRODUCTION_READY);
    }

    const hasCriticalBlockers = assessment.requirements.some(
      (req) =>
        req.status === ProductionReadinessStatus.NOT_READY ||
        req.status === ProductionReadinessStatus.SAFE_HALTED,
    );

    if (hasCriticalBlockers) {
      throw new BadRequestException(OPERATIONAL_READINESS_REASON_CODES.UNRESOLVED_CRITICAL_CONDITION);
    }
  }
}
