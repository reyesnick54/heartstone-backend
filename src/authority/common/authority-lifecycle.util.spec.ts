import { AuthorityClassification, AuthorityLifecycleState } from '@prisma/client';

import {
  canSupportOperationalAuthorityEvaluation,
  isNonOperationalLifecycleState,
  isOperationallyActiveLifecycleState,
  isProhibitedClassification,
  isSuspendedLifecycleState,
} from './authority-lifecycle.util';

describe('authority lifecycle utilities', () => {
  it('treats only ACTIVE as operationally active', () => {
    expect(isOperationallyActiveLifecycleState(AuthorityLifecycleState.ACTIVE)).toBe(true);
    expect(isOperationallyActiveLifecycleState(AuthorityLifecycleState.RECOGNIZED)).toBe(false);
    expect(isOperationallyActiveLifecycleState(AuthorityLifecycleState.REVIEWED)).toBe(false);
    expect(isOperationallyActiveLifecycleState(AuthorityLifecycleState.SUSPENDED)).toBe(false);
  });

  it('treats RECOGNIZED and REVIEWED as non-operational', () => {
    expect(isNonOperationalLifecycleState(AuthorityLifecycleState.RECOGNIZED)).toBe(true);
    expect(isNonOperationalLifecycleState(AuthorityLifecycleState.REVIEWED)).toBe(true);
    expect(isNonOperationalLifecycleState(AuthorityLifecycleState.ACTIVE)).toBe(false);
  });

  it('treats SUSPENDED as not operationally active', () => {
    expect(isSuspendedLifecycleState(AuthorityLifecycleState.SUSPENDED)).toBe(true);
    expect(
      canSupportOperationalAuthorityEvaluation(
        AuthorityLifecycleState.SUSPENDED,
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
        AuthorityLifecycleState.ACTIVE,
        AuthorityClassification.PROHIBITED_OR_UNAUTHORIZED,
      ),
    ).toBe(false);
  });

  it('allows operational evaluation only for ACTIVE non-prohibited records', () => {
    expect(
      canSupportOperationalAuthorityEvaluation(
        AuthorityLifecycleState.ACTIVE,
        AuthorityClassification.ADMINISTRATIVE_SUPPORT,
      ),
    ).toBe(true);
    expect(
      canSupportOperationalAuthorityEvaluation(
        AuthorityLifecycleState.ACCEPTED,
        AuthorityClassification.ADMINISTRATIVE_SUPPORT,
      ),
    ).toBe(false);
  });
});
