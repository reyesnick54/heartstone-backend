import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { AccountStatus, SessionStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  let service: SessionsService;

  const mockPrisma = {
    userAccount: { findUnique: jest.fn(), update: jest.fn() },
    credential: { update: jest.fn() },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAudit = { record: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest
              .fn()
              .mockReturnValue({ sessionTtlSeconds: 3600, sessionTokenBytes: 32 }),
          },
        },
        { provide: SecurityAuditService, useValue: mockAudit },
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
      userAccount: { status: AccountStatus.ACTIVE },
    });
    mockPrisma.session.update.mockResolvedValue({});

    await expect(service.validateSessionToken('some-token')).rejects.toThrow(UnauthorizedException);
  });
});
