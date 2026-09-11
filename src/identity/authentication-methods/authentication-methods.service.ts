import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticationMethod, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { IdentityValidationService } from '../common/identity-validation.service';
import { CreateAuthenticationMethodDto } from './dto/create-authentication-method.dto';
import { QueryAuthenticationMethodsDto } from './dto/query-authentication-methods.dto';
import { UpdateAuthenticationMethodDto } from './dto/update-authentication-method.dto';

@Injectable()
export class AuthenticationMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IdentityValidationService,
    private readonly audit: SecurityAuditService,
  ) {}

  async create(dto: CreateAuthenticationMethodDto): Promise<AuthenticationMethod> {
    await this.validation.ensureIdentityExists(dto.identityId);

    const method = await this.prisma.authenticationMethod.create({
      data: {
        identityId: dto.identityId,
        type: dto.type,
        isEnabled: dto.isEnabled ?? true,
        assuranceLevel: dto.assuranceLevel,
        oidcIssuer: dto.oidcIssuer,
        oidcClientId: dto.oidcClientId,
        oidcAudience: dto.oidcAudience,
      },
    });

    await this.audit.record({
      eventType: 'AUTHENTICATION_METHOD_CONFIGURED',
      identityId: dto.identityId,
      metadata: { methodId: method.id, type: method.type },
    });

    return method;
  }

  async findAll(query: QueryAuthenticationMethodsDto): Promise<AuthenticationMethod[]> {
    const where: Prisma.AuthenticationMethodWhereInput = {};

    if (query.identityId !== undefined) {
      where.identityId = query.identityId;
    }
    if (query.type !== undefined) {
      where.type = query.type;
    }
    if (query.isEnabled !== undefined) {
      where.isEnabled = query.isEnabled;
    }

    return this.prisma.authenticationMethod.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findOne(id: string): Promise<AuthenticationMethod> {
    const method = await this.prisma.authenticationMethod.findUnique({ where: { id } });
    if (!method) {
      throw new NotFoundException(`Authentication method with id "${id}" was not found`);
    }
    return method;
  }

  async update(id: string, dto: UpdateAuthenticationMethodDto): Promise<AuthenticationMethod> {
    await this.findOne(id);
    return this.prisma.authenticationMethod.update({ where: { id }, data: dto });
  }

  async activate(id: string): Promise<AuthenticationMethod> {
    await this.findOne(id);
    return this.prisma.authenticationMethod.update({
      where: { id },
      data: { isEnabled: true },
    });
  }

  async suspend(id: string): Promise<AuthenticationMethod> {
    await this.findOne(id);
    return this.prisma.authenticationMethod.update({
      where: { id },
      data: { isEnabled: false },
    });
  }
}
