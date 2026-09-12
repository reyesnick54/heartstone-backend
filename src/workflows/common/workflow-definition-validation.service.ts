import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AuthorityActionType,
  FunctionAuthorityLifecycleStatus,
  WorkflowStageType,
  WorkflowStepType,
  WorkflowVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DECISION_AUTHORITY_ACTIONS } from '../workflow.constants';
import { assertSafeConditionStructure } from './workflow-condition-validation.util';

export interface WorkflowValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  issues: WorkflowValidationIssue[];
}

interface LoadedWorkflowGraph {
  versionId: string;
  status: WorkflowVersionStatus;
  stages: {
    id: string;
    stageKey: string;
    stageType: WorkflowStageType;
  }[];
  steps: {
    id: string;
    stepKey: string;
    stageId: string;
    stepType: WorkflowStepType;
    isStartingStep: boolean;
    isConsequential: boolean;
    permitsCycle: boolean;
    functionAuthorityRecordId: string | null;
    requiredAuthorityAction: AuthorityActionType | null;
    stageType: WorkflowStageType;
  }[];
  transitions: {
    id: string;
    fromStepId: string;
    toStepId: string;
    conditionConfig: unknown;
  }[];
}

@Injectable()
export class WorkflowDefinitionValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateVersion(workflowVersionId: string): Promise<WorkflowValidationResult> {
    const graph = await this.loadGraph(workflowVersionId);
    const issues: WorkflowValidationIssue[] = [];

    this.validateStartingStep(graph, issues);
    this.validateDuplicateKeys(graph, issues);
    this.validateStageStepAlignment(graph, issues);
    this.validateTransitions(graph, issues);
    this.validateReachability(graph, issues);
    this.validateCycles(graph, issues);
    await this.validateConsequentialAuthority(graph, issues);
    await this.validateDecisionAuthorityHumanOnly(graph, issues);
    this.validateIssuanceGatePlacement(graph, issues);

