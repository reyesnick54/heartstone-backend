import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplianceFindingClosureStatus,
  ComplianceFindingReopeningReason,
  ComplianceImmediateActionRoute,
  ComplianceMatterStatus,
  ComplianceRiskLevel,
  CorrectiveActionPlanStatus,
  CorrectiveActionSubmissionStatus,
  CorrectiveActionVerificationResult,
  InspectionFindingSeverity,
  InspectionFindingStatus,
  Prisma,
  ReinspectionRequirementStatus,
  RootCauseAnalysisMethod,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InspectionComplianceBoundaryService } from '../common/inspection-compliance-boundary.service';
import {
  COMPLIANCE_FINDING_CLOSURE_NUMBER_PREFIX,
  COMPLIANCE_FINDING_REOPENING_NUMBER_PREFIX,
  COMPLIANCE_MATTER_NUMBER_PREFIX,
  CORRECTIVE_ACTION_PLAN_NUMBER_PREFIX,
  INSPECTION_FINDING_NUMBER_PREFIX,
} from '../inspection-compliance.constants';

export interface ActorContext {
  identityId: string;
  officeholderId?: string;
  roleMarker?: string;
}

export interface CreateComplianceMatterInput {
  masterAdministrativeFileId: string;
  officialInstrumentId: string;
  responsibleInstitutionId: string;
  responsibleDepartmentId: string;
  caseId?: string;
  holderIdentityId?: string;
  holderOrganizationId?: string;
  summary: string;
  riskLevel?: ComplianceRiskLevel;
  immediateActionRoute?: ComplianceImmediateActionRoute;
  authoritySource?: string;
}

export interface RecordInspectionFindingInput {
  complianceMatterId: string;
  description: string;
  deficiencyReference?: string;
  severity?: ComplianceRiskLevel;
  inspectionRecordId?: string;
  inspectionEvidenceItemId?: string;
}

export interface ProposeCorrectiveActionPlanInput {
  complianceMatterId: string;
  inspectionFindingId: string;
  authoritySource: string;
  rootCauseDescription: string;
  rootCauseAnalysisMethod?: RootCauseAnalysisMethod;
  aiAssistanceMetadata?: Prisma.InputJsonValue;
  requiredActions: string;
  responsibleParty: string;
  interimProtection?: string;
  dueDate: Date;
  evidenceRequired: string;
  verificationMethod: string;
  escalationRule?: string;
  items?: {
    actionDescription: string;
    responsibleParty: string;
    dueDate?: Date;
    evidenceRequired?: string;
  }[];
  actor: ActorContext;
}

export interface ApproveCorrectiveActionPlanInput {
  planId: string;
  approver: ActorContext & { officeholderId: string };
  authorityEvaluationRecordId?: string;
}

export interface SubmitCorrectiveActionEvidenceInput {
  planId: string;
  itemId?: string;
  submissionSummary: string;
  evidenceRecordIds: string[];
  submitter: ActorContext;
}

export interface VerifyCorrectiveActionInput {
  planId: string;
  itemId?: string;
  actionVerified: string;
  evidenceSummary: string;
  verificationMethod: string;
  result: CorrectiveActionVerificationResult;
  limitations?: string;
  followUpRequired?: string;
  evidenceRecordIds?: string[];
  verifier: ActorContext & { officeholderId?: string };
  authorityEvaluationRecordId?: string;
}

export interface CloseInspectionFindingInput {
  findingId: string;
  closureSummary: string;
  requiredActionsCompleted: boolean;
  requiredEvidenceVerified: boolean;
  reinspectionCompleted: boolean;
  relatedIssuesResolved: boolean;
  reviewer: ActorContext & { officeholderId: string };
  authorityEvaluationRecordId?: string;
  authorityReference?: string;
}

export interface ReopenInspectionFindingInput {
  findingId: string;
  priorClosureId: string;
  reason: ComplianceFindingReopeningReason;
  reasonDetail: string;
  reviewer: ActorContext & { officeholderId: string };
  authorityReference?: string;
}

export interface RouteImmediateRiskInput {
  matterId: string;
  route: ComplianceImmediateActionRoute;
  reason: string;
}

