import {
  AuthorityDependencyType,
  InstitutionalActType,
} from '@prisma/client';

import {
  consultationSatisfiesConcurrenceRequirement,
  escalationBypassesAuthority,
  externalResponseIsAbsezDecision,
  referralCreatesDelegation,
  slaBreachApprovesApplication,
} from './referral-semantics.util';

describe('Referral semantics (Phase 6F)', () => {
  it('consultation does not satisfy concurrence', () => {
    expect(
      consultationSatisfiesConcurrenceRequirement(
        AuthorityDependencyType.GOVERNMENT_CONCURRENCE,
        InstitutionalActType.CONSULTATION,
      ),
    ).toBe(false);
  });

  it('concurrence satisfies concurrence dependency', () => {
    expect(
      consultationSatisfiesConcurrenceRequirement(
        AuthorityDependencyType.GOVERNMENT_CONCURRENCE,
        InstitutionalActType.CONCURRENCE,
      ),
    ).toBe(true);
  });

  it('external response cannot masquerade as ABSEZ decision', () => {
    expect(externalResponseIsAbsezDecision(true)).toBe(false);
  });

  it('referral liaison does not create delegation', () => {
    expect(referralCreatesDelegation()).toBe(false);
  });

  it('SLA breach does not approve application', () => {
    expect(slaBreachApprovesApplication()).toBe(false);
  });

  it('escalation does not bypass authority boundary', () => {
    expect(escalationBypassesAuthority()).toBe(false);
  });
});
