import { Injectable } from '@nestjs/common';
import { WorkflowTransitionConditionType } from '@prisma/client';

export interface StructuredTransitionRule {
  operator?: 'AND' | 'OR';
  conditions?: StructuredCondition[];
}

export interface StructuredCondition {
  type: 'FIELD_EQUALS' | 'FIELD_IN' | 'FIELD_EXISTS' | 'CORRECTION_COUNT_LT';
  field: string;
  value?: unknown;
  values?: unknown[];
}

export interface TransitionEvaluationContext {
  completedStepKey: string;
  joinBranchesComplete: boolean;
  isCorrectionReturn: boolean;
  isEscalation: boolean;
  runtimeFacts: Record<string, unknown>;
}

@Injectable()
export class WorkflowTransitionEvaluatorService {
  evaluateTransitions(
    transitions: {
      toStepKey: string;
      conditionType: WorkflowTransitionConditionType;
      conditionRules: unknown;
      isDefault: boolean;
    }[],
    context: TransitionEvaluationContext,
  ): string[] {
    const matching: string[] = [];

    for (const transition of transitions) {
      if (this.matchesTransition(transition, context)) {
        matching.push(transition.toStepKey);
      }
    }

    if (matching.length === 0) {
      const defaultTransition = transitions.find((t) => t.isDefault);
      if (defaultTransition) {
        matching.push(defaultTransition.toStepKey);
      }
    }

    return matching;
  }

  private matchesTransition(
    transition: {
      conditionType: WorkflowTransitionConditionType;
      conditionRules: unknown;
      isDefault: boolean;
    },
    context: TransitionEvaluationContext,
  ): boolean {
    switch (transition.conditionType) {
      case WorkflowTransitionConditionType.ALWAYS:
        return true;
      case WorkflowTransitionConditionType.STEP_COMPLETED:
        return true;
      case WorkflowTransitionConditionType.ALL_JOIN_BRANCHES_COMPLETE:
        return context.joinBranchesComplete;
      case WorkflowTransitionConditionType.CORRECTION_RETURN:
        return context.isCorrectionReturn;
      case WorkflowTransitionConditionType.ESCALATION:
        return context.isEscalation;
      default:
        return this.evaluateStructuredRules(transition.conditionRules, context.runtimeFacts);
    }
  }

  private evaluateStructuredRules(rules: unknown, facts: Record<string, unknown>): boolean {
    if (!rules || typeof rules !== 'object') {
      return false;
    }

    const structured = rules as StructuredTransitionRule;
    if (!structured.conditions || structured.conditions.length === 0) {
      return false;
    }

    const operator = structured.operator ?? 'AND';
    const results = structured.conditions.map((condition) =>
      this.evaluateCondition(condition, facts),
    );

    return operator === 'OR' ? results.some(Boolean) : results.every(Boolean);
  }

  private evaluateCondition(
    condition: StructuredCondition,
    facts: Record<string, unknown>,
  ): boolean {
    const fieldValue = facts[condition.field];

    switch (condition.type) {
      case 'FIELD_EQUALS':
        return fieldValue === condition.value;
      case 'FIELD_IN':
        return Array.isArray(condition.values) && condition.values.includes(fieldValue);
      case 'FIELD_EXISTS':
        return fieldValue !== undefined && fieldValue !== null;
      case 'CORRECTION_COUNT_LT':
        return typeof fieldValue === 'number' && typeof condition.value === 'number'
          ? fieldValue < condition.value
          : false;
      default:
        return false;
    }
  }
}
