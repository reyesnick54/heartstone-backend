import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, Prisma, UserAccount } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { IdentityValidationService } from '../common/identity-validation.service';
import { assertNotTerminal, assertStatusTransition } from '../common/lifecycle-transition.util';
import { CreateUserAccountDto } from './dto/create-user-account.dto';
import { QueryUserAccountsDto } from './dto/query-user-accounts.dto';
import { UpdateUserAccountDto } from './dto/update-user-account.dto';

const TERMINAL_STATUSES: AccountStatus[] = [AccountStatus.REVOKED];

@Injectable()
export class UserAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IdentityValidationService,
    private readonly audit: SecurityAuditService,
  ) {}

  async create(dto: CreateUserAccountDto): Promise<UserAccount> {
    if (dto.personId) {
      await this.validation.ensurePersonExists(dto.personId);
    }

    try {
      const account = await this.prisma.userAccount.create({
        data: {
          loginIdentifier: dto.loginIdentifier,
          personId: dto.personId,
          status: dto.status,
        },
      });

      await this.audit.record({
        eventType: 'USER_ACCOUNT_CREATED',
        userAccountId: account.id,
        metadata: { loginIdentifier: account.loginIdentifier },
      });

      return account;
    } catch (error) {
      this.handleWriteError(error, dto.loginIdentifier);
    }
  }

  async findAll(query: QueryUserAccountsDto): Promise<UserAccount[]> {
    const where: Prisma.UserAccountWhereInput = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.personId !== undefined) {
      where.personId = query.personId;
    }

    return this.prisma.userAccount.findMany({
      where,
      orderBy: [{ loginIdentifier: 'asc' }],
    });
  }

  async findOne(id: string): Promise<UserAccount> {
    const account = await this.prisma.userAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException(`User account with id "${id}" was not found`);
    }
    return account;
  }

  async update(id: string, dto: UpdateUserAccountDto): Promise<UserAccount> {
    const account = await this.findOne(id);
    assertNotTerminal(account.status, TERMINAL_STATUSES, 'User account');

    if (dto.personId) {
      await this.validation.ensurePersonExists(dto.personId);
    }

    try {
      return await this.prisma.userAccount.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async activate(id: string): Promise<UserAccount> {
    const account = await this.findOne(id);
    assertStatusTransition(
      account.status,
      [AccountStatus.PENDING, AccountStatus.SUSPENDED],
      AccountStatus.ACTIVE,
      'user account',
    );

    return this.prisma.userAccount.update({
      where: { id },
      data: { status: AccountStatus.ACTIVE },
    });
  }

  async suspend(id: string): Promise<UserAccount> {
    const account = await this.findOne(id);
    assertStatusTransition(
      account.status,
      [AccountStatus.ACTIVE],
      AccountStatus.SUSPENDED,
      'user account',
    );

    const suspended = await this.prisma.userAccount.update({
      where: { id },
      data: { status: AccountStatus.SUSPENDED },
    });

    await this.audit.record({
      eventType: 'USER_ACCOUNT_SUSPENDED',
      userAccountId: id,
    });

    return suspended;
  }

  async revoke(id: string): Promise<UserAccount> {
    const account = await this.findOne(id);
    assertNotTerminal(account.status, TERMINAL_STATUSES, 'User account');

    return this.prisma.userAccount.update({
      where: { id },
      data: { status: AccountStatus.REVOKED },
    });
  }

  private handleWriteError(error: unknown, loginIdentifier?: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        loginIdentifier
          ? `User account with login identifier "${loginIdentifier}" already exists`
          : 'User account with the same login identifier already exists',
      );
    }
    throw error;
  }
}
