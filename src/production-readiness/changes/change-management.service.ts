import { Injectable } from '@nestjs/common';
import { ChangeAssessmentOutcome, ChangeRequestStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';
import { ReleaseRevalidationService } from '../releases/release-revalidation.service';

export interface CreateChangeRequestInput {
  changeNumber: string;
  scope: string;
  reason: string;
  requesterIdentityId: string;
  affectedCapabilities?: unknown[];
  authorityImpact?: Record<string, unknown>;
  securityImpact?: Record<string, unknown>;
  privacyImpact?: Record<string, unknown>;
  recordsImpact?: Record<string, unknown>;
  integrationImpact?: Record<string, unknown>;
  aiImpact?: Record<string, unknown>;
  continuityImpact?: Record<string, unknown>;
  migrationImpact?: Record<string, unknown>;
  testRequirements?: unknown[];
  rollbackPlanRef?: string;
  reviewers?: unknown[];
  changeWindowStart?: Date;
  changeWindowEnd?: Date;
}

@Injectable()
export class ChangeManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
    private readonly revalidation: ReleaseRevalidationService,
  ) {}

  async createChangeRequest(input: CreateChangeRequestInput) {
    return this.prisma.changeRequest.create({
      data: {
        changeNumber: input.changeNumber,
        scope: input.scope,
        reason: input.reason,
        requesterIdentityId: input.requesterIdentityId,
        affectedCapabilities: (input.affectedCapabilities ?? []) as Prisma.InputJsonValue,
        authorityImpact: (input.authorityImpact ?? {}) as Prisma.InputJsonValue,
        securityImpact: (input.securityImpact ?? {}) as Prisma.InputJsonValue,
        privacyImpact: (input.privacyImpact ?? {}) as Prisma.InputJsonValue,
        recordsImpact: (input.recordsImpact ?? {}) as Prisma.InputJsonValue,
        integrationImpact: (input.integrationImpact ?? {}) as Prisma.InputJsonValue,
        aiImpact: (input.aiImpact ?? {}) as Prisma.InputJsonValue,
        continuityImpact: (input.continuityImpact ?? {}) as Prisma.InputJsonValue,
        migrationImpact: (input.migrationImpact ?? {}) as Prisma.InputJsonValue,
        testRequirements: (input.testRequirements ?? []) as Prisma.InputJsonValue,
        rollbackPlanRef: input.rollbackPlanRef,
        reviewers: (input.reviewers ?? []) as Prisma.InputJsonValue,
        changeWindowStart: input.changeWindowStart,
        changeWindowEnd: input.changeWindowEnd,
        status: ChangeRequestStatus.DRAFT,
      },
    });
  }

  async submitChangeRequest(changeRequestId: string) {
    return this.prisma.changeRequest.update({
      where: { id: changeRequestId },
      data: { status: ChangeRequestStatus.SUBMITTED },
    });
  }

  async assessChange(input: {
    changeRequestId: string;
    assessorIdentityId: string;
    outcome: ChangeAssessmentOutcome;
    findings?: Record<string, unknown>;
    requiresRevalidation?: boolean;
  }) {
    const changeRequest = await this.prisma.changeRequest.findUniqueOrThrow({
      where: { id: input.changeRequestId },
    });

    const authorityImpactDeclared =
      Object.keys(changeRequest.authorityImpact as Record<string, unknown>).length > 0;
    const authorityEvaluated =
      input.findings?.authorityEvaluated === true ||
      input.outcome === ChangeAssessmentOutcome.APPROVED;

    this.boundary.assertChangeCannotBypassAuthority(authorityImpactDeclared, authorityEvaluated);

    const assessment = await this.prisma.changeAssessment.create({
      data: {
        changeRequestId: input.changeRequestId,
        assessorIdentityId: input.assessorIdentityId,
        outcome: input.outcome,
        findings: (input.findings ?? {}) as Prisma.InputJsonValue,
        requiresRevalidation: input.requiresRevalidation ?? false,
      },
    });

    if (input.requiresRevalidation) {
      await this.revalidation.recordTrigger({
        triggerType: 'AUTHORITY_POLICY_CHANGE',
        sourceRecordType: 'ChangeAssessment',
        sourceRecordId: assessment.id,
        reason: 'Change assessment requires release revalidation',
      });
    }

    return assessment;
  }

  async approveChangeRequest(changeRequestId: string) {
    const changeRequest = await this.prisma.changeRequest.findUniqueOrThrow({
      where: { id: changeRequestId },
      include: { assessments: true },
    });

    const authorityImpactDeclared =
      Object.keys(changeRequest.authorityImpact as Record<string, unknown>).length > 0;

    if (authorityImpactDeclared) {
      const hasAuthorityAssessment = changeRequest.assessments.some(
        (assessment) =>
          (assessment.findings as Record<string, unknown>).authorityEvaluated === true,
      );
      this.boundary.assertChangeCannotBypassAuthority(
        authorityImpactDeclared,
        hasAuthorityAssessment,
      );
    }

    const pendingRevalidation = changeRequest.assessments.some(
      (assessment) => assessment.requiresRevalidation,
    );
    if (pendingRevalidation) {
      const triggerExists = await this.prisma.releaseRevalidationTrigger.findFirst({
        where: {
          sourceRecordType: 'ChangeAssessment',
          sourceRecordId: { in: changeRequest.assessments.map((a) => a.id) },
        },
      });
      this.boundary.assertMaterialChangeTriggersRevalidation(true, triggerExists !== null);
    }

    return this.prisma.changeRequest.update({
      where: { id: changeRequestId },
      data: { status: ChangeRequestStatus.APPROVED },
    });
  }
}
