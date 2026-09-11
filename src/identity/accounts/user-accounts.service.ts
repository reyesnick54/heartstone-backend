import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  IdentityAccountStatus,
  PrincipalKind,
  SecurityAuditEventType,
  UserAccount,
  UserAccountKind,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { ActorPrincipal } from '../auth/principal.types';
import { PersonsService } from '../persons/persons.service';

export interface CreateUserAccountInput {
  username: string;
  displayName?: string;
  kind?: UserAccountKind;
  actor?: ActorPrincipal;
  correlationId?: string;
  source?: string;
}

@Injectable()
export class UserAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly personsService: PersonsService,
    private readonly audit: SecurityAuditService,
  ) {}

  async create(input: CreateUserAccountInput): Promise<UserAccount> {
    const person = await this.personsService.create(input.displayName);

    try {
      const account = await this.prisma.userAccount.create({
        data: {
          personId: person.id,
          username: input.username,
          kind: input.kind ?? UserAccountKind.STANDARD,
          status: IdentityAccountStatus.ACTIVE,
        },
      });

      await this.audit.record({
        eventType: SecurityAuditEventType.ACCOUNT_CREATED,
        actor: input.actor ?? { kind: PrincipalKind.SYSTEM, correlationId: input.correlationId },
        subjectType: 'user_account',
        subjectId: account.id,
        correlationId: input.correlationId,
        source: input.source,
        metadata: {
          personId: person.id,
          username: account.username,
          kind: account.kind,
        },
      });

      return account;
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          `User account with username "${input.username}" already exists`,
        );
      }

      throw error;
    }
  }

  async findById(id: string): Promise<UserAccount> {
    const account = await this.prisma.userAccount.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException(`User account with id "${id}" was not found`);
    }

    return account;
  }

  async findByUsername(username: string): Promise<UserAccount | null> {
    return this.prisma.userAccount.findUnique({ where: { username } });
  }

  async suspend(
    id: string,
    actor: ActorPrincipal,
    reason?: string,
    correlationId?: string,
  ): Promise<UserAccount> {
    const account = await this.findById(id);

    const updated = await this.prisma.userAccount.update({
      where: { id },
      data: { status: IdentityAccountStatus.SUSPENDED },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.ACCOUNT_SUSPENDED,
      actor,
      subjectType: 'user_account',
      subjectId: account.id,
      correlationId,
      reason,
    });

    return updated;
  }

  async reactivate(
    id: string,
    actor: ActorPrincipal,
    reason?: string,
    correlationId?: string,
  ): Promise<UserAccount> {
    const account = await this.findById(id);

    if (account.status === IdentityAccountStatus.DEACTIVATED) {
      throw new ConflictException('Deactivated accounts cannot be reactivated');
    }

    const updated = await this.prisma.userAccount.update({
      where: { id },
      data: { status: IdentityAccountStatus.ACTIVE },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.ACCOUNT_REACTIVATED,
      actor,
      subjectType: 'user_account',
      subjectId: account.id,
      correlationId,
      reason,
    });

    return updated;
  }
}
