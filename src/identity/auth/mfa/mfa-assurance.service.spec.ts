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

  describe('error codes', () => {
    const lowSession = {
      sessionId: 's',
      identityId: 'i',
      assuranceLevel: AssuranceLevel.LOW,
      authMethod: 'PASSWORD' as const,
      mfaSatisfied: false,
      authenticatedAt: new Date(),
      identityType: 'INDIVIDUAL' as const,
      isServicePrincipal: false,
    };

    function captureFrom(fn: () => void): UnauthorizedException {
      try {
        fn();
      } catch (error) {
        return error as UnauthorizedException;
      }
      throw new Error('expected an exception');
    }

    it('returns MFA_REQUIRED with the unchanged message for sessions', () => {
      const error = captureFrom(() => {
        service.evaluateRequirement({ required: true }, lowSession);
      });

      expect(error.getStatus()).toBe(401);
      expect(error.message).toBe('Multi-factor authentication is required');
      expect(error.getResponse()).toMatchObject({
        statusCode: 401,
        message: 'Multi-factor authentication is required',
        code: 'MFA_REQUIRED',
      });
    });

    it('returns ASSURANCE_INSUFFICIENT with the unchanged message for sessions', () => {
      const error = captureFrom(() => {
        service.evaluateRequirement({ minimumAssuranceLevel: AssuranceLevel.HIGH }, lowSession);
      });

      expect(error.getStatus()).toBe(401);
      expect(error.message).toBe('Authentication assurance level is insufficient');
      expect(error.getResponse()).toMatchObject({
        message: 'Authentication assurance level is insufficient',
        code: 'ASSURANCE_INSUFFICIENT',
      });
    });

    it('returns the same codes when evaluating OIDC claims', () => {
      const claims = {
        issuer: 'https://issuer.test',
        subject: 'sub',
        audience: 'api',
        providerCode: 'idp',
        authenticationMethod: 'OIDC' as const,
        authenticatedAt: new Date(),
        assuranceLevel: AssuranceLevel.MEDIUM,
        mfaSatisfied: false,
        amr: [],
        externalContext: {},
      };

      expect(
        captureFrom(() => {
          service.evaluateClaims({ required: true }, claims);
        }).getResponse(),
      ).toMatchObject({ code: 'MFA_REQUIRED' });
      expect(
        captureFrom(() => {
          service.evaluateClaims(
            { required: true, minimumAssuranceLevel: AssuranceLevel.HIGH },
            { ...claims, mfaSatisfied: true },
          );
        }).getResponse(),
      ).toMatchObject({ code: 'ASSURANCE_INSUFFICIENT' });
    });
  });
});
