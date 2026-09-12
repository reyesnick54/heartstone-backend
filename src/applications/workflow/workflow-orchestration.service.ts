import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  CaseStatus,
  CaseWorkflowInstanceStatus,
  CaseWorkflowStepInstanceStatus,
  CaseWorkflowTransitionEventType,
  IdentityType,
  Prisma,
  WorkflowStepType,
  WorkflowVersionStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import {
  assertNotTerminal,
  assertStatusTransition,
} from '../../identity/common/lifecycle-transition.util';
import {
  TERMINAL_CASE_WORKFLOW_INSTANCE_STATUSES,
  TERMINAL_CASE_WORKFLOW_STEP_INSTANCE_STATUSES,
} from '../applications-schema.constants';
import {
  WORKFLOW_ORCHESTRATION_ERRORS,
  WORKFLOW_SAFE_HALT_REASONS,
} from './workflow-orchestration.constants';
import {
  type CloseWorkflowRequest,
  type CompleteStepRequest,
  type CompleteStepResult,
  type EscalateWorkflowRequest,
  type PauseWorkflowRequest,
  type RecognizeDecisionResultRequest,
  type ResumeWorkflowRequest,
  type ReturnForCorrectionRequest,
  type SafeHaltRequest,
  type StartStepRequest,
  type StartWorkflowRequest,
  type StartWorkflowResult,
} from './workflow-orchestration.types';
import { WorkflowTransitionEvaluatorService } from './workflow-transition-evaluator.service';

type WorkflowInstanceWithRelations = Prisma.CaseWorkflowInstanceGetPayload<{
  include: {
    caseRecord: true;
    workflowVersion: {
      include: {
        workflowDefinition: true;
        steps: true;
        transitions: true;
      };
    };
    stepInstances: {
      include: { workflowStep: true };
    };
  };
}>;

