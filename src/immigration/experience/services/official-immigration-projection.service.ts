import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  CaseSlaClockStatus,
  CaseStatus,
  CaseWorkflowStepInstanceStatus,
  FunctionAuthorityLifecycleStatus,
} from '@prisma/client';

import { AuthorityDependencyEvaluator } from '../../../authority/dependencies/authority-dependency-evaluator.service';
import { AuthorityEvaluationService } from '../../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../../database/prisma.service';
import { OfficialScopeService } from '../../../experience/official/services/official-scope.service';
import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import { ImmigrationExperienceBoundaryService } from '../../boundary/immigration-experience-boundary.service';
import {
  type OfficialImmigrationAvailableActionsResponseDto,
  type OfficialImmigrationWorkspaceResponseDto,
} from '../dto/official-immigration-response.dto';
import { ImmigrationScopeService } from './immigration-scope.service';

const IMMIGRATION_OFFICIAL_ACTIONS = [
  {
    actionKey: 'request_evidence',
    label: 'Request evidence',
    authorityAction: null,
    isConsequential: false,
  },
  {
    actionKey: 'verify_document',
    label: 'Verify document',
    authorityAction: null,
    isConsequential: false,
  },
  {
    actionKey: 'schedule_interview',
    label: 'Schedule interview',
    authorityAction: null,
    isConsequential: false,
  },
  {
    actionKey: 'record_external_determination_reference',
    label: 'Record external determination reference',
    authorityAction: null,
    isConsequential: false,
  },
  {
    actionKey: 'prepare_decision',
    label: 'Prepare decision',
    authorityAction: null,
    isConsequential: false,
  },
  {
    actionKey: 'decide',
    label: 'Decide application',
    authorityAction: 'DECIDE' as const,
    isConsequential: true,
  },
  {
    actionKey: 'issue_credential',
    label: 'Issue immigration credential',
    authorityAction: 'ISSUE' as const,
    isConsequential: true,
  },
];

