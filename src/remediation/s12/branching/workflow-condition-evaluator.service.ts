import { Injectable } from '@nestjs/common';
import { CaseStatus } from '@prisma/client';

import {
  type WorkflowConditionClauseV1,
  type WorkflowConditionConfigV1,
} from './workflow-condition.types';

export interface WorkflowConditionEvaluationContext {
  caseStatus: CaseStatus;
  stepOutcome?: string;
  serverFacts?: Record<string, string | number | boolean>;
}

@Injectable()
export class WorkflowConditionEvaluatorService {
  evaluate(config: unknown, context: WorkflowConditionContext): boolean {
    const parsed = this.parseConfig(config);
    if (!parsed) {
      return true;
    }

    const results = parsed.rules.map((rule) => this.evaluateClause(rule, context));
    return parsed.join === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  private parseConfig(config: unknown): WorkflowConditionConfigV1 | null {
    if (!config || typeof config !== 'object') {
      return null;
    }
    const record = config as Record<string, unknown>;
    if (record.version !== 1 || !Array.isArray(record.rules)) {
      return null;
    }
    return record as unknown as WorkflowConditionConfigV1;
  }

  private evaluateClause(
    clause: WorkflowConditionClauseV1,
    context: WorkflowConditionEvaluationContext,
  ): boolean {
    const actual = this.resolveField(clause.field, context);
    const expected = clause.value;

    switch (clause.op) {
      case 'EQ':
        return String(actual) === String(expected);
      case 'NEQ':
        return String(actual) !== String(expected);
      case 'IN':
        return Array.isArray(expected) && expected.map(String).includes(String(actual));
      case 'NOT_IN':
        return Array.isArray(expected) && !expected.map(String).includes(String(actual));
      default:
        return false;
    }
  }

  private resolveField(
    field: string,
    context: WorkflowConditionEvaluationContext,
  ): string | number | boolean | undefined {
    if (field === 'case.status') {
      return context.caseStatus;
    }
    if (field === 'step.outcome') {
      return context.stepOutcome;
    }
    return context.serverFacts?.[field];
  }
}

type WorkflowConditionContext = WorkflowConditionEvaluationContext;
