import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserAccount } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { IdentityValidationService } from '../common/identity-validation.service';
import { CreateUserAccountDto } from './dto/create-user-account.dto';

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

  async findOne(id: string): Promise<UserAccount> {
    const account = await this.prisma.userAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException(`User account with id "${id}" was not found`);
    }
    return account;
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
