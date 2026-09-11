import { BadRequestException, Injectable } from '@nestjs/common';
import {
  FormConditionalAction,
  FormConditionalLogic,
  FormConditionalOperator,
} from '@prisma/client';

import {
  FormAnswers,
  FormConditionalRuleDefinition,
  FormConditionClause,
  LoadedFormField,
} from './types/form-engine.types';

const CONDITIONAL_OPERATORS = new Set<string>(Object.values(FormConditionalOperator));

@Injectable()
export class FormConditionalLogicService {
  assertNoCircularDependencies(fields: LoadedFormField[]): void {
    const graph = new Map<string, Set<string>>();

    for (const field of fields) {
      const dependencies = new Set<string>();
      for (const rule of field.conditionalRules) {
        for (const condition of rule.conditions) {
          dependencies.add(condition.fieldKey);
        }
      }
      graph.set(field.fieldKey, dependencies);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (fieldKey: string, path: string[]): void => {
      if (visiting.has(fieldKey)) {
        throw new BadRequestException(
          `Circular conditional dependency detected: ${[...path, fieldKey].join(' -> ')}`,
        );
      }

      if (visited.has(fieldKey)) {
        return;
      }

      visiting.add(fieldKey);
      const dependencies = graph.get(fieldKey) ?? new Set<string>();
      for (const dependency of dependencies) {
        if (!graph.has(dependency)) {
          continue;
        }
        visit(dependency, [...path, fieldKey]);
      }
      visiting.delete(fieldKey);
      visited.add(fieldKey);
    };

    for (const fieldKey of graph.keys()) {
      visit(fieldKey, []);
    }
  }

  parseConditionalRules(rawRules: unknown): FormConditionalRuleDefinition[] {
    if (!Array.isArray(rawRules)) {
      return [];
    }

    return rawRules.map((rule, index) => this.parseConditionalRule(rule, index));
  }

  isFieldVisible(field: LoadedFormField, answers: FormAnswers): boolean {
    const hideRules = field.conditionalRules.filter(
      (rule) => rule.action === FormConditionalAction.HIDE,
    );
    const showRules = field.conditionalRules.filter(
      (rule) => rule.action === FormConditionalAction.SHOW,
    );

    if (hideRules.some((rule) => this.evaluateRule(rule, answers))) {
      return false;
    }

    if (showRules.length === 0) {
      return true;
    }

    return showRules.some((rule) => this.evaluateRule(rule, answers));
  }

  isFieldRequired(field: LoadedFormField, answers: FormAnswers): boolean {
    const requireRules = field.conditionalRules.filter(
      (rule) => rule.action === FormConditionalAction.REQUIRE,
    );
    const optionalRules = field.conditionalRules.filter(
      (rule) => rule.action === FormConditionalAction.OPTIONAL,
    );

    if (optionalRules.some((rule) => this.evaluateRule(rule, answers))) {
      return false;
    }

    if (requireRules.some((rule) => this.evaluateRule(rule, answers))) {
      return true;
    }

    return field.required;
  }

  evaluateRule(rule: FormConditionalRuleDefinition, answers: FormAnswers): boolean {
    if (rule.conditions.length === 0) {
      return false;
    }

    const results = rule.conditions.map((condition) => this.evaluateCondition(condition, answers));

    return rule.logic === FormConditionalLogic.OR ? results.some(Boolean) : results.every(Boolean);
  }

  evaluateCondition(condition: FormConditionClause, answers: FormAnswers): boolean {
    const actual = answers[condition.fieldKey];

    switch (condition.operator) {
      case FormConditionalOperator.EQUALS:
        return actual === condition.value;
      case FormConditionalOperator.NOT_EQUALS:
        return actual !== condition.value;
      case FormConditionalOperator.IN:
        return Array.isArray(condition.value) && condition.value.includes(actual);
      case FormConditionalOperator.NOT_IN:
        return Array.isArray(condition.value) && !condition.value.includes(actual);
      case FormConditionalOperator.IS_EMPTY:
        return this.isEmptyValue(actual);
      case FormConditionalOperator.IS_NOT_EMPTY:
        return !this.isEmptyValue(actual);
      case FormConditionalOperator.GREATER_THAN:
        return this.compareNumbers(actual, condition.value) > 0;
      case FormConditionalOperator.LESS_THAN:
        return this.compareNumbers(actual, condition.value) < 0;
      case FormConditionalOperator.GREATER_THAN_OR_EQUAL:
        return this.compareNumbers(actual, condition.value) >= 0;
      case FormConditionalOperator.LESS_THAN_OR_EQUAL:
        return this.compareNumbers(actual, condition.value) <= 0;
      default:
        return false;
    }
  }

  private parseConditionalRule(rule: unknown, index: number): FormConditionalRuleDefinition {
    if (typeof rule !== 'object' || rule === null) {
      throw new BadRequestException(`Conditional rule at index ${String(index)} must be an object`);
    }

    const record = rule as Record<string, unknown>;
    const action = record.action;
    const logic = record.logic ?? FormConditionalLogic.AND;
    const conditions = record.conditions;

    if (!Object.values(FormConditionalAction).includes(action as FormConditionalAction)) {
      throw new BadRequestException(
        `Conditional rule at index ${String(index)} has invalid action`,
      );
    }

    if (!Object.values(FormConditionalLogic).includes(logic as FormConditionalLogic)) {
      throw new BadRequestException(`Conditional rule at index ${String(index)} has invalid logic`);
    }

    if (!Array.isArray(conditions) || conditions.length === 0) {
      throw new BadRequestException(
        `Conditional rule at index ${String(index)} must include conditions`,
      );
    }

    const parsedConditions = conditions.map((condition, conditionIndex) =>
      this.parseConditionClause(condition, index, conditionIndex),
    );

    return {
      action: action as FormConditionalAction,
      logic: logic as FormConditionalLogic,
      conditions: parsedConditions,
    };
  }

  private parseConditionClause(
    condition: unknown,
    ruleIndex: number,
    conditionIndex: number,
  ): FormConditionClause {
    if (typeof condition !== 'object' || condition === null) {
      throw new BadRequestException(
        `Conditional rule ${String(ruleIndex)} condition ${String(conditionIndex)} must be an object`,
      );
    }

    const record = condition as Record<string, unknown>;
    const fieldKey = record.fieldKey;
    const operator = record.operator;

    if (typeof fieldKey !== 'string' || fieldKey.length === 0) {
      throw new BadRequestException(
        `Conditional rule ${String(ruleIndex)} condition ${String(conditionIndex)} requires fieldKey`,
      );
    }

    if (!CONDITIONAL_OPERATORS.has(String(operator))) {
      throw new BadRequestException(
        `Conditional rule ${String(ruleIndex)} condition ${String(conditionIndex)} has invalid operator`,
      );
    }

    return {
      fieldKey,
      operator: operator as FormConditionalOperator,
      value: record.value,
    };
  }

  private isEmptyValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === 'string') {
      return value.trim().length === 0;
    }

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return false;
  }

  private compareNumbers(actual: unknown, expected: unknown): number {
    const actualNumber = typeof actual === 'number' ? actual : Number(actual);
    const expectedNumber = typeof expected === 'number' ? expected : Number(expected);

    if (Number.isNaN(actualNumber) || Number.isNaN(expectedNumber)) {
      return Number.NaN;
    }

    return actualNumber - expectedNumber;
  }
}
