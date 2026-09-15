import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductionReadinessStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CapabilityDefinitionService } from '../capabilities/capability-definition.service';
import { OperationalReadinessBoundaryService } from '../common/operational-readiness-boundary.service';
import { ALL_PRODUCTION_READINESS_DOMAINS } from '../operational-readiness.constants';

export interface CreateProductionReadinessAssessmentInput {
  capabilityDefinitionId: string;
  capabilityVersionId: string;
  summary?: string;
  assessedByIdentityId?: string;
}

export interface UpdateRequirementStatusInput {
  requirementId: string;
  status: ProductionReadinessStatus;
  measurableConditions?: string[];
  blockers?: string[];
  notes?: string;
}

export interface SubmitReadinessEvidenceInput {
  assessmentId: string;
  requirementId?: string;
  evidenceReference: string;
  evidenceType: string;
  evidenceHash?: string;
  description?: string;
  submittedByIdentityId?: string;
  replaySnapshot?: Record<string, unknown>;
}

@Injectable()
export class ProductionReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: OperationalReadinessBoundaryService,
    private readonly definitionService: CapabilityDefinitionService,
  ) {}

  async createAssessment(input: CreateProductionReadinessAssessmentInput) {
    await this.definitionService.findDefinitionById(input.capabilityDefinitionId);

    const assessment = await this.prisma.productionReadinessAssessment.create({
      data: {
        capabilityDefinitionId: input.capabilityDefinitionId,
        capabilityVersionId: input.capabilityVersionId,
        summary: input.summary,
        assessedByIdentityId: input.assessedByIdentityId,
        overallStatus: ProductionReadinessStatus.NOT_ASSESSED,
      },
    });

    await this.prisma.productionReadinessRequirement.createMany({
      data: ALL_PRODUCTION_READINESS_DOMAINS.map((domain) => ({
        assessmentId: assessment.id,
        domain: domain,
        status: ProductionReadinessStatus.NOT_ASSESSED,
        requirementText: `${domain} readiness must be assessed before production readiness can be claimed`,
      })),
    });

    return this.findAssessmentById(assessment.id);
  }

  async findAssessmentById(id: string) {
    const assessment = await this.prisma.productionReadinessAssessment.findUnique({
      where: { id },
      include: {
        requirements: { orderBy: { domain: 'asc' } },
        evidence: { orderBy: { submittedAt: 'asc' } },
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Production readiness assessment ${id} not found`);
    }

    return assessment;
  }

  async updateRequirementStatus(input: UpdateRequirementStatusInput) {
    this.boundary.assertReadyWithConditionsHasMeasurableConditions(
      input.status,
      input.measurableConditions ?? [],
    );

    const requirement = await this.prisma.productionReadinessRequirement.update({
      where: { id: input.requirementId },
      data: {
        status: input.status,
        measurableConditions: input.measurableConditions ?? [],
        blockers: input.blockers ?? [],
        notes: input.notes,
      },
    });

    await this.recomputeOverallStatus(requirement.assessmentId);

    return requirement;
  }

  async submitEvidence(input: SubmitReadinessEvidenceInput) {
    const evidence = await this.prisma.productionReadinessEvidence.create({
      data: {
        assessmentId: input.assessmentId,
        requirementId: input.requirementId,
        evidenceReference: input.evidenceReference,
        evidenceType: input.evidenceType,
        evidenceHash: input.evidenceHash,
        description: input.description,
        submittedByIdentityId: input.submittedByIdentityId,
        isReplayable: true,
        replaySnapshot: (input.replaySnapshot ?? {}) as Prisma.InputJsonValue,
      },
    });

    return evidence;
  }

  async getReplayableEvidence(assessmentId: string) {
    return this.prisma.productionReadinessEvidence.findMany({
      where: { assessmentId, isReplayable: true },
      orderBy: { submittedAt: 'asc' },
    });
  }

  private async recomputeOverallStatus(assessmentId: string) {
    const requirements = await this.prisma.productionReadinessRequirement.findMany({
      where: { assessmentId },
    });

    let overallStatus: ProductionReadinessStatus = ProductionReadinessStatus.NOT_ASSESSED;

    if (requirements.some((r) => r.status === ProductionReadinessStatus.SAFE_HALTED)) {
      overallStatus = ProductionReadinessStatus.SAFE_HALTED;
    } else if (requirements.every((r) => r.status === ProductionReadinessStatus.READY)) {
      overallStatus = ProductionReadinessStatus.READY;
    } else if (
      requirements.some((r) => r.status === ProductionReadinessStatus.READY_WITH_CONDITIONS) &&
      !requirements.some(
        (r) =>
          r.status === ProductionReadinessStatus.NOT_READY ||
          r.status === ProductionReadinessStatus.SAFE_HALTED,
      )
    ) {
      overallStatus = ProductionReadinessStatus.READY_WITH_CONDITIONS;
    } else if (requirements.some((r) => r.status !== ProductionReadinessStatus.NOT_ASSESSED)) {
      overallStatus = ProductionReadinessStatus.PARTIALLY_READY;
    } else {
      overallStatus = ProductionReadinessStatus.NOT_READY;
    }

    const conditions = requirements
      .filter((r) => r.status === ProductionReadinessStatus.READY_WITH_CONDITIONS)
      .flatMap((r) => r.measurableConditions);

    await this.prisma.productionReadinessAssessment.update({
      where: { id: assessmentId },
      data: {
        overallStatus,
        conditions,
        assessedAt: new Date(),
      },
    });
  }
}
