import { UnauthorizedException } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { AssuranceLevel } from '@prisma/client';

import { type SecurityAuditService } from '../../audit/security-audit.service';
import { MfaAssuranceService } from '../mfa/mfa-assurance.service';
import { StepUpAuthService } from './step-up-auth.service';

describe('StepUpAuthService', () => {
  const audit = { record: jest.fn() };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue({
      stepUpMaxAuthenticationAgeSeconds: 900,
    }),
  };

  const service = new StepUpAuthService(
    configService as unknown as ConfigService,
    new MfaAssuranceService(),
    audit as unknown as SecurityAuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects stale authentication for elevated requirements', async () => {
    const stale = new Date(Date.now() - 2 * 60 * 60 * 1000);

    await expect(
      service.enforce(
        { minimumAssuranceLevel: AssuranceLevel.HIGH, requireRecentAuthentication: true },
        {
          sessionId: 's',
          identityId: 'i',
          assuranceLevel: AssuranceLevel.HIGH,
          authMethod: 'OIDC',
          mfaSatisfied: true,
          authenticatedAt: stale,
          identityType: 'INDIVIDUAL',
          isServicePrincipal: false,
        },
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'STEP_UP_REQUIRED' }),
    );
  });

  it('returns a STEP_UP_REQUIRED code with the unchanged 401 message', async () => {
    const stale = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const error = await service
      .enforce(
        { requireRecentAuthentication: true },
        {
          sessionId: 's',
          identityId: 'i',
          assuranceLevel: AssuranceLevel.HIGH,
          authMethod: 'OIDC',
          mfaSatisfied: true,
          authenticatedAt: stale,
          identityType: 'INDIVIDUAL',
          isServicePrincipal: false,
        },
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UnauthorizedException);
    const exception = error as UnauthorizedException;
    expect(exception.getStatus()).toBe(401);
    expect(exception.message).toBe('Recent stronger authentication is required');
    expect(exception.getResponse()).toEqual({
      statusCode: 401,
      message: 'Recent stronger authentication is required',
      error: 'Unauthorized',
      code: 'STEP_UP_REQUIRED',
    });
  });
});
