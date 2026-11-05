import { AuthorityActionType, AuthorityConditionType } from '@prisma/client';

import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import { AuthorityConditionEvaluator } from './authority-condition-evaluator.service';

describe('AuthorityConditionEvaluator transaction limits (S21c)', () => {
  const evaluator = new AuthorityConditionEvaluator();
  const limit = (maxAmount: unknown) => [
    {
      conditionType: AuthorityConditionType.TRANSACTION_LIMIT,
      configuration: { maxAmount },
      isRequired: true,
    },
  ];

  it('fails closed when a limit applies but the amount is unknown', () => {
    expect(evaluator.evaluate(limit(5000), { action: AuthorityActionType.APPROVE })).toEqual([
      AUTHORITY_EVALUATION_EXPLANATION_CODES.TRANSACTION_AMOUNT_UNKNOWN,
    ]);
  });

  it('rejects negative or non-finite amounts', () => {
    for (const transactionAmount of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        evaluator.evaluate(limit(5000), { action: AuthorityActionType.APPROVE, transactionAmount }),
      ).toEqual([AUTHORITY_EVALUATION_EXPLANATION_CODES.TRANSACTION_AMOUNT_UNKNOWN]);
    }
  });

  it('denies amounts above the limit and a misconfigured limit', () => {
    expect(
      evaluator.evaluate(limit(5000), {
        action: AuthorityActionType.APPROVE,
        transactionAmount: 5000.01,
      }),
    ).toEqual([AUTHORITY_EVALUATION_EXPLANATION_CODES.TRANSACTION_LIMIT_EXCEEDED]);
    expect(
      evaluator.evaluate(limit('not-a-number'), {
        action: AuthorityActionType.APPROVE,
        transactionAmount: 1,
      }),
    ).toEqual([AUTHORITY_EVALUATION_EXPLANATION_CODES.TRANSACTION_LIMIT_EXCEEDED]);
  });

  it('allows amounts within the limit', () => {
    expect(
      evaluator.evaluate(limit(5000), {
        action: AuthorityActionType.APPROVE,
        transactionAmount: 5000,
      }),
    ).toEqual([]);
  });
});
