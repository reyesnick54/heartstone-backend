import { UnauthorizedException } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';

import { type PrismaService } from '../../../database/prisma.service';
import { type SecurityAuditService } from '../../audit/security-audit.service';
import { LoginLockoutService } from './login-lockout.service';

describe('LoginLockoutService', () => {
  const prisma = {
    userAccount: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const audit = { record: jest.fn() };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue({
      lockoutMaxAttempts: 3,
      lockoutDurationSeconds: 600,
    }),
  };

  const service = new LoginLockoutService(
    prisma as unknown as PrismaService,
    configService as unknown as ConfigService,
    audit as unknown as SecurityAuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks login while account is locked', async () => {
    prisma.userAccount.findUnique.mockResolvedValue({
      lockedUntil: new Date(Date.now() + 60_000),
    });

    await expect(service.assertAccountNotLocked('acc-1')).rejects.toThrow(UnauthorizedException);
  });

  it('locks account after max failed attempts', async () => {
    prisma.userAccount.update
      .mockResolvedValueOnce({ failedLoginAttempts: 3 })
      .mockResolvedValueOnce({});

    await service.recordFailedAttempt('acc-1', 'id-1');

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'ACCOUNT_LOCKED', userAccountId: 'acc-1' }),
    );
  });
});
