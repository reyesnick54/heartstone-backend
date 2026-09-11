import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  AuthenticationMethodType,
  IdentityType,
  SessionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AccountLookupService } from '../accounts/account-lookup.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { CREDENTIAL_VERIFIER } from '../auth/interfaces/credential-verifier.interface';
import { IdentityResolutionService } from '../auth/services/identity-resolution.service';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  let service: SessionsService;

  const mockPrisma = {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockAudit = { record: jest.fn() };
  const mockAccountLookup = {
    findByLoginIdentifier: jest.fn(),
    isAuthenticatable: jest.fn(),
  };
  const mockIdentityResolution = {
    resolveFromSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue({
              sessionTtlSeconds: 3600,
              sessionTokenBytes: 32,
              serviceCredentialPepper: 'test-pepper-not-production',
              sessionRenewalThresholdSeconds: 900,
              localPasswordAuthEnabled: true,
            }),
          },
        },
        { provide: SecurityAuditService, useValue: mockAudit },
        { provide: AccountLookupService, useValue: mockAccountLookup },
        { provide: IdentityResolutionService, useValue: mockIdentityResolution },
        { provide: CREDENTIAL_VERIFIER, useValue: [] },
      ],
    }).compile();

    service = module.get(SessionsService);
    jest.clearAllMocks();
  });

  it('rejects revoked session tokens', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({
      id: 'sess-1',
      identityId: 'id-1',
      userAccountId: 'acc-1',
      status: SessionStatus.REVOKED,
      expiresAt: new Date(Date.now() + 3600000),
      assuranceLevel: 'LOW',
      authMethod: AuthenticationMethodType.PASSWORD,
      mfaSatisfied: false,
      authenticatedAt: new Date(),
      identity: { type: IdentityType.INDIVIDUAL },
      userAccount: { status: AccountStatus.ACTIVE },
    });

    await expect(service.validateSessionToken('some-token')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects expired session tokens', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({
      id: 'sess-1',
      identityId: 'id-1',
      userAccountId: 'acc-1',
      status: SessionStatus.ACTIVE,
      expiresAt: new Date(Date.now() - 1000),
      assuranceLevel: 'LOW',
      authMethod: AuthenticationMethodType.PASSWORD,
      mfaSatisfied: false,
      authenticatedAt: new Date(),
      identity: { type: IdentityType.INDIVIDUAL },
      userAccount: { status: AccountStatus.ACTIVE },
    });
    mockPrisma.session.update.mockResolvedValue({});

    await expect(service.validateSessionToken('some-token')).rejects.toThrow(UnauthorizedException);
  });
});