@Injectable()
export class WorkflowOrchestrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly transitionEvaluator: WorkflowTransitionEvaluatorService,
  ) {}

  async startWorkflow(request: StartWorkflowRequest): Promise<StartWorkflowResult> {
    const at = request.at ?? new Date();

    const caseRecord = await this.prisma.caseRecord.findUnique({
      where: { id: request.caseId },
    });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${request.caseId}" was not found`);
    }

    const workflowVersion = await this.prisma.workflowVersion.findUnique({
      where: { id: request.workflowVersionId },
      include: {
        workflowDefinition: true,
        steps: { orderBy: { sequenceOrder: 'asc' } },
      },
    });
    if (!workflowVersion) {
      throw new NotFoundException(`WorkflowVersion "${request.workflowVersionId}" was not found`);
    }

    if (workflowVersion.status !== WorkflowVersionStatus.ACTIVE) {
      throw new BadRequestException(WORKFLOW_ORCHESTRATION_ERRORS.INACTIVE_WORKFLOW);
    }

    if (
      workflowVersion.workflowDefinition.governmentServiceVersionId !==
      caseRecord.governmentServiceVersionId
    ) {
      throw new BadRequestException(WORKFLOW_ORCHESTRATION_ERRORS.SERVICE_MISMATCH);
    }

    const existing = await this.prisma.caseWorkflowInstance.findFirst({
      where: {
        caseId: request.caseId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });
    if (existing) {
      throw new ConflictException(WORKFLOW_ORCHESTRATION_ERRORS.ALREADY_STARTED);
    }

    const instance = await this.prisma.$transaction(async (tx) => {
      const created = await tx.caseWorkflowInstance.create({
        data: {
          caseId: request.caseId,
          workflowVersionId: request.workflowVersionId,
          status: CaseWorkflowInstanceStatus.ACTIVE,
          startedAt: at,
          currentStageKey: workflowVersion.steps[0]?.stageKey ?? null,
          currentStageLabel: workflowVersion.steps[0]?.label ?? null,
        },
      });

      for (const step of workflowVersion.steps) {
        const isParallelBranch = step.parallelGroupKey !== null && step.stepType !== WorkflowStepType.PARALLEL_FORK && step.stepType !== WorkflowStepType.PARALLEL_JOIN;
        await tx.caseWorkflowStepInstance.create({
          data: {
            caseWorkflowInstanceId: created.id,
            workflowStepId: step.id,
            stepKey: step.stepKey,
            parallelBranchKey: isParallelBranch ? step.parallelGroupKey : null,
            status: CaseWorkflowStepInstanceStatus.PENDING,
          },
        });
      }

      await tx.caseWorkflowTransitionEvent.create({
        data: {
          caseWorkflowInstanceId: created.id,
          eventType: CaseWorkflowTransitionEventType.WORKFLOW_STARTED,
          toStatus: CaseWorkflowInstanceStatus.ACTIVE,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
          occurredAt: at,
        },
      });

      await tx.caseRecord.update({
        where: { id: request.caseId },
        data: { status: CaseStatus.IN_PROGRESS },
      });

      return created;
    });

    const readyStepKeys = await this.determineReadySteps(instance.id);

    return {
      instanceId: instance.id,
      status: CaseWorkflowInstanceStatus.ACTIVE,
      readyStepKeys,
    };
  }

  async determineReadySteps(instanceId: string): Promise<string[]> {
    const instance = await this.loadInstance(instanceId);
    this.assertNotSafeHalted(instance);

    const readyKeys: string[] = [];

    for (const stepInstance of instance.stepInstances) {
      if (stepInstance.status !== CaseWorkflowStepInstanceStatus.PENDING) {
        continue;
      }

      const step = stepInstance.workflowStep;
      const dependsOn = this.parseStringArray(step.dependsOnStepKeys);

      if (dependsOn.length > 0) {
        const depsMet = dependsOn.every((depKey) =>
          instance.stepInstances.some(
            (si) =>
              si.stepKey === depKey &&
              TERMINAL_CASE_WORKFLOW_STEP_INSTANCE_STATUSES.includes(
                si.status as (typeof TERMINAL_CASE_WORKFLOW_STEP_INSTANCE_STATUSES)[number],
              ),
          ),
        );
        if (!depsMet) {
          continue;
        }
      }

      if (step.stepType === WorkflowStepType.PARALLEL_JOIN) {
        const requiredBranches = this.parseStringArray(step.requiredJoinBranchKeys);
        const branchesComplete = this.areJoinBranchesComplete(instance, requiredBranches);
        if (!branchesComplete) {
          continue;
        }
      }

      if (step.stepType === WorkflowStepType.PARALLEL_FORK) {
        const forkDeps = dependsOn.length > 0;
        if (!forkDeps && step.sequenceOrder > 0) {
          const priorSteps = instance.workflowVersion.steps.filter(
            (s) => s.sequenceOrder < step.sequenceOrder && s.stepType !== WorkflowStepType.PARALLEL_FORK,
          );
          const priorComplete = priorSteps.every((ps) =>
            instance.stepInstances.some(
              (si) =>
                si.stepKey === ps.stepKey &&
                si.status === CaseWorkflowStepInstanceStatus.COMPLETED,
            ),
          );
          if (!priorComplete) {
            continue;
          }
        }
      }

      await this.prisma.caseWorkflowStepInstance.update({
        where: { id: stepInstance.id },
        data: { status: CaseWorkflowStepInstanceStatus.READY },
      });
      readyKeys.push(stepInstance.stepKey);
    }

    return readyKeys;
  }

  async startAuthorizedStep(request: StartStepRequest): Promise<void> {
    const at = request.at ?? new Date();
    const instance = await this.loadInstance(request.instanceId);
    this.assertNotSafeHalted(instance);

    const stepInstance = this.findStepInstance(
      instance,
      request.stepKey,
      request.parallelBranchKey,
    );

    if (stepInstance.status !== CaseWorkflowStepInstanceStatus.READY) {
      throw new BadRequestException(WORKFLOW_ORCHESTRATION_ERRORS.STEP_NOT_READY);
    }

    const step = stepInstance.workflowStep;

    if (step.isHumanRequired && request.actor.identityType === IdentityType.SERVICE) {
      throw new ForbiddenException(WORKFLOW_ORCHESTRATION_ERRORS.SERVICE_IDENTITY_HUMAN_STEP);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.caseWorkflowStepInstance.update({
        where: { id: stepInstance.id },
        data: {
          status: CaseWorkflowStepInstanceStatus.IN_PROGRESS,
          startedAt: at,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
        },
      });

      await tx.caseWorkflowTransitionEvent.create({
        data: {
          caseWorkflowInstanceId: instance.id,
          caseWorkflowStepInstanceId: stepInstance.id,
          eventType: CaseWorkflowTransitionEventType.STEP_STARTED,
          fromStepKey: stepInstance.stepKey,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
          occurredAt: at,
        },
      });
    });
  }

  async completeAdministrativeStep(request: CompleteStepRequest): Promise<CompleteStepResult> {
    const at = request.at ?? new Date();
    const instance = await this.loadInstance(request.instanceId);
    this.assertNotSafeHalted(instance);

    const stepInstance = this.findStepInstance(
      instance,
      request.stepKey,
      request.parallelBranchKey,
    );

    if (stepInstance.completionIdempotencyKey === request.idempotencyKey) {
      const readyStepKeys = await this.getReadyStepKeys(instance.id);
      return {
        stepInstanceId: stepInstance.id,
        status: stepInstance.status,
        authorityEvaluationRecordId: stepInstance.authorityEvaluationRecordId ?? undefined,
        nextReadyStepKeys: readyStepKeys,
        caseStatus: instance.caseRecord.status,
        workflowStatus: instance.status,
        alreadyCompleted: true,
      };
    }

    const step = stepInstance.workflowStep;

    if (step.stepType === WorkflowStepType.DECISION_GATE) {
      throw new BadRequestException(WORKFLOW_ORCHESTRATION_ERRORS.DECISION_GATE_NO_CREATE);
    }

    if (step.stepType === WorkflowStepType.ISSUANCE_GATE) {
      throw new BadRequestException(WORKFLOW_ORCHESTRATION_ERRORS.ISSUANCE_GATE_NO_ISSUE);
    }

    if (
      TERMINAL_CASE_WORKFLOW_STEP_INSTANCE_STATUSES.includes(
        stepInstance.status as (typeof TERMINAL_CASE_WORKFLOW_STEP_INSTANCE_STATUSES)[number],
      )
    ) {
      throw new ConflictException(WORKFLOW_ORCHESTRATION_ERRORS.STEP_ALREADY_COMPLETED);
    }

    if (stepInstance.status !== CaseWorkflowStepInstanceStatus.IN_PROGRESS) {
      throw new BadRequestException(WORKFLOW_ORCHESTRATION_ERRORS.STEP_NOT_IN_PROGRESS);
    }

    if (step.isHumanRequired && request.actor.identityType === IdentityType.SERVICE) {
      throw new ForbiddenException(WORKFLOW_ORCHESTRATION_ERRORS.SERVICE_IDENTITY_HUMAN_STEP);
    }

    let evaluationRecordId: string | undefined;
    if (step.isConsequential && step.functionAuthorityRecordId) {
      const evaluation = await this.evaluateStepAuthority(request.actor, step, at);
      evaluationRecordId = evaluation.evaluationId;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.caseWorkflowStepInstance.updateMany({
        where: {
          id: stepInstance.id,
          concurrencyVersion: stepInstance.concurrencyVersion,
          status: CaseWorkflowStepInstanceStatus.IN_PROGRESS,
        },
        data: {
          status: CaseWorkflowStepInstanceStatus.COMPLETED,
          completedAt: at,
          completionIdempotencyKey: request.idempotencyKey,
          authorityEvaluationRecordId: evaluationRecordId,
          concurrencyVersion: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ConflictException(WORKFLOW_ORCHESTRATION_ERRORS.CONCURRENCY_CONFLICT);
      }

      await tx.caseWorkflowTransitionEvent.create({
        data: {
          caseWorkflowInstanceId: instance.id,
          caseWorkflowStepInstanceId: stepInstance.id,
          eventType: CaseWorkflowTransitionEventType.STEP_COMPLETED,
          fromStepKey: stepInstance.stepKey,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
          authorityEvaluationRecordId: evaluationRecordId,
          reason: request.reason,
          notes: request.notes,
          idempotencyKey: request.idempotencyKey,
          occurredAt: at,
        },
      });

      return { evaluationRecordId };
    });

    if (step.stepType === WorkflowStepType.PARALLEL_FORK) {
      await this.forkParallelWork(instance.id, step.stepKey);
    }

    const nextStepKeys = await this.evaluateDeterministicTransitions(
      instance.id,
      stepInstance.stepKey,
    );

    let caseStatus = instance.caseRecord.status;
    let workflowStatus = instance.status;

    const refreshed = await this.loadInstance(instance.id);
    const completedStep = refreshed.stepInstances.find((si) => si.id === stepInstance.id);
    if (completedStep?.workflowStep.stepType === WorkflowStepType.DECISION_GATE) {
      caseStatus = CaseStatus.DECISION_PENDING;
      workflowStatus = CaseWorkflowInstanceStatus.ACTIVE;
    }

    const readyStepKeys = await this.determineReadySteps(instance.id);

    return {
      stepInstanceId: stepInstance.id,
      status: CaseWorkflowStepInstanceStatus.COMPLETED,
      authorityEvaluationRecordId: result.evaluationRecordId,
      nextReadyStepKeys: readyStepKeys.length > 0 ? readyStepKeys : nextStepKeys,
      caseStatus,
      workflowStatus,
      alreadyCompleted: false,
    };
  }

  async evaluateDeterministicTransitions(
    instanceId: string,
    completedStepKey: string,
    options?: { isCorrectionReturn?: boolean; isEscalation?: boolean },
  ): Promise<string[]> {
    const instance = await this.loadInstance(instanceId);
    const transitions = instance.workflowVersion.transitions.filter(
      (t) => t.fromStepKey === completedStepKey,
    );

    const completedStep = instance.stepInstances.find((si) => si.stepKey === completedStepKey);
    const joinBranchesComplete =
      completedStep?.workflowStep.stepType === WorkflowStepType.PARALLEL_JOIN;

    const targetStepKeys = this.transitionEvaluator.evaluateTransitions(transitions, {
      completedStepKey,
      joinBranchesComplete,
      isCorrectionReturn: options?.isCorrectionReturn ?? false,
      isEscalation: options?.isEscalation ?? false,
      runtimeFacts: {},
    });

    const activatedKeys: string[] = [];

    for (const toStepKey of targetStepKeys) {
      const targetStep = instance.workflowVersion.steps.find((s) => s.stepKey === toStepKey);
      if (!targetStep) {
        await this.safeHalt({
          instanceId,
          reason: WORKFLOW_SAFE_HALT_REASONS.RUNTIME_GRAPH_INCONSISTENT,
        });
        return [];
      }

      if (targetStep.stepType === WorkflowStepType.DECISION_GATE) {
        await this.handleDecisionGate(instance.id, toStepKey);
        activatedKeys.push(toStepKey);
        continue;
      }

      if (targetStep.stepType === WorkflowStepType.ISSUANCE_GATE) {
        await this.handleIssuanceGate(instance.id, toStepKey);
        activatedKeys.push(toStepKey);
        continue;
      }

      const targetInstance = instance.stepInstances.find((si) => si.stepKey === toStepKey);
      if (targetInstance) {
        await this.prisma.caseWorkflowInstance.update({
          where: { id: instanceId },
          data: {
            currentStageKey: targetStep.stageKey,
            currentStageLabel: targetStep.label,
          },
        });
      }

      activatedKeys.push(toStepKey);
    }

    if (transitions.length > 0 && targetStepKeys.length === 0) {
      await this.recordTransitionEvent(instanceId, {
        eventType: CaseWorkflowTransitionEventType.TRANSITION_EVALUATED,
        fromStepKey: completedStepKey,
        metadata: { matchedTargets: [] },
      });
    }

    return activatedKeys;
  }

  async forkParallelWork(instanceId: string, forkStepKey: string): Promise<void> {
    const instance = await this.loadInstance(instanceId);
    const forkStep = instance.workflowVersion.steps.find((s) => s.stepKey === forkStepKey);
    if (!forkStep) {
      return;
    }

    const branchSteps = instance.workflowVersion.steps.filter(
      (s) =>
        s.parallelGroupKey !== null &&
        s.stepType === WorkflowStepType.ADMINISTRATIVE &&
        s.stepKey !== forkStepKey,
    );

    for (const branchStep of branchSteps) {
      const branchInstance = instance.stepInstances.find(
        (si) =>
          si.stepKey === branchStep.stepKey &&
          (si.parallelBranchKey === branchStep.parallelGroupKey ||
            si.parallelBranchKey === null),
      );
      if (branchInstance?.status === CaseWorkflowStepInstanceStatus.PENDING) {
        await this.prisma.caseWorkflowStepInstance.update({
          where: { id: branchInstance.id },
          data: { status: CaseWorkflowStepInstanceStatus.READY },
        });
      }
    }

    await this.recordTransitionEvent(instanceId, {
      eventType: CaseWorkflowTransitionEventType.PARALLEL_FORK,
      fromStepKey: forkStepKey,
      metadata: { branchStepKeys: branchSteps.map((s) => s.stepKey) },
    });
  }

  async joinRequiredBranches(instanceId: string, joinStepKey: string): Promise<boolean> {
    const instance = await this.loadInstance(instanceId);
    const joinStep = instance.workflowVersion.steps.find((s) => s.stepKey === joinStepKey);
    if (joinStep?.stepType !== WorkflowStepType.PARALLEL_JOIN) {
      return false;
    }

    const requiredBranches = this.parseStringArray(joinStep.requiredJoinBranchKeys);
    const complete = this.areJoinBranchesComplete(instance, requiredBranches);

    if (complete) {
      await this.recordTransitionEvent(instanceId, {
        eventType: CaseWorkflowTransitionEventType.PARALLEL_JOIN,
        toStepKey: joinStepKey,
        metadata: { requiredBranches },
      });
    }

    return complete;
  }

  async pauseWorkflow(request: PauseWorkflowRequest): Promise<void> {
    const at = request.at ?? new Date();
    const instance = await this.loadInstance(request.instanceId);
    this.assertNotSafeHalted(instance);

    assertStatusTransition(
      instance.status,
      [CaseWorkflowInstanceStatus.ACTIVE, CaseWorkflowInstanceStatus.WAITING_APPLICANT],
      CaseWorkflowInstanceStatus.PAUSED,
      'CaseWorkflowInstance',
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.caseWorkflowInstance.update({
        where: { id: instance.id },
        data: {
          status: CaseWorkflowInstanceStatus.PAUSED,
          pausedAt: at,
        },
      });

      await tx.caseWorkflowTransitionEvent.create({
        data: {
          caseWorkflowInstanceId: instance.id,
          eventType: CaseWorkflowTransitionEventType.PAUSE,
          fromStatus: instance.status,
          toStatus: CaseWorkflowInstanceStatus.PAUSED,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
          reason: request.reason,
          occurredAt: at,
        },
      });
    });
  }

  async resumeWorkflow(request: ResumeWorkflowRequest): Promise<void> {
    const at = request.at ?? new Date();
    const instance = await this.loadInstance(request.instanceId);

    if (instance.status === CaseWorkflowInstanceStatus.SAFE_HALTED) {
      throw new BadRequestException(WORKFLOW_ORCHESTRATION_ERRORS.SAFE_HALTED);
    }

    assertStatusTransition(
      instance.status,
      [CaseWorkflowInstanceStatus.PAUSED],
      CaseWorkflowInstanceStatus.ACTIVE,
      'CaseWorkflowInstance',
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.caseWorkflowInstance.update({
        where: { id: instance.id },
        data: {
          status: CaseWorkflowInstanceStatus.ACTIVE,
          pausedAt: null,
        },
      });

      await tx.caseWorkflowTransitionEvent.create({
        data: {
          caseWorkflowInstanceId: instance.id,
          eventType: CaseWorkflowTransitionEventType.RESUME,
          fromStatus: CaseWorkflowInstanceStatus.PAUSED,
          toStatus: CaseWorkflowInstanceStatus.ACTIVE,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
          occurredAt: at,
        },
      });
    });

    await this.determineReadySteps(instance.id);
  }

  async returnForCorrection(request: ReturnForCorrectionRequest): Promise<void> {
    const at = request.at ?? new Date();
    const instance = await this.loadInstance(request.instanceId);
    this.assertNotSafeHalted(instance);

    const allowedTransition = instance.workflowVersion.transitions.some(
      (t) =>
        t.fromStepKey === request.fromStepKey &&
        t.toStepKey === request.toStepKey &&
        t.conditionType === 'CORRECTION_RETURN',
    );

    if (!allowedTransition) {
      throw new BadRequestException(WORKFLOW_ORCHESTRATION_ERRORS.ARBITRARY_TRANSITION);
    }

    const targetStepInstance = instance.stepInstances.find(
      (si) => si.stepKey === request.toStepKey,
    );
    if (!targetStepInstance) {
      throw new NotFoundException(`Target step "${request.toStepKey}" not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.caseWorkflowStepInstance.update({
        where: { id: targetStepInstance.id },
        data: {
          status: CaseWorkflowStepInstanceStatus.READY,
          startedAt: null,
          completedAt: null,
          completionIdempotencyKey: null,
        },
      });

      await tx.caseWorkflowTransitionEvent.create({
        data: {
          caseWorkflowInstanceId: instance.id,
          eventType: CaseWorkflowTransitionEventType.RETURN_FOR_CORRECTION,
          fromStepKey: request.fromStepKey,
          toStepKey: request.toStepKey,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
          reason: request.reason,
          occurredAt: at,
        },
      });
    });
  }

  async escalateWorkflow(request: EscalateWorkflowRequest): Promise<void> {
    const at = request.at ?? new Date();
    const instance = await this.loadInstance(request.instanceId);
    this.assertNotSafeHalted(instance);

    const allowedTransition = instance.workflowVersion.transitions.some(
      (t) =>
        t.fromStepKey === request.fromStepKey &&
        t.toStepKey === request.toStepKey &&
        t.conditionType === 'ESCALATION',
    );

    if (!allowedTransition) {
      throw new BadRequestException(WORKFLOW_ORCHESTRATION_ERRORS.ARBITRARY_TRANSITION);
    }

    await this.evaluateDeterministicTransitions(instance.id, request.fromStepKey, {
      isEscalation: true,
    });

    await this.recordTransitionEvent(instance.id, {
      eventType: CaseWorkflowTransitionEventType.ESCALATION,
      fromStepKey: request.fromStepKey,
      toStepKey: request.toStepKey,
      actorIdentityId: request.actor.identityId,
      officeholderId: request.actor.officeholderId,
      reason: request.reason,
      occurredAt: at,
    });

    await this.determineReadySteps(instance.id);
  }

  async recognizeDecisionResult(request: RecognizeDecisionResultRequest): Promise<void> {
    const at = request.at ?? new Date();
    const instance = await this.loadInstance(request.instanceId);

    const issuanceStep = instance.stepInstances.find(
      (si) => si.workflowStep.stepType === WorkflowStepType.ISSUANCE_GATE,
    );

    if (!issuanceStep) {
      throw new NotFoundException('No issuance gate step found in workflow instance');
    }

    if (issuanceStep.status !== CaseWorkflowStepInstanceStatus.WAITING) {
      throw new BadRequestException('Issuance gate is not awaiting decision result');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.caseWorkflowStepInstance.update({
        where: { id: issuanceStep.id },
        data: {
          status: CaseWorkflowStepInstanceStatus.READY,
        },
      });

      await tx.caseRecord.update({
        where: { id: instance.caseId },
        data: { status: CaseStatus.AWAITING_ISSUANCE },
      });

      await tx.caseWorkflowTransitionEvent.create({
        data: {
          caseWorkflowInstanceId: instance.id,
          caseWorkflowStepInstanceId: issuanceStep.id,
          eventType: CaseWorkflowTransitionEventType.TRANSITION_EVALUATED,
          toStepKey: issuanceStep.stepKey,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
          notes: `Decision reference recognized: ${request.decisionReference}`,
          metadata: { decisionReference: request.decisionReference, recognizedOnly: true },
          occurredAt: at,
        },
      });
    });
  }

  async safeHalt(request: SafeHaltRequest): Promise<void> {
    const at = request.at ?? new Date();
    const instance = await this.loadInstance(request.instanceId);

    await this.prisma.$transaction(async (tx) => {
      await tx.caseWorkflowInstance.update({
        where: { id: instance.id },
        data: {
          status: CaseWorkflowInstanceStatus.SAFE_HALTED,
          safeHaltReason: request.reason,
        },
      });

      await tx.caseWorkflowTransitionEvent.create({
        data: {
          caseWorkflowInstanceId: instance.id,
          eventType: CaseWorkflowTransitionEventType.SAFE_HALT,
          fromStatus: instance.status,
          toStatus: CaseWorkflowInstanceStatus.SAFE_HALTED,
          actorIdentityId: request.actor?.identityId,
          officeholderId: request.actor?.officeholderId,
          reason: request.reason,
          occurredAt: at,
        },
      });
    });
  }

  async closeWorkflowWhenPermitted(request: CloseWorkflowRequest): Promise<void> {
    const at = request.at ?? new Date();
    const instance = await this.loadInstance(request.instanceId);
    this.assertNotSafeHalted(instance);

    const allTerminal = instance.stepInstances.every((si) => {
      const step = si.workflowStep;
      if (step.stepType === WorkflowStepType.DECISION_GATE) {
        return (
          si.status === CaseWorkflowStepInstanceStatus.WAITING ||
          si.status === CaseWorkflowStepInstanceStatus.COMPLETED
        );
      }
      if (step.stepType === WorkflowStepType.ISSUANCE_GATE) {
        return (
          si.status === CaseWorkflowStepInstanceStatus.WAITING ||
          si.status === CaseWorkflowStepInstanceStatus.COMPLETED
        );
      }
      return TERMINAL_CASE_WORKFLOW_STEP_INSTANCE_STATUSES.includes(
        si.status as (typeof TERMINAL_CASE_WORKFLOW_STEP_INSTANCE_STATUSES)[number],
      );
    });

    const pendingAdmin = instance.stepInstances.some(
      (si) =>
        si.workflowStep.stepType === WorkflowStepType.ADMINISTRATIVE &&
        !TERMINAL_CASE_WORKFLOW_STEP_INSTANCE_STATUSES.includes(
          si.status as (typeof TERMINAL_CASE_WORKFLOW_STEP_INSTANCE_STATUSES)[number],
        ),
    );

    if (!allTerminal || pendingAdmin) {
      throw new BadRequestException('Workflow cannot be closed: pending steps remain');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.caseWorkflowInstance.update({
        where: { id: instance.id },
        data: {
          status: CaseWorkflowInstanceStatus.COMPLETED,
          completedAt: at,
        },
      });

      await tx.caseRecord.update({
        where: { id: instance.caseId },
        data: { status: CaseStatus.CLOSED },
      });

      await tx.caseWorkflowTransitionEvent.create({
        data: {
          caseWorkflowInstanceId: instance.id,
          eventType: CaseWorkflowTransitionEventType.WORKFLOW_COMPLETED,
          fromStatus: instance.status,
          toStatus: CaseWorkflowInstanceStatus.COMPLETED,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
          reason: request.reason,
          occurredAt: at,
        },
      });
    });
  }

  async reachDecisionGate(instanceId: string, stepKey: string): Promise<void> {
    await this.handleDecisionGate(instanceId, stepKey);
  }

  private async handleDecisionGate(instanceId: string, stepKey: string): Promise<void> {
    const instance = await this.loadInstance(instanceId);
    const stepInstance = instance.stepInstances.find((si) => si.stepKey === stepKey);
    if (!stepInstance) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.caseWorkflowStepInstance.update({
        where: { id: stepInstance.id },
        data: { status: CaseWorkflowStepInstanceStatus.WAITING },
      });

      await tx.caseRecord.update({
        where: { id: instance.caseId },
        data: { status: CaseStatus.DECISION_PENDING },
      });

      await tx.caseWorkflowInstance.update({
        where: { id: instanceId },
        data: {
          currentStageKey: stepInstance.workflowStep.stageKey,
          currentStageLabel: stepInstance.workflowStep.label,
        },
      });

      await tx.caseWorkflowTransitionEvent.create({
        data: {
          caseWorkflowInstanceId: instanceId,
          caseWorkflowStepInstanceId: stepInstance.id,
          eventType: CaseWorkflowTransitionEventType.TRANSITION_EVALUATED,
          toStepKey: stepKey,
          toStatus: CaseStatus.DECISION_PENDING,
          metadata: { decisionGate: true, decisionCreated: false },
          occurredAt: new Date(),
        },
      });
    });
  }

  private async handleIssuanceGate(instanceId: string, stepKey: string): Promise<void> {
    const instance = await this.loadInstance(instanceId);
    const stepInstance = instance.stepInstances.find((si) => si.stepKey === stepKey);
    if (!stepInstance) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.caseWorkflowStepInstance.update({
        where: { id: stepInstance.id },
        data: { status: CaseWorkflowStepInstanceStatus.WAITING },
      });

      await tx.caseWorkflowInstance.update({
        where: { id: instanceId },
        data: {
          currentStageKey: stepInstance.workflowStep.stageKey,
          currentStageLabel: stepInstance.workflowStep.label,
        },
      });

      await tx.caseWorkflowTransitionEvent.create({
        data: {
          caseWorkflowInstanceId: instanceId,
          caseWorkflowStepInstanceId: stepInstance.id,
          eventType: CaseWorkflowTransitionEventType.TRANSITION_EVALUATED,
          toStepKey: stepKey,
          metadata: { issuanceGate: true, instrumentIssued: false },
          occurredAt: new Date(),
        },
      });
    });
  }

  private async evaluateStepAuthority(
    actor: { identityId: string; officeholderId?: string; officeId?: string; appointmentId?: string; delegationId?: string },
    step: {
      functionAuthorityRecordId: string | null;
      authorityAction: AuthorityActionType | null;
      isConsequential: boolean;
    },
    at: Date,
  ) {
    if (!step.functionAuthorityRecordId) {
      throw new ForbiddenException(WORKFLOW_ORCHESTRATION_ERRORS.AUTHORITY_DENIED);
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: actor.identityId,
      functionAuthorityRecordId: step.functionAuthorityRecordId,
      action: step.authorityAction ?? AuthorityActionType.REVIEW,
      officeholderId: actor.officeholderId,
      officeId: actor.officeId,
      appointmentId: actor.appointmentId,
      delegationId: actor.delegationId,
      at,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      if (evaluation.safeHalt) {
        throw new ForbiddenException(WORKFLOW_ORCHESTRATION_ERRORS.AUTHORITY_DENIED);
      }
      throw new ForbiddenException(WORKFLOW_ORCHESTRATION_ERRORS.AUTHORITY_DENIED);
    }

    return evaluation;
  }

  private safeHaltInternal(reason: string): void {
    throw new BadRequestException(reason);
  }

  private async loadInstance(instanceId: string): Promise<WorkflowInstanceWithRelations> {
    const instance = await this.prisma.caseWorkflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        caseRecord: true,
        workflowVersion: {
          include: {
            workflowDefinition: true,
            steps: { orderBy: { sequenceOrder: 'asc' } },
            transitions: true,
          },
        },
        stepInstances: {
          include: { workflowStep: true },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException(`CaseWorkflowInstance "${instanceId}" was not found`);
    }

    return instance;
  }

  private findStepInstance(
    instance: WorkflowInstanceWithRelations,
    stepKey: string,
    parallelBranchKey?: string,
  ) {
    const stepInstance = instance.stepInstances.find(
      (si) =>
        si.stepKey === stepKey &&
        (parallelBranchKey === undefined || si.parallelBranchKey === parallelBranchKey),
    );

    if (!stepInstance) {
      throw new NotFoundException(`Step instance "${stepKey}" not found`);
    }

    return stepInstance;
  }

  private assertNotSafeHalted(instance: WorkflowInstanceWithRelations): void {
    if (instance.status === CaseWorkflowInstanceStatus.SAFE_HALTED) {
      throw new BadRequestException(WORKFLOW_ORCHESTRATION_ERRORS.SAFE_HALTED);
    }

    assertNotTerminal(
      instance.status,
      TERMINAL_CASE_WORKFLOW_INSTANCE_STATUSES,
      'CaseWorkflowInstance',
    );
  }

  private parseStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is string => typeof item === 'string');
  }

  private areJoinBranchesComplete(
    instance: WorkflowInstanceWithRelations,
    requiredBranchKeys: string[],
  ): boolean {
    if (requiredBranchKeys.length === 0) {
      return true;
    }

    return requiredBranchKeys.every((branchKey) => {
      const branchStep = instance.workflowVersion.steps.find(
        (s) => s.parallelGroupKey === branchKey,
      );
      if (!branchStep) {
        return instance.stepInstances.some(
          (si) =>
            si.parallelBranchKey === branchKey &&
            si.status === CaseWorkflowStepInstanceStatus.COMPLETED,
        );
      }
      return instance.stepInstances.some(
        (si) =>
          si.stepKey === branchStep.stepKey &&
          si.status === CaseWorkflowStepInstanceStatus.COMPLETED,
      );
    });
  }

  private async getReadyStepKeys(instanceId: string): Promise<string[]> {
    const steps = await this.prisma.caseWorkflowStepInstance.findMany({
      where: {
        caseWorkflowInstanceId: instanceId,
        status: CaseWorkflowStepInstanceStatus.READY,
      },
    });
    return steps.map((s) => s.stepKey);
  }

  private async recordTransitionEvent(
    instanceId: string,
    data: {
      eventType: CaseWorkflowTransitionEventType;
      fromStepKey?: string;
      toStepKey?: string;
      fromStatus?: string;
      toStatus?: string;
      actorIdentityId?: string;
      officeholderId?: string;
      reason?: string;
      metadata?: Record<string, unknown>;
      occurredAt?: Date;
    },
  ): Promise<void> {
    await this.prisma.caseWorkflowTransitionEvent.create({
      data: {
        caseWorkflowInstanceId: instanceId,
        eventType: data.eventType,
        fromStepKey: data.fromStepKey,
        toStepKey: data.toStepKey,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        actorIdentityId: data.actorIdentityId,
        officeholderId: data.officeholderId,
        reason: data.reason,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
        occurredAt: data.occurredAt ?? new Date(),
      },
    });
  }
}