@Injectable()
export class CorrectiveActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: InspectionComplianceBoundaryService,
  ) {}

  async createComplianceMatter(input: CreateComplianceMatterInput) {
    const complianceMatterNumber = await this.nextNumber(
      COMPLIANCE_MATTER_NUMBER_PREFIX,
      'complianceMatter',
    );

    return this.prisma.complianceMatter.create({
      data: {
        complianceMatterNumber,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        officialInstrumentId: input.officialInstrumentId,
        responsibleInstitutionId: input.responsibleInstitutionId,
        responsibleDepartmentId: input.responsibleDepartmentId,
        caseId: input.caseId,
        holderIdentityId: input.holderIdentityId,
        holderOrganizationId: input.holderOrganizationId,
        summary: input.summary,
        riskLevel: input.riskLevel ?? ComplianceRiskLevel.MODERATE,
        immediateActionRoute: input.immediateActionRoute ?? ComplianceImmediateActionRoute.NONE,
        authoritySource: input.authoritySource,
      },
    });
  }

  async recordInspectionFinding(
    input: RecordInspectionFindingInput & {
      inspectionSessionId: string;
      inspectorIdentityId: string;
      inspectorOfficeholderId: string;
    },
  ) {
    const findingNumber = await this.nextNumber(
      INSPECTION_FINDING_NUMBER_PREFIX,
      'inspectionFinding',
    );

    const severity: InspectionFindingSeverity =
      input.severity === ComplianceRiskLevel.CRITICAL
        ? InspectionFindingSeverity.CRITICAL
        : input.severity === ComplianceRiskLevel.HIGH
          ? InspectionFindingSeverity.MAJOR
          : input.severity === ComplianceRiskLevel.LOW
            ? InspectionFindingSeverity.MINOR
            : InspectionFindingSeverity.MODERATE;

    return this.prisma.inspectionFinding.create({
      data: {
        findingNumber,
        inspectionSessionId: input.inspectionSessionId,
        complianceMatterId: input.complianceMatterId,
        factsReliedUpon: input.description,
        severity,
        inspectorIdentityId: input.inspectorIdentityId,
        inspectorOfficeholderId: input.inspectorOfficeholderId,
        status: InspectionFindingStatus.DRAFT,
      },
    });
  }

  async proposeCorrectiveActionPlan(input: ProposeCorrectiveActionPlanInput) {
    const matter = await this.prisma.complianceMatter.findUnique({
      where: { id: input.complianceMatterId },
    });
    if (!matter) {
      throw new NotFoundException('Compliance matter not found');
    }

    this.boundary.assertCorrectiveActionNotUsedForImmediateRisk({
      immediateActionRoute: matter.immediateActionRoute,
      startingCorrectiveActionPlan: true,
    });

    this.boundary.assertImmediateRiskRoutesOutsideCapa({
      riskLevel: matter.riskLevel,
      immediateActionRoute: matter.immediateActionRoute,
      attemptingCorrectiveActionOnly: true,
    });

    this.boundary.assertAiRootCauseIsNonCulpability({
      actorRoleMarker: input.actor.roleMarker,
      assertingCulpability: input.aiAssistanceMetadata
        ? JSON.stringify(input.aiAssistanceMetadata).includes('culpability')
        : false,
    });

    const planNumber = await this.nextNumber(
      CORRECTIVE_ACTION_PLAN_NUMBER_PREFIX,
      'correctiveActionPlan',
    );

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.correctiveActionPlan.create({
        data: {
          planNumber,
          complianceMatterId: input.complianceMatterId,
          inspectionFindingId: input.inspectionFindingId,
          authoritySource: input.authoritySource,
          rootCauseDescription: input.rootCauseDescription,
          rootCauseAnalysisMethod: input.rootCauseAnalysisMethod,
          aiAssistanceMetadata: input.aiAssistanceMetadata ?? {},
          requiredActions: input.requiredActions,
          responsibleParty: input.responsibleParty,
          interimProtection: input.interimProtection,
          dueDate: input.dueDate,
          evidenceRequired: input.evidenceRequired,
          verificationMethod: input.verificationMethod,
          escalationRule: input.escalationRule,
          status: CorrectiveActionPlanStatus.PROPOSED,
        },
      });

      if (input.items?.length) {
        await tx.correctiveActionItem.createMany({
          data: input.items.map((item, index) => ({
            correctiveActionPlanId: plan.id,
            itemNumber: index + 1,
            actionDescription: item.actionDescription,
            responsibleParty: item.responsibleParty,
            dueDate: item.dueDate,
            evidenceRequired: item.evidenceRequired,
          })),
        });
      }

      await tx.inspectionFinding.update({
        where: { id: input.inspectionFindingId },
        data: { status: InspectionFindingStatus.CORRECTIVE_ACTION_REQUIRED },
      });

      await tx.complianceMatter.update({
        where: { id: input.complianceMatterId },
        data: { status: ComplianceMatterStatus.CORRECTIVE_ACTION },
      });

      return plan;
    });
  }

  async approveCorrectiveActionPlan(input: ApproveCorrectiveActionPlanInput) {
    return this.prisma.correctiveActionPlan.update({
      where: { id: input.planId },
      data: {
        status: CorrectiveActionPlanStatus.APPROVED,
        approvedByOfficeholderId: input.approver.officeholderId,
        approvedByIdentityId: input.approver.identityId,
        approvedAt: new Date(),
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
      },
    });
  }

  async submitCorrectiveActionEvidence(input: SubmitCorrectiveActionEvidenceInput) {
    this.boundary.assertSubmissionIsNotVerification({ treatingSubmissionAsVerified: false });

    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.correctiveActionSubmission.create({
        data: {
          correctiveActionPlanId: input.planId,
          correctiveActionItemId: input.itemId,
          submittedByIdentityId: input.submitter.identityId,
          submissionSummary: input.submissionSummary,
          status: CorrectiveActionSubmissionStatus.SUBMITTED,
        },
      });

      if (input.evidenceRecordIds.length > 0) {
        await tx.correctiveActionSubmissionEvidence.createMany({
          data: input.evidenceRecordIds.map((evidenceRecordId) => ({
            submissionId: submission.id,
            evidenceRecordId,
          })),
        });
      }

      await tx.correctiveActionPlan.update({
        where: { id: input.planId },
        data: { status: CorrectiveActionPlanStatus.EVIDENCE_SUBMITTED },
      });

      if (input.itemId) {
        await tx.correctiveActionItem.update({
          where: { id: input.itemId },
          data: { status: 'EVIDENCE_SUBMITTED' },
        });
      }

      const findingId = (
        await tx.correctiveActionPlan.findUnique({
          where: { id: input.planId },
          select: { inspectionFindingId: true },
        })
      )?.inspectionFindingId;

      if (findingId) {
        await tx.inspectionFinding.update({
          where: { id: findingId },
          data: { status: InspectionFindingStatus.CORRECTIVE_ACTION_REQUIRED },
        });
      }

      return submission;
    });
  }

  async verifyCorrectiveAction(input: VerifyCorrectiveActionInput) {
    this.boundary.assertHolderCannotVerifyCorrectiveAction({
      actorRoleMarker: input.verifier.roleMarker,
      targetStatus:
        input.result === CorrectiveActionVerificationResult.VERIFIED
          ? CorrectiveActionPlanStatus.VERIFIED_COMPLETE
          : undefined,
    });

    this.boundary.assertTechnicalAdminCannotVerifySubstantiveRemediation({
      actorRoleMarker: input.verifier.roleMarker,
      hasOfficeholderAuthority: Boolean(input.verifier.officeholderId),
    });

    if (!input.verifier.officeholderId) {
      throw new BadRequestException(
        'Corrective action verification requires an identified verifier officeholder',
      );
    }
    const verifierOfficeholderId = input.verifier.officeholderId;

    const plan = await this.prisma.correctiveActionPlan.findUnique({
      where: { id: input.planId },
      include: { items: true },
    });
    if (!plan) {
      throw new NotFoundException('Corrective action plan not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const verification = await tx.correctiveActionVerification.create({
        data: {
          correctiveActionPlanId: input.planId,
          correctiveActionItemId: input.itemId,
          actionVerified: input.actionVerified,
          evidenceSummary: input.evidenceSummary,
          verificationMethod: input.verificationMethod,
          verifierIdentityId: input.verifier.identityId,
          verifierOfficeholderId,
          authorityEvaluationRecordId: input.authorityEvaluationRecordId,
          verifiedAt: new Date(),
          result: input.result,
          limitations: input.limitations,
          followUpRequired: input.followUpRequired,
        },
      });

      if (input.evidenceRecordIds?.length) {
        await tx.correctiveActionVerificationEvidence.createMany({
          data: input.evidenceRecordIds.map((evidenceRecordId) => ({
            verificationId: verification.id,
            evidenceRecordId,
          })),
        });
      }

      let nextPlanStatus: CorrectiveActionPlanStatus =
        CorrectiveActionPlanStatus.VERIFICATION_PENDING;
      if (input.result === CorrectiveActionVerificationResult.VERIFIED) {
        nextPlanStatus = CorrectiveActionPlanStatus.VERIFIED_COMPLETE;
      } else if (input.result === CorrectiveActionVerificationResult.PARTIALLY_VERIFIED) {
        nextPlanStatus = CorrectiveActionPlanStatus.PARTIALLY_VERIFIED;
      } else if (input.result === CorrectiveActionVerificationResult.REINSPECTION_REQUIRED) {
        nextPlanStatus = CorrectiveActionPlanStatus.VERIFICATION_PENDING;
        await tx.reinspectionRequirement.create({
          data: {
            inspectionFindingId: plan.inspectionFindingId,
            requirementDescription:
              input.followUpRequired ?? 'Reinspection required before closure',
          },
        });
      } else {
        nextPlanStatus = CorrectiveActionPlanStatus.FAILED;
      }

      await tx.correctiveActionPlan.update({
        where: { id: input.planId },
        data: { status: nextPlanStatus },
      });

      if (input.itemId) {
        const itemStatus =
          input.result === CorrectiveActionVerificationResult.VERIFIED
            ? 'VERIFIED'
            : input.result === CorrectiveActionVerificationResult.PARTIALLY_VERIFIED
              ? 'PARTIALLY_VERIFIED'
              : 'FAILED';
        await tx.correctiveActionItem.update({
          where: { id: input.itemId },
          data: { status: itemStatus },
        });
      }

      if (plan.items.length > 0) {
        const verifiedCount = await tx.correctiveActionItem.count({
          where: {
            correctiveActionPlanId: input.planId,
            status: { in: ['VERIFIED', 'PARTIALLY_VERIFIED'] },
          },
        });
        this.boundary.assertPartialVerificationDoesNotCloseAllActions({
          totalItems: plan.items.length,
          verifiedItems: verifiedCount,
          attemptingFullClosure: nextPlanStatus === CorrectiveActionPlanStatus.VERIFIED_COMPLETE,
        });
      }

      return verification;
    });
  }

  async closeInspectionFinding(input: CloseInspectionFindingInput) {
    this.boundary.assertHolderCannotCloseFinding({ actorRoleMarker: input.reviewer.roleMarker });
    this.boundary.assertAiCannotCloseFinding({ actorRoleMarker: input.reviewer.roleMarker });
    this.boundary.assertClosureRequiresAttribution({
      reviewerOfficeholderId: input.reviewer.officeholderId,
      reviewerIdentityId: input.reviewer.identityId,
    });

    const finding = await this.prisma.inspectionFinding.findUnique({
      where: { id: input.findingId },
      include: {
        correctiveActionPlans: { include: { items: true } },
        reinspectionRequirements: true,
        closures: { where: { status: ComplianceFindingClosureStatus.ACTIVE } },
      },
    });
    if (!finding) {
      throw new NotFoundException('Inspection finding not found');
    }

    if (finding.closures.length > 0) {
      throw new BadRequestException('Finding is already closed');
    }

    const pendingReinspection = finding.reinspectionRequirements.filter(
      (req) => req.status === ReinspectionRequirementStatus.REQUIRED,
    ).length;
    this.boundary.assertReinspectionBlocksClosure({
      pendingReinspectionCount: pendingReinspection,
    });

    const activePlan = finding.correctiveActionPlans.find(
      (plan) => plan.status !== CorrectiveActionPlanStatus.SUPERSEDED,
    );
    if (activePlan && activePlan.status !== CorrectiveActionPlanStatus.VERIFIED_COMPLETE) {
      throw new BadRequestException(
        'Finding cannot close until corrective action plan is verified complete',
      );
    }

    if (activePlan?.items.length) {
      const verifiedItems = activePlan.items.filter((item) => item.status === 'VERIFIED').length;
      this.boundary.assertPartialVerificationDoesNotCloseAllActions({
        totalItems: activePlan.items.length,
        verifiedItems,
        attemptingFullClosure: true,
      });
    }

    const closureNumber = await this.nextNumber(
      COMPLIANCE_FINDING_CLOSURE_NUMBER_PREFIX,
      'complianceFindingClosure',
    );

    return this.prisma.$transaction(async (tx) => {
      const closure = await tx.complianceFindingClosure.create({
        data: {
          inspectionFindingId: input.findingId,
          closureNumber,
          closureSummary: input.closureSummary,
          requiredActionsCompleted: input.requiredActionsCompleted,
          requiredEvidenceVerified: input.requiredEvidenceVerified,
          reinspectionCompleted: input.reinspectionCompleted,
          relatedIssuesResolved: input.relatedIssuesResolved,
          recordsPreserved: true,
          reviewerOfficeholderId: input.reviewer.officeholderId,
          reviewerIdentityId: input.reviewer.identityId,
          authorityEvaluationRecordId: input.authorityEvaluationRecordId,
          authorityReference: input.authorityReference,
          closedAt: new Date(),
        },
      });

      await tx.inspectionFinding.update({
        where: { id: input.findingId },
        data: { status: InspectionFindingStatus.CLOSED, closedAt: new Date() },
      });

      const plan = await tx.correctiveActionPlan.findFirst({
        where: { inspectionFindingId: input.findingId },
        select: { complianceMatterId: true },
      });
      if (plan?.complianceMatterId) {
        await tx.complianceMatter.update({
          where: { id: plan.complianceMatterId },
          data: { status: ComplianceMatterStatus.CLOSED, closedAt: new Date() },
        });
      }

      return closure;
    });
  }

  async reopenInspectionFinding(input: ReopenInspectionFindingInput) {
    this.boundary.assertAiCannotCloseFinding({ actorRoleMarker: input.reviewer.roleMarker });

    const priorClosure = await this.prisma.complianceFindingClosure.findUnique({
      where: { id: input.priorClosureId },
    });
    if (priorClosure?.status !== ComplianceFindingClosureStatus.ACTIVE) {
      throw new BadRequestException('Prior active closure record required for reopening');
    }

    const reopeningNumber = await this.nextNumber(
      COMPLIANCE_FINDING_REOPENING_NUMBER_PREFIX,
      'complianceFindingReopening',
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.complianceFindingClosure.update({
        where: { id: input.priorClosureId },
        data: { status: ComplianceFindingClosureStatus.SUPERSEDED_BY_REOPENING },
      });

      const reopening = await tx.complianceFindingReopening.create({
        data: {
          inspectionFindingId: input.findingId,
          priorClosureId: input.priorClosureId,
          reopeningNumber,
          reason: input.reason,
          reasonDetail: input.reasonDetail,
          reviewerOfficeholderId: input.reviewer.officeholderId,
          reviewerIdentityId: input.reviewer.identityId,
          authorityReference: input.authorityReference,
          reopenedAt: new Date(),
        },
      });

      await tx.inspectionFinding.update({
        where: { id: input.findingId },
        data: { status: InspectionFindingStatus.REOPENED, closedAt: null },
      });

      const finding = await tx.inspectionFinding.findUnique({
        where: { id: input.findingId },
        select: { complianceMatterId: true },
      });
      const matterId =
        finding?.complianceMatterId ??
        (
          await tx.correctiveActionPlan.findFirst({
            where: { inspectionFindingId: input.findingId },
            select: { complianceMatterId: true },
          })
        )?.complianceMatterId;
      if (matterId) {
        await tx.complianceMatter.update({
          where: { id: matterId },
          data: { status: ComplianceMatterStatus.REOPENED, closedAt: null },
        });
      }

      return reopening;
    });
  }

  async markCorrectiveActionOverdue(planId: string) {
    this.boundary.assertOverdueDoesNotAutoRevoke();

    return this.prisma.correctiveActionPlan.update({
      where: { id: planId },
      data: { status: CorrectiveActionPlanStatus.OVERDUE },
    });
  }

  async routeImmediateRisk(input: RouteImmediateRiskInput) {
    if (input.route === ComplianceImmediateActionRoute.NONE) {
      throw new BadRequestException('Immediate risk route must be specified');
    }

    return this.prisma.complianceMatter.update({
      where: { id: input.matterId },
      data: {
        immediateActionRoute: input.route,
        status: ComplianceMatterStatus.ROUTED_IMMEDIATE_ACTION,
        summary: input.reason,
      },
    });
  }

  private async nextNumber(
    prefix: string,
    model:
      | 'complianceMatter'
      | 'inspectionFinding'
      | 'correctiveActionPlan'
      | 'complianceFindingClosure'
      | 'complianceFindingReopening',
  ): Promise<string> {
    const count = await (this.prisma[model] as { count: () => Promise<number> }).count();
    return `${prefix}-${String(count + 1).padStart(8, '0')}`;
  }
}
