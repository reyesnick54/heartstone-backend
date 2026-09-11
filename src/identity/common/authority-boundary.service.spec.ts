import { Test } from '@nestjs/testing';

import { AuthorityBoundaryService } from './authority-boundary.service';

describe('AuthorityBoundaryService', () => {
  let service: AuthorityBoundaryService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AuthorityBoundaryService],
    }).compile();

    service = moduleRef.get(AuthorityBoundaryService);
  });

  it('returns null without a function/action evaluation request', () => {
    expect(
      service.resolveGovernmentAuthority({
        identityId: 'id-1',
        officeholderId: 'oh-1',
        externalClaims: { admin: true },
        assuranceLevel: 'HIGH',
      }),
    ).toBeNull();
  });

  it('does not synchronously grant authority with evaluation context', () => {
    const resolution = service.resolveGovernmentAuthority({
      identityId: 'id-1',
      functionAuthorityRecordId: 'fn-1',
      action: 'DECIDE',
    });

    expect(resolution).not.toBeNull();
    expect(resolution?.hasGovernmentAuthority).toBe(false);
  });

  it('assertNoGovernmentAuthority passes for authentication-only context', () => {
    expect(() => {
      service.assertNoGovernmentAuthority({
        identityId: 'id-1',
        representativeAuthorityId: 'ra-1',
      });
    }).not.toThrow();
  });
});
