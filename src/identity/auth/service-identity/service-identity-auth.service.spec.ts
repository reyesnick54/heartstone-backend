import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { CredentialStatus, CredentialType, IdentityType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { SecurityAuditService } from '../../audit/security-audit.service';
import { hashApiKeySecret } from '../../common/crypto.util';
import { ServiceIdentityAuthService } from './service-identity-auth.service';

describe('ServiceIdentityAuthService', () => {
  let service: ServiceIdentityAuthService;
  const pepper = 'test-pepper-not-production';

  const mockPrisma = {
    identity: { findFirst: jest.fn() },
    credential: { update: jest.fn() },
  };
  const mockAudit = { record: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ServiceIdentityAuthService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue({ serviceCredentialPepper: pepper }),
          },
        },
        { provide: SecurityAuditService, useValue: mockAudit },
      ],
    }).compile();

    service = moduleRef.get(ServiceIdentityAuthService);
    jest.clearAllMocks();
  });

  it('authenticates a valid service identity', async () => {
    const secret = 'svc-secret-value-12345';
    mockPrisma.identity.findFirst.mockResolvedValue({
      id: 'svc-identity',
      type: IdentityType.SERVICE,
      displayName: 'batch-processor',
      organizationId: null,
      credentials: [
        {
          id: 'cred-1',
          type: CredentialType.API_KEY,
          status: CredentialStatus.ACTIVE,
          apiKeyHash: hashApiKeySecret(secret, pepper),
        },
      ],
    });
    mockPrisma.credential.update.mockResolvedValue({});

    const result = await service.authenticate('batch-processor', secret);

    expect(result.identityId).toBe('svc-identity');
    expect(result.serviceCode).toBe('batch-processor');
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'SERVICE_IDENTITY_AUTHENTICATED' }),
    );
  });

  it('rejects revoked service credential', async () => {
    mockPrisma.identity.findFirst.mockResolvedValue({
      id: 'svc-identity',
      type: IdentityType.SERVICE,
      displayName: 'batch-processor',
      organizationId: null,
      credentials: [
        {
          id: 'cred-1',
          type: CredentialType.API_KEY,
          status: CredentialStatus.ACTIVE,
          apiKeyHash: hashApiKeySecret('old-secret', pepper),
        },
      ],
    });

    await expect(service.authenticate('batch-processor', 'wrong-secret')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
