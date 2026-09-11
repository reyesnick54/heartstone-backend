import { Injectable, NotFoundException } from '@nestjs/common';
import { Identity } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { IdentityValidationService } from '../common/identity-validation.service';
import { CreateIdentityDto } from './dto/create-identity.dto';

@Injectable()
export class IdentitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IdentityValidationService,
    private readonly audit: SecurityAuditService,
  ) {}

  async create(dto: CreateIdentityDto): Promise<Identity> {
    this.validation.validateIdentityTypeConsistency(dto.type, {
      personId: dto.personId,
      organizationId: dto.organizationId,
      userAccountId: dto.userAccountId,
    });

    if (dto.userAccountId) {
      await this.validation.ensureUserAccountExists(dto.userAccountId);
    }
    if (dto.personId) {
      await this.validation.ensurePersonExists(dto.personId);
    }
    if (dto.organizationId) {
      await this.validation.ensureOrganizationExists(dto.organizationId);
    }

    const identity = await this.prisma.identity.create({
      data: {
        type: dto.type,
        displayName: dto.displayName,
        userAccountId: dto.userAccountId,
        personId: dto.personId,
        organizationId: dto.organizationId,
      },
    });

    await this.audit.record({
      eventType: 'IDENTITY_CREATED',
      identityId: identity.id,
      userAccountId: dto.userAccountId,
      metadata: { type: identity.type },
    });

    return identity;
  }

  async findOne(id: string): Promise<Identity> {
    const identity = await this.prisma.identity.findUnique({ where: { id } });
    if (!identity) {
      throw new NotFoundException(`Identity with id "${id}" was not found`);
    }
    return identity;
  }
}
