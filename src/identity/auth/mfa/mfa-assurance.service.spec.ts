import { UnauthorizedException } from '@nestjs/common';
import { AssuranceLevel } from '@prisma/client';

import { MfaAssuranceService } from './mfa-assurance.service';

describe('MfaAssuranceService', () => {
  const service = new MfaAssuranceService();

  it('requires MFA when configured', () => {
    expect(() => {
      service.evaluateRequirement(
        { required: true },
        {
          sessionId: 's',
          identityId: 'i',
          assuranceLevel: AssuranceLevel.LOW,
          authMethod: 'PASSWORD',
          mfaSatisfied: false,
          authenticatedAt: new Date(),
          identityType: 'INDIVIDUAL',
          isServicePrincipal: false,
        },
      );
    }).toThrow(UnauthorizedException);
  });

  it('accepts sufficient assurance level', () => {
    expect(() => {
      service.evaluateRequirement(
        { minimumAssuranceLevel: AssuranceLevel.MEDIUM },
        {
          sessionId: 's',
          identityId: 'i',
          assuranceLevel: AssuranceLevel.HIGH,
          authMethod: 'OIDC',
          mfaSatisfied: true,
          authenticatedAt: new Date(),
          identityType: 'INDIVIDUAL',
          isServicePrincipal: false,
        },
      );
    }).not.toThrow();
  });
});
