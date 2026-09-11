import { AuthorityDependencyType, InstitutionalActType } from '@prisma/client';

import {
  actTypeSatisfiesDependency,
  consultationSatisfiesConcurrence,
  dataExchangeTransfersAuthority,
  liaisonCreatesDelegation,
  supervisionIsFinalApproval,
} from './dependency-semantics.util';

describe('dependency semantics', () => {
  it('establishes consultation does not satisfy concurrence', () => {
    expect(consultationSatisfiesConcurrence(InstitutionalActType.CONSULTATION)).toBe(false);
    expect(consultationSatisfiesConcurrence(InstitutionalActType.CONCURRENCE)).toBe(true);
  });

  it('establishes supervision is not national final approval', () => {
    expect(supervisionIsFinalApproval(InstitutionalActType.SUPERVISION)).toBe(false);
    expect(supervisionIsFinalApproval(InstitutionalActType.DECISION)).toBe(true);
  });

  it('establishes liaison does not create delegation', () => {
    expect(liaisonCreatesDelegation(InstitutionalActType.LIAISON)).toBe(false);
  });

  it('establishes data exchange does not transfer authority', () => {
    expect(dataExchangeTransfersAuthority(InstitutionalActType.DATA_EXCHANGE)).toBe(true);
  });

  it('maps dependency types to required act types', () => {
    expect(
      actTypeSatisfiesDependency(
        AuthorityDependencyType.GOVERNMENT_CONCURRENCE,
        InstitutionalActType.CONCURRENCE,
      ),
    ).toBe(true);
    expect(
      actTypeSatisfiesDependency(
        AuthorityDependencyType.GOVERNMENT_CONCURRENCE,
        InstitutionalActType.CONSULTATION,
      ),
    ).toBe(false);
  });
});
