import { AuthorityClassification, FunctionAuthorityLifecycleStatus } from '@prisma/client';

import {
  canSupportOperationalAuthorityEvaluation,
  isNonOperationalLifecycleState,
  isOperationallyActiveLifecycleState,
  isProhibitedClassification,
  isSuspendedLifecycleState,
} from './authority-lifecycle.util';

describe('authority lifecycle utilities', () => {
  it('treats only ACTIVE as operationally active', () => {
    expect(isOperationallyActiveLifecycleState(FunctionAuthorityLifecycleStatus.ACTIVE)).toBe(true);
    expect(isOperationallyActiveLifecycleState(FunctionAuthorityLifecycleStatus.DRAFT)).toBe(false);
    expect(
      isOperationallyActiveLifecycleState(FunctionAuthorityLifecycleStatus.PENDING_ACTIVATION),
    ).toBe(false);
    expect(isOperationallyActiveLifecycleState(FunctionAuthorityLifecycleStatus.SUSPENDED)).toBe(
      false,
    );
  });

  it('treats DRAFT and PENDING_ACTIVATION as non-operational', () => {
    expect(isNonOperationalLifecycleState(FunctionAuthorityLifecycleStatus.DRAFT)).toBe(true);
    expect(
      isNonOperationalLifecycleState(FunctionAuthorityLifecycleStatus.PENDING_ACTIVATION),
    ).toBe(true);
    expect(isNonOperationalLifecycleState(FunctionAuthorityLifecycleStatus.ACTIVE)).toBe(false);
  });

  it('treats SUSPENDED as not operationally active', () => {
    expect(isSuspendedLifecycleState(FunctionAuthorityLifecycleStatus.SUSPENDED)).toBe(true);
    expect(
      canSupportOperationalAuthorityEvaluation(
        FunctionAuthorityLifecycleStatus.SUSPENDED,
        AuthorityClassification.ABSEZ_OWNED,
      ),
    ).toBe(false);
  });

  it('treats PROHIBITED_OR_UNAUTHORIZED as never operationally evaluable', () => {
    expect(isProhibitedClassification(AuthorityClassification.PROHIBITED_OR_UNAUTHORIZED)).toBe(
      true,
    );
    expect(
      canSupportOperationalAuthorityEvaluation(
        FunctionAuthorityLifecycleStatus.ACTIVE,
        AuthorityClassification.PROHIBITED_OR_UNAUTHORIZED,
      ),
    ).toBe(false);
  });

  it('allows operational evaluation only for ACTIVE non-prohibited records', () => {
    expect(
      canSupportOperationalAuthorityEvaluation(
        FunctionAuthorityLifecycleStatus.ACTIVE,
        AuthorityClassification.ADMINISTRATIVE_SUPPORT,
      ),
    ).toBe(true);
    expect(
      canSupportOperationalAuthorityEvaluation(
        FunctionAuthorityLifecycleStatus.DRAFT,
        AuthorityClassification.ADMINISTRATIVE_SUPPORT,
      ),
    ).toBe(false);
  });
});
