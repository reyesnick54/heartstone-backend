import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AccountStatus, Prisma, type UserAccount } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { IdentityValidationService } from '../common/identity-validation.service';
import { UserAccountsService } from './user-accounts.service';

describe('UserAccountsService', () => {
  let service: UserAccountsService;
  let validation: { ensurePersonExists: jest.Mock };
  let audit: { record: jest.Mock };
  let prisma: {
    userAccount: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  const sampleAccount: UserAccount = {
    id: '11111111-1111-4111-8111-111111111111',
    personId: null,
    loginIdentifier: 'jane@example.gov',
    status: AccountStatus.PENDING,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    validation = { ensurePersonExists: jest.fn() };
    audit = { record: jest.fn() };

    prisma = {
      userAccount: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAccountsService,
        { provide: PrismaService, useValue: prisma },
        { provide: IdentityValidationService, useValue: validation },
        { provide: SecurityAuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(UserAccountsService);
  });

  it('creates a user account and records audit event', async () => {
    prisma.userAccount.create.mockResolvedValue(sampleAccount);

    const result = await service.create({
      loginIdentifier: 'jane@example.gov',
      status: AccountStatus.PENDING,
    });

    expect(result).toEqual(sampleAccount);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'USER_ACCOUNT_CREATED' }),
    );
  });

  it('rejects duplicate login identifiers', async () => {
    prisma.userAccount.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.0.0',
      }),
    );

    await expect(service.create({ loginIdentifier: 'jane@example.gov' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws not found for missing accounts', async () => {
    prisma.userAccount.findUnique.mockResolvedValue(null);

    await expect(service.findOne(sampleAccount.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('activates pending accounts', async () => {
    prisma.userAccount.findUnique.mockResolvedValue(sampleAccount);
    prisma.userAccount.update.mockResolvedValue({
      ...sampleAccount,
      status: AccountStatus.ACTIVE,
    });

    const result = await service.activate(sampleAccount.id);

    expect(result.status).toBe(AccountStatus.ACTIVE);
  });

  it('rejects activating revoked accounts', async () => {
    prisma.userAccount.findUnique.mockResolvedValue({
      ...sampleAccount,
      status: AccountStatus.REVOKED,
    });

    await expect(service.activate(sampleAccount.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('suspends active accounts', async () => {
    prisma.userAccount.findUnique.mockResolvedValue({
      ...sampleAccount,
      status: AccountStatus.ACTIVE,
    });
    prisma.userAccount.update.mockResolvedValue({
      ...sampleAccount,
      status: AccountStatus.SUSPENDED,
    });

    const result = await service.suspend(sampleAccount.id);

    expect(result.status).toBe(AccountStatus.SUSPENDED);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'USER_ACCOUNT_SUSPENDED' }),
    );
  });
});
