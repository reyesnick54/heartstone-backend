import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, IdentityType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class IdentityValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensurePersonExists(personId: string): Promise<void> {
    const person = await this.prisma.person.findUnique({ where: { id: personId } });
    if (!person) {
      throw new NotFoundException(`Person with id "${personId}" was not found`);
    }
  }

  async ensureUserAccountExists(userAccountId: string): Promise<void> {
    const account = await this.prisma.userAccount.findUnique({ where: { id: userAccountId } });
    if (!account) {
      throw new NotFoundException(`User account with id "${userAccountId}" was not found`);
    }
  }

  async ensureActiveUserAccount(userAccountId: string): Promise<void> {
    const account = await this.prisma.userAccount.findUnique({ where: { id: userAccountId } });
    if (!account) {
      throw new NotFoundException(`User account with id "${userAccountId}" was not found`);
    }
    if (account.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(`User account is not active (status: ${account.status})`);
    }
  }

  async ensureIdentityExists(identityId: string): Promise<void> {
    const identity = await this.prisma.identity.findUnique({ where: { id: identityId } });
    if (!identity) {
      throw new NotFoundException(`Identity with id "${identityId}" was not found`);
    }
  }

  async ensureOrganizationExists(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      throw new NotFoundException(`Organization with id "${organizationId}" was not found`);
    }
  }

  async ensureOfficeholderExists(officeholderId: string): Promise<void> {
    const officeholder = await this.prisma.officeholder.findUnique({
      where: { id: officeholderId },
    });
    if (!officeholder) {
      throw new NotFoundException(`Officeholder with id "${officeholderId}" was not found`);
    }
  }

  validateIdentityTypeConsistency(
    type: IdentityType,
    refs: { personId?: string; organizationId?: string; userAccountId?: string },
  ): void {
    if (type === IdentityType.INDIVIDUAL && !refs.personId && !refs.userAccountId) {
      throw new BadRequestException(
        'Individual identity requires a person or user account reference',
      );
    }
    if (type === IdentityType.ORGANIZATION && !refs.organizationId) {
      throw new BadRequestException('Organization identity requires an organization reference');
    }
  }
}