@Injectable()
export class OfficialImmigrationProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly immigrationScope: ImmigrationScopeService,
    private readonly officialScope: OfficialScopeService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly dependencyEvaluator: AuthorityDependencyEvaluator,
    private readonly boundary: ImmigrationExperienceBoundaryService,
  ) {}

  async buildWorkspace(
    context: ResolvedOfficialContext,
  ): Promise<OfficialImmigrationWorkspaceResponseDto> {
    const caseWhere = this.immigrationScope.buildOfficialCaseWhere(context.scope.departmentIds);
    const stepCaseFilter = { caseWorkflowInstance: { case: caseWhere } };

    const [
      intakeQueue,
      documentReview,
      externalQueue,
      interviewQueue,
      biometricPending,
      completenessIssues,
      decisionReady,
      expiringPermits,
      appeals,
      slaRisk,
      unresolvedExternal,
    ] = await Promise.all([
      this.prisma.case.count({
        where: { ...caseWhere, status: { in: [CaseStatus.RECEIVED, CaseStatus.INTAKE] } },
      }),
      this.prisma.caseWorkflowStepInstance.count({
        where: {
          ...stepCaseFilter,
          status: CaseWorkflowStepInstanceStatus.ACTIVE,
          workflowStepDefinition: { stepKey: 'document-review' },
        },
      }),
      this.prisma.case.count({
        where: { ...caseWhere, status: CaseStatus.PENDING_EXTERNAL },
      }),
      this.prisma.serviceAppointment.count({
        where: {
          case: caseWhere,
          appointmentReason: { code: { contains: 'INTERVIEW' } },
        },
      }),
      this.prisma.caseWorkflowStepInstance.count({
        where: {
          ...stepCaseFilter,
          status: {
            in: [CaseWorkflowStepInstanceStatus.PENDING, CaseWorkflowStepInstanceStatus.ACTIVE],
          },
          workflowStepDefinition: { stepKey: 'biometric' },
        },
      }),
      this.prisma.case.count({
        where: { ...caseWhere, status: CaseStatus.WAITING_APPLICANT },
      }),
      this.prisma.case.count({
        where: { ...caseWhere, status: CaseStatus.DECISION_PENDING },
      }),
      this.prisma.officialInstrument.count({
        where: {
          case: caseWhere,
          effectiveUntil: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.redressMatter.count({ where: { case: caseWhere, closedAt: null } }),
      this.prisma.caseSlaClock.count({
        where: {
          case: caseWhere,
          status: CaseSlaClockStatus.BREACHED,
        },
      }),
      this.prisma.case.count({
        where: { ...caseWhere, status: CaseStatus.PENDING_EXTERNAL },
      }),
    ]);

    return {
      departmentScopeLabel:
        context.scope.primaryAppointment?.departmentName ?? 'Immigration department scope',
      disclaimer: this.boundary.disclaimer,
      queues: [
        { queueKey: 'intake', label: 'Intake queue', count: intakeQueue },
        { queueKey: 'document_review', label: 'Document review', count: documentReview },
        {
          queueKey: 'external_dependency',
          label: 'Background/external dependency queue',
          count: externalQueue,
        },
        { queueKey: 'interview', label: 'Interview queue', count: interviewQueue },
        { queueKey: 'biometric', label: 'Biometric status', count: biometricPending },
        { queueKey: 'completeness', label: 'Completeness issues', count: completenessIssues },
        { queueKey: 'decision_ready', label: 'Decision-ready cases', count: decisionReady },
        { queueKey: 'expiring_permits', label: 'Expiring permits', count: expiringPermits },
        { queueKey: 'appeals', label: 'Appeals', count: appeals },
      ],
      slaRiskCount: slaRisk,
      unresolvedExternalDeterminationsCount: unresolvedExternal,
    };
  }

  async getAvailableActions(
    context: ResolvedOfficialContext,
    caseId: string,
  ): Promise<OfficialImmigrationAvailableActionsResponseDto> {
    await this.officialScope.assertCaseAccess(context, caseId);

    const caseRecord = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        ...this.immigrationScope.buildOfficialCaseWhere(context.scope.departmentIds),
      },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Immigration case "${caseId}" was not found in scope`);
    }

    const decideFunction = await this.prisma.functionAuthorityRecord.findFirst({
      where: { code: 'TEMPLATE-AUTH-IMMIGRATION-DECIDE' },
    });

    const actions = [];
    for (const candidate of IMMIGRATION_OFFICIAL_ACTIONS) {
      if (!candidate.isConsequential) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: true,
          unavailableReason: null,
        });
        continue;
      }

      if (!decideFunction) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: false,
          unavailableReason: 'Decision authority is not configured for this jurisdiction',
        });
        continue;
      }

      const delegationExpired =
        context.scope.activeDelegations.length === 0 &&
        !context.scope.primaryAppointment &&
        candidate.actionKey === 'decide';

      if (delegationExpired) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: false,
          unavailableReason: 'Active appointment or delegation required',
        });
        continue;
      }

      const dependencies = await this.prisma.authorityDependency.findMany({
        where: { functionAuthorityRecordId: decideFunction.id },
      });

      const dependencyFailures = await this.dependencyEvaluator.evaluate(
        decideFunction.id,
        dependencies,
        { identityType: context.identityType },
      );

      const blockingExternal = this.dependencyEvaluator.hasBlockingFailures(
        dependencies,
        dependencyFailures,
      );

      if (blockingExternal && candidate.actionKey === 'decide') {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: false,
          unavailableReason: 'Unresolved mandatory external check blocks decision',
        });
        continue;
      }

      if (decideFunction.lifecycleStatus === FunctionAuthorityLifecycleStatus.SUSPENDED) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          available: false,
          unavailableReason: 'Authority function is suspended',
        });
        continue;
      }

      const evaluation = await this.authorityEvaluation.evaluate({
        identityId: context.identityId,
        functionAuthorityRecordId: decideFunction.id,
        action: candidate.authorityAction ?? AuthorityActionType.DECIDE,
        officeholderId: context.scope.primaryAppointment?.officeholderId,
        officeId: context.scope.primaryAppointment?.officeId,
        appointmentId: context.scope.primaryAppointment?.appointmentId,
        delegationId: context.scope.activeDelegations[0]?.delegationId,
        priorActions: [],
        hasSecondApproval: false,
      });

      actions.push({
        actionKey: candidate.actionKey,
        label: candidate.label,
        available: evaluation.outcome === AuthorityEvaluationOutcome.ALLOW,
        unavailableReason:
          evaluation.outcome === AuthorityEvaluationOutcome.ALLOW
            ? null
            : evaluation.summary || 'Authority evaluation denied',
      });
    }

    return { caseId, actions };
  }
}
