import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { IdentityType } from '@prisma/client';

import type { PrismaService } from '../../../database/prisma.service';
import type { SecurityAuditService } from '../../audit/security-audit.service';
import { hashApiKeySecret } from '../../common/crypto.util';
import { ServiceIdentityAuthService } from './service-identity-auth.service';

describe('ServiceIdentityAuthService', () => {
  const prisma = {
    identity: { findFirst: jest.fn() },
    credential: { update: jest.fn() },
  };
  const audit = { record: jest.fn() };
  const configService = {
    getOrThrow: jest
      .fn()
      .mockReturnValue({ serviceCredentialPepper: 'test-pepper-not-production' }),
  };

  const service = new ServiceIdentityAuthService(
    prisma as unknown as PrismaService,
    configService as unknown as ConfigService,
    audit as unknown as SecurityAuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects human login pathway for unknown service client', async () => {
    prisma.identity.findFirst.mockResolvedValue(null);

    await expect(service.authenticate('unknown-service', 'secret')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('authenticates service identity with valid API key', async () => {
    const secret = 'service-secret-value';
    const pepper = 'test-pepper-not-production';
    prisma.identity.findFirst.mockResolvedValue({
      id: 'svc-id',
      type: IdentityType.SERVICE,
      organizationId: null,
      credentials: [
        {
          id: 'cred-1',
          apiKeyHash: hashApiKeySecret(secret, pepper),
        },
      ],
    });
    prisma.credential.update.mockResolvedValue({});

    const result = await service.authenticate('my-service', secret);

    expect(result.identityId).toBe('svc-id');
    expect(result.serviceCode).toBe('my-service');
  });
});
