import { WorkflowStepConsequenceLevel } from '@prisma/client';

import {
  SERVICE_PACK_COMPILATION_CHECK_CODES,
  SERVICE_PACK_ISSUE_SEVERITY,
} from './service-pack.constants';
import {
  type ServicePackCompilationIssue,
  type ServicePackWorkflowManifest,
} from './service-pack.types';

export function validateServicePackWorkflowManifest(
  workflow: ServicePackWorkflowManifest,
  resolvedFunctionAuthorityCodes: Set<string>,
  pathPrefix: string,
): ServicePackCompilationIssue[] {
  const issues: ServicePackCompilationIssue[] = [];
  const stepKeys = new Set(workflow.steps.map((step) => step.stepKey));
  const stageKeys = new Set(workflow.stages.map((stage) => stage.stageKey));

  for (const step of workflow.steps) {
    if (step.stageKey && !stageKeys.has(step.stageKey)) {
      issues.push({
        code: SERVICE_PACK_COMPILATION_CHECK_CODES.WORKFLOW_GRAPH_VALIDITY,
        severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
        message: `Step "${step.stepKey}" references unknown stage "${step.stageKey}"`,
        path: `${pathPrefix}.steps.${step.stepKey}`,
        entityRef: step.stepKey,
      });
    }

    if (
      step.consequenceLevel === WorkflowStepConsequenceLevel.CONSEQUENTIAL &&
      step.functionAuthorityCode &&
      !resolvedFunctionAuthorityCodes.has(step.functionAuthorityCode)
    ) {
      issues.push({
        code: SERVICE_PACK_COMPILATION_CHECK_CODES.INVALID_CONSEQUENTIAL_ACTION_MAPPING,
        severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
        message: `Consequential step "${step.stepKey}" references unresolved function authority "${step.functionAuthorityCode}"`,
        path: `${pathPrefix}.steps.${step.stepKey}`,
        entityRef: step.functionAuthorityCode,
      });
    }
  }

  for (const transition of workflow.transitions) {
    if (!stepKeys.has(transition.fromStepKey)) {
      issues.push({
        code: SERVICE_PACK_COMPILATION_CHECK_CODES.MISSING_TRANSITIONS,
        severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
        message: `Transition "${transition.transitionKey}" references unknown from-step "${transition.fromStepKey}"`,
        path: `${pathPrefix}.transitions.${transition.transitionKey}`,
        entityRef: transition.fromStepKey,
      });
    }

    if (!stepKeys.has(transition.toStepKey)) {
      issues.push({
        code: SERVICE_PACK_COMPILATION_CHECK_CODES.MISSING_TRANSITIONS,
        severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
        message: `Transition "${transition.transitionKey}" references unknown to-step "${transition.toStepKey}"`,
        path: `${pathPrefix}.transitions.${transition.transitionKey}`,
        entityRef: transition.toStepKey,
      });
    }
  }

  const reachableSteps = findReachableSteps(workflow);
  for (const step of workflow.steps) {
    const hasIncoming = workflow.transitions.some(
      (transition) => transition.toStepKey === step.stepKey,
    );
    const isEntry = !hasIncoming;

    if (!isEntry && !reachableSteps.has(step.stepKey)) {
      issues.push({
        code: SERVICE_PACK_COMPILATION_CHECK_CODES.DEAD_WORKFLOW_STAGES,
        severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
        message: `Step "${step.stepKey}" is unreachable (dead stage)`,
        path: `${pathPrefix}.steps.${step.stepKey}`,
        entityRef: step.stepKey,
      });
    }
  }

  if (workflow.steps.length > 0 && reachableSteps.size === 0) {
    issues.push({
      code: SERVICE_PACK_COMPILATION_CHECK_CODES.WORKFLOW_GRAPH_VALIDITY,
      severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
      message: 'Workflow has no reachable entry steps',
      path: pathPrefix,
      entityRef: workflow.code,
    });
  }

  return issues;
}

function findReachableSteps(workflow: ServicePackWorkflowManifest): Set<string> {
  const stepKeys = new Set(workflow.steps.map((step) => step.stepKey));
  const entrySteps = workflow.steps
    .filter(
      (step) => !workflow.transitions.some((transition) => transition.toStepKey === step.stepKey),
    )
    .map((step) => step.stepKey);

  const reachable = new Set<string>();
  const queue = [...entrySteps];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || reachable.has(current)) {
      continue;
    }
    if (!stepKeys.has(current)) {
      continue;
    }
    reachable.add(current);

    for (const transition of workflow.transitions) {
      if (transition.fromStepKey === current && !reachable.has(transition.toStepKey)) {
        queue.push(transition.toStepKey);
      }
    }
  }

  return reachable;
}
