import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  CaseEventType,
  CaseStatus,
  CaseWorkflowInstanceStatus,
  CaseWorkflowStepInstanceStatus,
  WorkflowStepConsequenceLevel,
  WorkflowStepType,
  WorkflowTransitionJoinType,
  WorkflowVersionStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { CaseEventsService } from '../cases/case-events.service';
import { CaseStatusService } from '../cases/case-status.service';
import {
  ConsequentialAuthorityRequiredException,
  InvalidWorkflowTransitionException,
  SafeHaltedWorkflowException,
  WorkflowGateBlockedException,
  WorkflowStepAlreadyCompletedException,
  WorkflowSuspendedException,
} from '../common/exceptions/application-processing.exceptions';

export interface CompleteStepInput {
  caseId: string;
  stepKey: string;
  actorIdentityId: string;
  officeholderId?: string;
  officeId?: string;
  appointmentId?: string;
  delegationId?: string;
  outcome?: string;
}

@Injectable()
export class WorkflowRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly caseStatus: CaseStatusService,
    private readonly caseEvents: CaseEventsService,
  ) {}

  async startWorkflow(caseId: string, workflowVersionId: string) {
    const workflowVersion = await this.prisma.workflowVersion.findUnique({
      where: { id: workflowVersionId },
      include: {
        steps: { orderBy: { displayOrder: 'asc' } },
        transitions: true,
      },
    });

    if (workflowVersion?.status !== WorkflowVersionStatus.APPROVED) {
      throw new WorkflowSuspendedException('Inactive workflow version cannot start');
    }

    const firstSteps = workflowVersion.steps.filter(
      (step) => !workflowVersion.transitions.some((transition) => transition.toStepId === step.id),
    );

    const instance = await this.prisma.caseWorkflowInstance.create({
      data: {
        caseId,
        workflowVersionId,
        status: CaseWorkflowInstanceStatus.ACTIVE,
        startedAt: new Date(),
        currentStepKeys: firstSteps.map((step) => step.stepKey),
        stepInstances: {
          create: workflowVersion.steps.map((step) => ({
            workflowStepDefinitionId: step.id,
            status: firstSteps.some((first) => first.id === step.id)
              ? CaseWorkflowStepInstanceStatus.ACTIVE
              : CaseWorkflowStepInstanceStatus.PENDING,
            parallelGroupKey: step.parallelGroupKey,
            startedAt: firstSteps.some((first) => first.id === step.id) ? new Date() : undefined,
          })),
        },
      },
      include: { stepInstances: true },
    });

    await this.caseEvents.record(caseId, CaseEventType.WORKFLOW_STARTED, {
      workflowVersionId,
      currentStepKeys: instance.currentStepKeys,
    });

    return instance;
  }

  async completeStep(input: CompleteStepInput) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: input.caseId },
      include: {
        workflowInstance: {
          include: {
            workflowVersion: {
              include: {
                steps: true,
                transitions: true,
              },
            },
            stepInstances: {
              include: { workflowStepDefinition: true },
            },
          },
        },
      },
    });

    if (!caseRecord?.workflowInstance) {
      throw new NotFoundException('Case workflow instance not found');
    }

    const instance = caseRecord.workflowInstance;

    if (instance.status === CaseWorkflowInstanceStatus.SAFE_HALTED) {
      throw new SafeHaltedWorkflowException();
    }

    if (instance.status === CaseWorkflowInstanceStatus.SUSPENDED) {
      throw new WorkflowSuspendedException();
    }

    const stepDef = instance.workflowVersion.steps.find((step) => step.stepKey === input.stepKey);
    if (!stepDef) {
      throw new InvalidWorkflowTransitionException('Unknown workflow step');
    }

    const stepInstance = instance.stepInstances.find(
      (item) => item.workflowStepDefinitionId === stepDef.id,
    );

    if (!stepInstance) {
      throw new NotFoundException('Workflow step instance not found');
    }

    if (stepInstance.status === CaseWorkflowStepInstanceStatus.COMPLETED) {
      throw new WorkflowStepAlreadyCompletedException();
    }

    if (!instance.currentStepKeys.includes(input.stepKey)) {
      throw new InvalidWorkflowTransitionException('Step is not currently active');
    }

    await this.enforceStepGates(stepDef, input);

    await this.prisma.caseWorkflowStepInstance.update({
      where: { id: stepInstance.id },
      data: {
        status: CaseWorkflowStepInstanceStatus.COMPLETED,
        completedAt: new Date(),
        completedByIdentityId: input.actorIdentityId,
        outcome: input.outcome ?? 'COMPLETED',
      },
    });

    await this.caseEvents.record(
      input.caseId,
      CaseEventType.STEP_COMPLETED,
      {
        stepKey: input.stepKey,
      },
      input.actorIdentityId,
    );

    const refreshedInstance = await this.prisma.caseWorkflowInstance.findUnique({
      where: { id: instance.id },
      include: {
        workflowVersion: {
          include: {
            steps: true,
            transitions: true,
          },
        },
        stepInstances: {
          include: { workflowStepDefinition: true },
        },
      },
    });

    if (!refreshedInstance) {
      throw new NotFoundException('Case workflow instance not found after step completion');
    }

    await this.advanceWorkflow(
      {
        id: caseRecord.id,
        status: caseRecord.caseStatus,
        workflowInstance: refreshedInstance,
      },
      stepDef.id,
    );

    return this.prisma.caseWorkflowInstance.findUnique({
      where: { id: instance.id },
      include: { stepInstances: { include: { workflowStepDefinition: true } } },
    });
  }

  private async enforceStepGates(
    stepDef: {
      stepType: WorkflowStepType;
      consequenceLevel: WorkflowStepConsequenceLevel;
      functionAuthorityRecordId: string | null;
      authorityActionType: AuthorityActionType | null;
    },
    input: CompleteStepInput,
  ) {
    if (stepDef.stepType === WorkflowStepType.DECISION_GATE) {
      throw new WorkflowGateBlockedException(
        'Decision gate cannot make final government decision in Phase 6',
      );
    }

    if (stepDef.stepType === WorkflowStepType.ISSUANCE_GATE) {
      throw new WorkflowGateBlockedException(
        'Issuance gate cannot issue license/permit/certificate in Phase 6',
      );
    }

    if (
      stepDef.consequenceLevel === WorkflowStepConsequenceLevel.CONSEQUENTIAL &&
      stepDef.functionAuthorityRecordId &&
      stepDef.authorityActionType
    ) {
      const evaluation = await this.authorityEvaluation.evaluate({
        identityId: input.actorIdentityId,
        functionAuthorityRecordId: stepDef.functionAuthorityRecordId,
        action: stepDef.authorityActionType,
        officeholderId: input.officeholderId,
        officeId: input.officeId,
        appointmentId: input.appointmentId,
        delegationId: input.delegationId,
      });

      if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
        throw new ConsequentialAuthorityRequiredException(
          `Authority evaluation outcome: ${evaluation.outcome}`,
        );
      }
    }
  }

  private async advanceWorkflow(
    caseRecord: {
      id: string;
      status: CaseStatus;
      workflowInstance: {
        id: string;
        currentStepKeys: string[];
        workflowVersion: {
          steps: {
            id: string;
            stepKey: string;
            stepType: WorkflowStepType;
            parallelGroupKey: string | null;
          }[];
          transitions: {
            fromStepId: string;
            toStepId: string;
            joinType: WorkflowTransitionJoinType;
          }[];
        };
        stepInstances: {
          id: string;
          workflowStepDefinitionId: string;
          status: CaseWorkflowStepInstanceStatus;
          workflowStepDefinition: { stepKey: string; parallelGroupKey: string | null };
        }[];
      };
    },
    completedStepId: string,
  ) {
    const { workflowInstance } = caseRecord;
    const { workflowVersion } = workflowInstance;

    const outgoing = workflowVersion.transitions.filter((t) => t.fromStepId === completedStepId);

    if (outgoing.length === 0) {
      await this.prisma.caseWorkflowInstance.update({
        where: { id: workflowInstance.id },
        data: {
          status: CaseWorkflowInstanceStatus.COMPLETED,
          completedAt: new Date(),
          currentStepKeys: [],
        },
      });
      return;
    }

    const nextStepIds: string[] = [];

    for (const transition of outgoing) {
      const fromStep = workflowVersion.steps.find((s) => s.id === transition.fromStepId);
      const parallelGroupKey = fromStep?.parallelGroupKey;

      if (parallelGroupKey && transition.joinType === WorkflowTransitionJoinType.ALL_REQUIRED) {
        const groupSteps = workflowVersion.steps.filter(
          (s) => s.parallelGroupKey === parallelGroupKey,
        );
        const allComplete = groupSteps.every((groupStep) => {
          const instance = workflowInstance.stepInstances.find(
            (si) => si.workflowStepDefinitionId === groupStep.id,
          );
          return instance?.status === CaseWorkflowStepInstanceStatus.COMPLETED;
        });

        if (!allComplete) {
          continue;
        }
      }

      nextStepIds.push(transition.toStepId);
    }

    if (nextStepIds.length === 0) {
      const completedStep = workflowVersion.steps.find((step) => step.id === completedStepId);
      if (completedStep) {
        const remainingKeys = workflowInstance.currentStepKeys.filter(
          (key) => key !== completedStep.stepKey,
        );
        if (remainingKeys.length !== workflowInstance.currentStepKeys.length) {
          await this.prisma.caseWorkflowInstance.update({
            where: { id: workflowInstance.id },
            data: { currentStepKeys: remainingKeys },
          });
        }
      }
      return;
    }

    const nextStepKeys = workflowVersion.steps
      .filter((step) => nextStepIds.includes(step.id))
      .map((step) => step.stepKey);

    for (const nextStepId of nextStepIds) {
      const stepInstance = workflowInstance.stepInstances.find(
        (si) => si.workflowStepDefinitionId === nextStepId,
      );
      if (stepInstance) {
        await this.prisma.caseWorkflowStepInstance.update({
          where: { id: stepInstance.id },
          data: {
            status: CaseWorkflowStepInstanceStatus.ACTIVE,
            startedAt: new Date(),
          },
        });
      }
    }

    await this.prisma.caseWorkflowInstance.update({
      where: { id: workflowInstance.id },
      data: { currentStepKeys: nextStepKeys },
    });

    const nextStepTypes = workflowVersion.steps
      .filter((step) => nextStepIds.includes(step.id))
      .map((step) => step.stepType);

    if (nextStepTypes.includes(WorkflowStepType.COMPLETENESS_REVIEW)) {
      await this.caseStatus.transition(caseRecord.id, CaseStatus.COMPLETENESS_REVIEW);
    } else if (nextStepTypes.includes(WorkflowStepType.SUBSTANTIVE_REVIEW)) {
      await this.caseStatus.transition(caseRecord.id, CaseStatus.SUBSTANTIVE_REVIEW);
    } else if (nextStepTypes.includes(WorkflowStepType.EXTERNAL_REFERRAL)) {
      await this.caseStatus.transition(caseRecord.id, CaseStatus.PENDING_EXTERNAL);
    } else if (nextStepTypes.includes(WorkflowStepType.DECISION_GATE)) {
      await this.caseStatus.transition(caseRecord.id, CaseStatus.DECISION_PENDING);
    }
  }

  async safeHalt(caseId: string, reason: string, actorIdentityId?: string) {
    const instance = await this.prisma.caseWorkflowInstance.findUnique({ where: { caseId } });
    if (!instance) {
      return null;
    }

    await this.prisma.caseWorkflowInstance.update({
      where: { id: instance.id },
      data: {
        status: CaseWorkflowInstanceStatus.SAFE_HALTED,
        haltedAt: new Date(),
        haltReason: reason,
      },
    });

    await this.caseStatus.transition(caseId, CaseStatus.SAFE_HALTED, reason, actorIdentityId);
    await this.caseEvents.record(caseId, CaseEventType.SAFE_HALT, { reason }, actorIdentityId);

    return instance;
  }
}
