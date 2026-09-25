import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IDENTITY_CONFIG, type IdentityConfig } from '../../../config/config.constants';
import { PrismaService } from '../../../database/prisma.service';
import { SecurityAuditService } from '../../audit/security-audit.service';

@Injectable()
export class LoginLockoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly audit: SecurityAuditService,
  ) {}

  private get identityConfig(): IdentityConfig {
    return this.configService.getOrThrow<IdentityConfig>(IDENTITY_CONFIG);
  }

  async assertAccountNotLocked(userAccountId: string): Promise<void> {
    const account = await this.prisma.userAccount.findUnique({
      where: { id: userAccountId },
      select: { lockedUntil: true },
    });

    if (!account?.lockedUntil) {
      return;
    }

    if (account.lockedUntil > new Date()) {
      await this.audit.record({
        eventType: 'AUTHENTICATION_REJECTED',
        userAccountId,
        metadata: { reason: 'account_locked' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.userAccount.update({
      where: { id: userAccountId },
      data: { lockedUntil: null, failedLoginAttempts: 0 },
    });
  }

  async recordFailedAttempt(userAccountId: string, identityId?: string): Promise<void> {
    const account = await this.prisma.userAccount.update({
      where: { id: userAccountId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });

    if (account.failedLoginAttempts < this.identityConfig.lockoutMaxAttempts) {
      return;
    }

    const lockedUntil = new Date(
      Date.now() + this.identityConfig.lockoutDurationSeconds * 1000,
    );

    await this.prisma.userAccount.update({
      where: { id: userAccountId },
      data: { lockedUntil },
    });

    await this.audit.record({
      eventType: 'ACCOUNT_LOCKED',
      userAccountId,
      identityId,
      metadata: {
        failedLoginAttempts: account.failedLoginAttempts,
        lockedUntil: lockedUntil.toISOString(),
      },
    });
  }

  async resetFailedAttempts(userAccountId: string): Promise<void> {
    await this.prisma.userAccount.update({
      where: { id: userAccountId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }
}