    return { valid: issues.length === 0, issues };
  }

  async assertVersionValid(workflowVersionId: string): Promise<void> {
    const result = await this.validateVersion(workflowVersionId);
    if (!result.valid) {
      const summary = result.issues.map((issue) => issue.message).join('; ');
      throw new BadRequestException(`Workflow version validation failed: ${summary}`);
    }
  }

  private async loadGraph(workflowVersionId: string): Promise<LoadedWorkflowGraph> {
    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: workflowVersionId },
      include: {
        stages: true,
        steps: { include: { stage: true } },
        transitions: true,
      },
    });

    if (!version) {
      throw new BadRequestException(`Workflow version "${workflowVersionId}" was not found`);
    }

    const stageTypeById = new Map(version.stages.map((stage) => [stage.id, stage.stageType]));

    return {
      versionId: version.id,
      status: version.status,
      stages: version.stages.map((stage) => ({
        id: stage.id,
        stageKey: stage.stageKey,
        stageType: stage.stageType,
      })),
      steps: version.steps.map((step) => ({
        id: step.id,
        stepKey: step.stepKey,
        stageId: step.stageId,
        stepType: step.stepType,
        isStartingStep: step.isStartingStep,
        isConsequential: step.isConsequential,
        permitsCycle: step.permitsCycle,
        functionAuthorityRecordId: step.functionAuthorityRecordId,
        requiredAuthorityAction: step.requiredAuthorityAction,
        stageType: stageTypeById.get(step.stageId) ?? WorkflowStageType.CUSTOM_ADMINISTRATIVE,
      })),
      transitions: version.transitions.map((transition) => ({
        id: transition.id,
        fromStepId: transition.fromStepId,
        toStepId: transition.toStepId,
        conditionConfig: transition.conditionConfig,
      })),
    };
  }

  private validateStartingStep(graph: LoadedWorkflowGraph, issues: WorkflowValidationIssue[]): void {
    const startingSteps = graph.steps.filter((step) => step.isStartingStep);
    if (startingSteps.length === 0) {
      issues.push({
        code: 'MISSING_STARTING_STEP',
        message: 'Workflow version must define exactly one starting step',
      });
      return;
    }

    if (startingSteps.length > 1) {
      issues.push({
        code: 'MULTIPLE_STARTING_STEPS',
        message: `Workflow version defines ${String(startingSteps.length)} starting steps; only one is permitted`,
        path: startingSteps.map((step) => step.stepKey).join(', '),
      });
    }
  }

  private validateDuplicateKeys(graph: LoadedWorkflowGraph, issues: WorkflowValidationIssue[]): void {
    const stageKeys = new Set<string>();
    for (const stage of graph.stages) {
      if (stageKeys.has(stage.stageKey)) {
        issues.push({
          code: 'DUPLICATE_STAGE_KEY',
          message: `Duplicate stage key "${stage.stageKey}"`,
          path: stage.stageKey,
        });
      }
      stageKeys.add(stage.stageKey);
    }

    const stepKeys = new Set<string>();
    for (const step of graph.steps) {
      if (stepKeys.has(step.stepKey)) {
        issues.push({
          code: 'DUPLICATE_STEP_KEY',
          message: `Duplicate step key "${step.stepKey}"`,
          path: step.stepKey,
        });
      }
      stepKeys.add(step.stepKey);
    }
  }

  private validateStageStepAlignment(
    graph: LoadedWorkflowGraph,
    issues: WorkflowValidationIssue[],
  ): void {
    for (const step of graph.steps) {
      if (step.stageType === WorkflowStageType.DECISION_GATE && step.stepType !== WorkflowStepType.DECISION) {
        issues.push({
          code: 'DECISION_GATE_STEP_MISMATCH',
          message: `Step "${step.stepKey}" in DECISION_GATE stage must use DECISION step type`,
          path: step.stepKey,
        });
      }

      if (step.stageType === WorkflowStageType.ISSUANCE_GATE && step.stepType !== WorkflowStepType.ISSUANCE) {
        issues.push({
          code: 'ISSUANCE_GATE_STEP_MISMATCH',
          message: `Step "${step.stepKey}" in ISSUANCE_GATE stage must use ISSUANCE step type`,
          path: step.stepKey,
        });
      }

      if (step.stepType === WorkflowStepType.DECISION && step.stageType === WorkflowStageType.ISSUANCE_GATE) {
        issues.push({
          code: 'DECISION_IN_ISSUANCE_GATE',
          message: `Decision step "${step.stepKey}" cannot be placed in an ISSUANCE_GATE stage`,
          path: step.stepKey,
        });
      }

      if (step.stepType === WorkflowStepType.ISSUANCE && step.stageType === WorkflowStageType.DECISION_GATE) {
        issues.push({
          code: 'ISSUANCE_IN_DECISION_GATE',
          message: `Issuance step "${step.stepKey}" cannot be placed in a DECISION_GATE stage`,
          path: step.stepKey,
        });
      }
    }
  }

  private validateTransitions(graph: LoadedWorkflowGraph, issues: WorkflowValidationIssue[]): void {
    const stepIds = new Set(graph.steps.map((step) => step.id));

    for (const transition of graph.transitions) {
      if (!stepIds.has(transition.fromStepId)) {
        issues.push({
          code: 'TRANSITION_FROM_MISSING',
          message: `Transition "${transition.id}" references missing from step`,
          path: transition.id,
        });
      }

      if (!stepIds.has(transition.toStepId)) {
        issues.push({
          code: 'TRANSITION_TO_MISSING',
          message: `Transition "${transition.id}" references missing to step`,
          path: transition.id,
        });
      }

      try {
        assertSafeConditionStructure(transition.conditionConfig, 'conditionConfig');
      } catch (error) {
        issues.push({
          code: 'UNSAFE_CONDITION_CONFIG',
          message: error instanceof Error ? error.message : 'Unsafe transition condition configuration',
          path: transition.id,
        });
      }
    }
  }

  private validateReachability(graph: LoadedWorkflowGraph, issues: WorkflowValidationIssue[]): void {
    const startingStep = graph.steps.find((step) => step.isStartingStep);
    if (!startingStep) {
      return;
    }

    const adjacency = new Map<string, string[]>();
    for (const step of graph.steps) {
      adjacency.set(step.id, []);
    }
    for (const transition of graph.transitions) {
      adjacency.get(transition.fromStepId)?.push(transition.toStepId);
    }

    const reachable = new Set<string>();
    const queue = [startingStep.id];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || reachable.has(current)) {
        continue;
      }
      reachable.add(current);
      for (const next of adjacency.get(current) ?? []) {
        if (!reachable.has(next)) {
          queue.push(next);
        }
      }
    }

    for (const step of graph.steps) {
      if (!reachable.has(step.id)) {
        issues.push({
          code: 'UNREACHABLE_STEP',
          message: `Step "${step.stepKey}" is unreachable from the starting step`,
          path: step.stepKey,
        });
      }
    }
  }

  private validateCycles(graph: LoadedWorkflowGraph, issues: WorkflowValidationIssue[]): void {
    const adjacency = new Map<string, string[]>();
    for (const step of graph.steps) {
      adjacency.set(step.id, []);
    }
    for (const transition of graph.transitions) {
      adjacency.get(transition.fromStepId)?.push(transition.toStepId);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const stepById = new Map(graph.steps.map((step) => [step.id, step]));

    const visit = (nodeId: string, path: string[]): void => {
      if (visited.has(nodeId)) {
        return;
      }
      if (visiting.has(nodeId)) {
        const cycleStart = stepById.get(nodeId);
        const permitsCycle = path.some((stepId) => stepById.get(stepId)?.permitsCycle);
        if (!permitsCycle) {
          issues.push({
            code: 'UNPERMITTED_CYCLE',
            message: `Workflow graph contains a cycle that is not explicitly permitted`,
            path: cycleStart?.stepKey,
          });
        }
        return;
      }

      visiting.add(nodeId);
      for (const next of adjacency.get(nodeId) ?? []) {
        visit(next, [...path, nodeId]);
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
    };

    for (const step of graph.steps) {
      visit(step.id, []);
    }
  }

  private async validateConsequentialAuthority(
    graph: LoadedWorkflowGraph,
    issues: WorkflowValidationIssue[],
  ): Promise<void> {
    for (const step of graph.steps) {
      if (!step.isConsequential) {
        continue;
      }

      if (!step.functionAuthorityRecordId) {
        issues.push({
          code: 'CONSEQUENTIAL_WITHOUT_AUTHORITY',
          message: `Consequential step "${step.stepKey}" must reference a FunctionAuthorityRecord`,
          path: step.stepKey,
        });
        continue;
      }

      const authorityIssue = await this.validateAuthorityRecord(
        step.functionAuthorityRecordId,
        step.requiredAuthorityAction,
        step.stepKey,
      );
      if (authorityIssue) {
        issues.push(authorityIssue);
      }
    }
  }

  private async validateDecisionAuthorityHumanOnly(
    graph: LoadedWorkflowGraph,
    issues: WorkflowValidationIssue[],
  ): Promise<void> {
    for (const step of graph.steps) {
      if (step.stepType !== WorkflowStepType.DECISION) {
        continue;
      }

      if (!step.functionAuthorityRecordId) {
        issues.push({
          code: 'DECISION_WITHOUT_AUTHORITY',
          message: `Decision step "${step.stepKey}" must reference a FunctionAuthorityRecord`,
          path: step.stepKey,
        });
        continue;
      }

      const record = await this.prisma.functionAuthorityRecord.findUnique({
        where: { id: step.functionAuthorityRecordId },
        include: { actionRights: true },
      });

      if (!record) {
        issues.push({
          code: 'DECISION_AUTHORITY_NOT_FOUND',
          message: `Decision step "${step.stepKey}" references missing FunctionAuthorityRecord`,
          path: step.stepKey,
        });
        continue;
      }

      if (record.lifecycleStatus !== FunctionAuthorityLifecycleStatus.ACTIVE) {
        issues.push({
          code: 'DECISION_AUTHORITY_NOT_ACTIVE',
          message: `Decision step "${step.stepKey}" references non-active authority record`,
          path: step.stepKey,
        });
      }

      const relevantActions = record.actionRights.filter((right) =>
        DECISION_AUTHORITY_ACTIONS.includes(
          right.action as (typeof DECISION_AUTHORITY_ACTIONS)[number],
        ),
      );

      const hasAutomatedDecision = relevantActions.some(
        (right) => right.permitted && !right.requiresHumanActor,
      );

      if (hasAutomatedDecision) {
        issues.push({
          code: 'AI_DECISION_OWNER_FORBIDDEN',
          message: `Decision step "${step.stepKey}" cannot use automated (non-human) authority for final decision`,
          path: step.stepKey,
        });
      }
    }
  }

  private validateIssuanceGatePlacement(
    graph: LoadedWorkflowGraph,
    issues: WorkflowValidationIssue[],
  ): void {
    for (const step of graph.steps) {
      if (step.stepType !== WorkflowStepType.ISSUANCE) {
        continue;
      }

      if (step.stageType !== WorkflowStageType.ISSUANCE_GATE) {
        issues.push({
          code: 'ISSUANCE_WITHOUT_GATE',
          message: `Issuance step "${step.stepKey}" must be placed in an ISSUANCE_GATE stage`,
          path: step.stepKey,
        });
      }
    }
  }

  private async validateAuthorityRecord(
    functionAuthorityRecordId: string,
    requiredAuthorityAction: AuthorityActionType | null,
    stepKey: string,
  ): Promise<WorkflowValidationIssue | null> {
    const record = await this.prisma.functionAuthorityRecord.findUnique({
      where: { id: functionAuthorityRecordId },
      include: { actionRights: true },
    });

    if (!record) {
      return {
        code: 'AUTHORITY_NOT_FOUND',
        message: `Step "${stepKey}" references missing FunctionAuthorityRecord`,
        path: stepKey,
      };
    }

    if (
      record.lifecycleStatus === FunctionAuthorityLifecycleStatus.SUSPENDED ||
      record.lifecycleStatus === FunctionAuthorityLifecycleStatus.INACTIVE ||
      record.lifecycleStatus === FunctionAuthorityLifecycleStatus.ARCHIVED
    ) {
      return {
        code: 'AUTHORITY_INVALID_STATUS',
        message: `Step "${stepKey}" references authority record with status ${record.lifecycleStatus}`,
        path: stepKey,
      };
    }

    if (requiredAuthorityAction) {
      const actionRight = record.actionRights.find((right) => right.action === requiredAuthorityAction);
      if (!actionRight?.permitted) {
        return {
          code: 'AUTHORITY_ACTION_NOT_PERMITTED',
          message: `Step "${stepKey}" requires authority action ${requiredAuthorityAction} that is not permitted`,
          path: stepKey,
        };
      }
    }

    return null;
  }
}
