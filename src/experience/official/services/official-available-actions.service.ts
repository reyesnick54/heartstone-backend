import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  CaseWorkflowStepInstanceStatus,
  FunctionAuthorityLifecycleStatus,
  WorkflowStepConsequenceLevel,
  WorkflowStepType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  OfficialAvailableActionDto,
  OfficialAvailableActionsResponseDto,
} from '../dto/official-available-actions-response.dto';
import { OFFICIAL_ACTION_KEYS } from '../official-experience.constants';
import { type ResolvedOfficialContext } from '../types/official-context.types';
import { OfficialScopeService } from './official-scope.service';

interface ActionCandidate {
  actionKey: string;
  label: string;
  description: string;
  isConsequential: boolean;
  authorityAction: AuthorityActionType | null;
  functionAuthorityRecordId: string | null;
  executionRoute: string;
  stepKey?: string;
  priorActions?: AuthorityActionType[];
}

@Injectable()
export class OfficialAvailableActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: OfficialScopeService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async getAvailableActions(
    context: ResolvedOfficialContext,
    caseId: string,
  ): Promise<OfficialAvailableActionsResponseDto> {
    await this.scopeService.assertCaseAccess(context, caseId);

    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        workflowInstance: {
          include: {
            stepInstances: {
              where: {
                status: {
                  in: [
                    CaseWorkflowStepInstanceStatus.PENDING,
                    CaseWorkflowStepInstanceStatus.ACTIVE,
                    CaseWorkflowStepInstanceStatus.WAITING_APPLICANT,
                    CaseWorkflowStepInstanceStatus.WAITING_EXTERNAL,
                  ],
                },
              },
              include: { workflowStepDefinition: true },
            },
          },
        },
      },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }

    const candidates = this.buildActionCandidates(caseRecord, caseId);
    const primaryAppointment = context.scope.primaryAppointment;
    const primaryDelegation = context.scope.activeDelegations[0];

    const actions: OfficialAvailableActionDto[] = [];

    for (const candidate of candidates) {
      if (!candidate.isConsequential || !candidate.functionAuthorityRecordId) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          description: candidate.description,
          available: true,
          isConsequential: false,
          authorityAction: candidate.authorityAction,
          functionAuthorityRecordId: candidate.functionAuthorityRecordId,
          evaluationOutcome: null,
          unavailableReason: null,
          executionRoute: candidate.executionRoute,
          requiresExecutionTimeRevalidation: true,
        });
        continue;
      }

      const functionRecord = await this.prisma.functionAuthorityRecord.findUnique({
        where: { id: candidate.functionAuthorityRecordId },
        select: { lifecycleStatus: true },
      });

      if (functionRecord?.lifecycleStatus === FunctionAuthorityLifecycleStatus.SUSPENDED) {
        actions.push({
          actionKey: candidate.actionKey,
          label: candidate.label,
          description: candidate.description,
          available: false,
          isConsequential: true,
          authorityAction: candidate.authorityAction,
          functionAuthorityRecordId: candidate.functionAuthorityRecordId,
          evaluationOutcome: AuthorityEvaluationOutcome.DENY,
          unavailableReason: 'Authority function is currently suspended',
          executionRoute: candidate.executionRoute,
          requiresExecutionTimeRevalidation: true,
        });
        continue;
      }

      const evaluation = await this.authorityEvaluation.evaluate({
        identityId: context.identityId,
        functionAuthorityRecordId: candidate.functionAuthorityRecordId,
        action: candidate.authorityAction ?? AuthorityActionType.REVIEW,
        officeholderId: primaryAppointment?.officeholderId,
        officeId: primaryAppointment?.officeId,
        appointmentId: primaryAppointment?.appointmentId,
        delegationId: primaryDelegation?.delegationId,
        resourceScope: { caseId },
      });

      const available = evaluation.outcome === AuthorityEvaluationOutcome.ALLOW;

      actions.push({
        actionKey: candidate.actionKey,
        label: candidate.label,
        description: candidate.description,
        available,
        isConsequential: true,
        authorityAction: candidate.authorityAction,
        functionAuthorityRecordId: candidate.functionAuthorityRecordId,
        evaluationOutcome: evaluation.outcome,
        unavailableReason: available ? null : evaluation.summary,
        executionRoute: candidate.executionRoute,
        requiresExecutionTimeRevalidation: true,
      });
    }

    return {
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      evaluatedAt: new Date().toISOString(),
      actions,
      executionRequiresAuthorityRevalidation: true,
    };
  }

  private buildActionCandidates(
    caseRecord: {
      workflowInstance: {
        stepInstances: {
          workflowStepDefinition: {
            stepKey: string;
            stepType: WorkflowStepType;
            consequenceLevel: WorkflowStepConsequenceLevel;
            functionAuthorityRecordId: string | null;
            authorityActionType: AuthorityActionType | null;
          };
        }[];
      } | null;
    },
    caseId: string,
  ): ActionCandidate[] {
    const candidates: ActionCandidate[] = [];
    const activeSteps = caseRecord.workflowInstance?.stepInstances ?? [];

    for (const step of activeSteps) {
      const stepDef = step.workflowStepDefinition;
      const stepRoute = `/api/v1/cases/${caseId}/workflow/steps/${stepDef.stepKey}/complete`;

      switch (stepDef.stepType) {
        case WorkflowStepType.INTAKE:
        case WorkflowStepType.COMPLETENESS_REVIEW:
          candidates.push(
            {
              actionKey: OFFICIAL_ACTION_KEYS.REVIEW_APPLICATION,
              label: 'Review application',
              description: 'Review submitted application materials',
              isConsequential:
                stepDef.consequenceLevel === WorkflowStepConsequenceLevel.CONSEQUENTIAL,
              authorityAction: stepDef.authorityActionType ?? AuthorityActionType.REVIEW,
              functionAuthorityRecordId: stepDef.functionAuthorityRecordId,
              executionRoute: `/api/v1/cases/${caseId}/completeness-reviews`,
            },
            {
              actionKey: OFFICIAL_ACTION_KEYS.REQUEST_ADDITIONAL_INFORMATION,
              label: 'Request additional information',
              description: 'Issue an applicant information request',
              isConsequential: false,
              authorityAction: null,
              functionAuthorityRecordId: null,
              executionRoute: `/api/v1/cases/${caseId}/communications`,
            },
            {
              actionKey: OFFICIAL_ACTION_KEYS.COMPLETE_WORKFLOW_STEP,
              label: 'Complete workflow step',
              description: `Complete ${stepDef.stepKey}`,
              isConsequential:
                stepDef.consequenceLevel === WorkflowStepConsequenceLevel.CONSEQUENTIAL,
              authorityAction: stepDef.authorityActionType ?? AuthorityActionType.REVIEW,
              functionAuthorityRecordId: stepDef.functionAuthorityRecordId,
              executionRoute: stepRoute,
              stepKey: stepDef.stepKey,
            },
          );
          break;

        case WorkflowStepType.SUBSTANTIVE_REVIEW:
        case WorkflowStepType.PROFESSIONAL_REVIEW:
          candidates.push(
            {
              actionKey: OFFICIAL_ACTION_KEYS.REVIEW_EVIDENCE,
              label: 'Review evidence',
              description: 'Review evidence packet and supporting records',
              isConsequential:
                stepDef.consequenceLevel === WorkflowStepConsequenceLevel.CONSEQUENTIAL,
              authorityAction: stepDef.authorityActionType ?? AuthorityActionType.REVIEW,
              functionAuthorityRecordId: stepDef.functionAuthorityRecordId,
              executionRoute: `/api/v1/cases/${caseId}/dashboard`,
            },
            {
              actionKey: OFFICIAL_ACTION_KEYS.COMPLETE_WORKFLOW_STEP,
              label: 'Complete workflow step',
              description: `Complete ${stepDef.stepKey}`,
              isConsequential:
                stepDef.consequenceLevel === WorkflowStepConsequenceLevel.CONSEQUENTIAL,
              authorityAction: stepDef.authorityActionType ?? AuthorityActionType.REVIEW,
              functionAuthorityRecordId: stepDef.functionAuthorityRecordId,
              executionRoute: stepRoute,
              stepKey: stepDef.stepKey,
            },
          );
          break;

        case WorkflowStepType.EXTERNAL_REFERRAL:
          candidates.push({
            actionKey: OFFICIAL_ACTION_KEYS.CREATE_REFERRAL,
            label: 'Create referral',
            description: 'Refer case to external authority',
            isConsequential: false,
            authorityAction: null,
            functionAuthorityRecordId: null,
            executionRoute: `/api/v1/cases/${caseId}/referrals`,
          });
          break;

        case WorkflowStepType.DECISION_GATE:
          candidates.push(
            {
              actionKey: OFFICIAL_ACTION_KEYS.PREPARE_DECISION,
              label: 'Prepare decision',
              description: 'Prepare decision record for review',
              isConsequential: false,
              authorityAction: AuthorityActionType.PREPARE,
              functionAuthorityRecordId: stepDef.functionAuthorityRecordId,
              executionRoute: `/api/v1/decisions`,
            },
            {
              actionKey: OFFICIAL_ACTION_KEYS.APPROVE_DECISION,
              label: 'Approve decision',
              description: 'Approve the prepared government decision',
              isConsequential: true,
              authorityAction: AuthorityActionType.APPROVE,
              functionAuthorityRecordId: stepDef.functionAuthorityRecordId,
              executionRoute: `/api/v1/decisions`,
              priorActions: [AuthorityActionType.PREPARE],
            },
            {
              actionKey: OFFICIAL_ACTION_KEYS.REFUSE_DECISION,
              label: 'Refuse decision',
              description: 'Record refusal decision',
              isConsequential: true,
              authorityAction: AuthorityActionType.DECIDE,
              functionAuthorityRecordId: stepDef.functionAuthorityRecordId,
              executionRoute: `/api/v1/decisions`,
              priorActions: [AuthorityActionType.PREPARE],
            },
          );
          break;

        case WorkflowStepType.ISSUANCE_GATE:
          candidates.push({
            actionKey: OFFICIAL_ACTION_KEYS.ISSUE_INSTRUMENT,
            label: 'Issue instrument',
            description: 'Issue official instrument when issuance requirements are met',
            isConsequential: true,
            authorityAction: AuthorityActionType.ISSUE,
            functionAuthorityRecordId: stepDef.functionAuthorityRecordId,
            executionRoute: `/api/v1/issuance`,
          });
          break;

        default:
          candidates.push({
            actionKey: OFFICIAL_ACTION_KEYS.COMPLETE_WORKFLOW_STEP,
            label: 'Complete workflow step',
            description: `Complete ${stepDef.stepKey}`,
            isConsequential:
              stepDef.consequenceLevel === WorkflowStepConsequenceLevel.CONSEQUENTIAL,
            authorityAction: stepDef.authorityActionType ?? AuthorityActionType.REVIEW,
            functionAuthorityRecordId: stepDef.functionAuthorityRecordId,
            executionRoute: stepRoute,
            stepKey: stepDef.stepKey,
          });
      }
    }

    if (caseRecord.workflowInstance) {
      const hasInspectionStatus = activeSteps.some(
        (step) => step.workflowStepDefinition.stepType === WorkflowStepType.SUBSTANTIVE_REVIEW,
      );
      if (hasInspectionStatus) {
        candidates.push(
          {
            actionKey: OFFICIAL_ACTION_KEYS.SCHEDULE_INSPECTION,
            label: 'Schedule inspection',
            description: 'Schedule compliance or site inspection',
            isConsequential: false,
            authorityAction: AuthorityActionType.INSPECT,
            functionAuthorityRecordId: null,
            executionRoute: `/api/v1/compliance/inspections`,
          },
          {
            actionKey: OFFICIAL_ACTION_KEYS.RECORD_INSPECTION,
            label: 'Record inspection',
            description: 'Record inspection findings',
            isConsequential: true,
            authorityAction: AuthorityActionType.INSPECT,
            functionAuthorityRecordId: null,
            executionRoute: `/api/v1/compliance/inspections`,
          },
        );
      }
    }

    return this.deduplicateCandidates(candidates);
  }

  private deduplicateCandidates(candidates: ActionCandidate[]): ActionCandidate[] {
    const seen = new Set<string>();
    return candidates.filter((candidate) => {
      const key = `${candidate.actionKey}:${candidate.executionRoute}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
