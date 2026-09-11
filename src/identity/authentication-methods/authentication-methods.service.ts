import { Injectable } from '@nestjs/common';
import { AuthenticationMethod } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { IdentityValidationService } from '../common/identity-validation.service';
import { CreateAuthenticationMethodDto } from './dto/create-authentication-method.dto';

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
}
