import { ForbiddenException } from '@nestjs/common';

import { ImmigrationExperienceBoundaryService } from './immigration-experience-boundary.service';

describe('ImmigrationExperienceBoundaryService', () => {
  const service = new ImmigrationExperienceBoundaryService();

  it('removes restricted external check fields from citizen payloads', () => {
    const sanitized = service.sanitizeCitizenPayload({
      verifiedStatusLabel: 'Resident',
      externalSecurityCheckStatus: 'MATCH',
      externalCriminalCheckResult: 'CLEAR',
    });

    expect(sanitized.verifiedStatusLabel).toBe('Resident');
    expect(sanitized.externalSecurityCheckStatus).toBeUndefined();
    expect(sanitized.externalCriminalCheckResult).toBeUndefined();
  });

  it('blocks citizen immigration status mutation actions', () => {
    expect(() => {
      service.assertCitizenCannotMutateImmigrationStatus('set_immigration_status');
    }).toThrow(ForbiddenException);
  });

  it('blocks applicant self-issuance', () => {
    expect(() => {
      service.assertApplicantCannotSelfIssue(true, 'issue_credential');
    }).toThrow(ForbiddenException);
  });
});
