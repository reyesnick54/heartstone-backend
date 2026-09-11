import { UnauthorizedException } from '@nestjs/common';
import { AssuranceLevel, AuthenticationMethodType, IdentityType } from '@prisma/client';

import type { SessionContextDto } from '../dto/session-context.dto';
import { MfaAssuranceService } from './mfa-assurance.service';

describe('MfaAssuranceService', () => {
  const service = new MfaAssuranceService();

  const baseSession: SessionContextDto = {
    sessionId: 'sess-1',
    identityId: 'id-1',
    assuranceLevel: AssuranceLevel.LOW,
    authMethod: AuthenticationMethodType.PASSWORD,
    mfaSatisfied: false,
    authenticatedAt: new Date(),
    identityType: IdentityType.INDIVIDUAL,
    isServicePrincipal: false,
  };

  it('rejects when MFA is required but not satisfied', () => {
    expect(() => {
      service.evaluateRequirement({ required: true }, baseSession);
    }).toThrow(UnauthorizedException);
  });

  it('allows when MFA is satisfied', () => {
    const mfaSession: SessionContextDto = {
      sessionId: baseSession.sessionId,
      identityId: baseSession.identityId,
      assuranceLevel: AssuranceLevel.HIGH,
      authMethod: baseSession.authMethod,
      mfaSatisfied: true,
      authenticatedAt: baseSession.authenticatedAt,
      identityType: baseSession.identityType,
      isServicePrincipal: baseSession.isServicePrincipal,
    };

    expect(() => {
      service.evaluateRequirement({ required: true }, mfaSession);
    }).not.toThrow();
  });

  it('rejects insufficient assurance level', () => {
    expect(() => {
      service.evaluateRequirement(
        { required: false, minimumAssuranceLevel: AssuranceLevel.HIGH },
        baseSession,
      );
    }).toThrow(UnauthorizedException);
  });
});
