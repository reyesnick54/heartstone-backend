import { StructuredApplicabilityRuleType } from '@prisma/client';

import { SERVICE_CHECKLIST_EXPLANATION_CODES } from '../services.constants';
import { StructuredApplicabilityRuleEvaluator } from './structured-applicability-rule-evaluator.service';

describe('StructuredApplicabilityRuleEvaluator', () => {
  const evaluator = new StructuredApplicabilityRuleEvaluator();

  it('evaluates FACT_EQUALS deterministically', () => {
    const result = evaluator.evaluate(
      {
        id: 'rule-1',
        ruleType: StructuredApplicabilityRuleType.FACT_EQUALS,
        configuration: { factKey: 'applicantType', value: 'COMPANY' },
        status: 'ACTIVE',
      },
      { applicantType: 'COMPANY' },
    );

    expect(result.outcome).toBe('APPLIES');
  });

  it('fails closed when required fact is missing', () => {
    const result = evaluator.evaluate(
      {
        id: 'rule-1',
        ruleType: StructuredApplicabilityRuleType.FACT_EQUALS,
        configuration: { factKey: 'applicantType', value: 'COMPANY' },
        status: 'ACTIVE',
      },
      {},
    );

    expect(result.outcome).toBe('UNRESOLVED');
    expect(result.reasonCode).toBe(SERVICE_CHECKLIST_EXPLANATION_CODES.UNRESOLVED_CONDITIONAL_RULE);
  });

  it('evaluates ALL_OF composite rules', () => {
    const result = evaluator.evaluate(
      {
        id: 'rule-2',
        ruleType: StructuredApplicabilityRuleType.ALL_OF,
        configuration: {
          conditions: [
            { factKey: 'applicantType', value: 'COMPANY' },
            { factKey: 'isRepresentativeFiling', value: true },
          ],
        },
        status: 'ACTIVE',
      },
      { applicantType: 'COMPANY', isRepresentativeFiling: true },
    );

    expect(result.outcome).toBe('APPLIES');
  });

  it('safe-halts on unknown rule operators', () => {
    const result = evaluator.evaluate(
      {
        id: 'rule-3',
        ruleType: 'UNKNOWN_OPERATOR' as StructuredApplicabilityRuleType,
        configuration: {},
        status: 'ACTIVE',
      },
      { applicantType: 'COMPANY' },
    );

    expect(result.outcome).toBe('UNRESOLVED');
    expect(result.reasonCode).toBe(SERVICE_CHECKLIST_EXPLANATION_CODES.UNKNOWN_RULE_OPERATOR);
  });
});
