import { AuthorityBoundaryService } from './authority-boundary.service';

describe('AuthorityBoundaryService', () => {
  const service = new AuthorityBoundaryService();

  it('never resolves government authority from identity context alone', () => {
    expect(
      service.resolveGovernmentAuthority({
        identityId: 'id-1',
        officeholderId: 'oh-1',
        appointmentId: 'appt-1',
        externalClaims: { admin: true },
        assuranceLevel: 'HIGH',
      }),
    ).toBeNull();
  });

  it('assertNoGovernmentAuthority passes for identity-only context', () => {
    expect(() => {
      service.assertNoGovernmentAuthority({
        identityId: 'id-1',
        representativeAuthorityId: 'ra-1',
      });
    }).not.toThrow();
  });
});
