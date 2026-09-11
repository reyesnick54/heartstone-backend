import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Credential, CredentialStatus, CredentialType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { hashSecret } from '../common/crypto.util';
import { IdentityValidationService } from '../common/identity-validation.service';
import { CreateCredentialDto } from './dto/create-credential.dto';

@Injectable()
export class CredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IdentityValidationService,
    private readonly audit: SecurityAuditService,
  ) {}

  async create(dto: CreateCredentialDto): Promise<Credential> {
    await this.validation.ensureIdentityExists(dto.identityId);

    let secretHash: string | undefined;
    if (dto.type === CredentialType.PASSWORD) {
      if (!dto.password) {
        throw new BadRequestException('Password is required for PASSWORD credential type');
      }
      secretHash = await hashSecret(dto.password);
    }

    const credential = await this.prisma.credential.create({
      data: {
        identityId: dto.identityId,
        type: dto.type,
        status: dto.status ?? CredentialStatus.ACTIVE,
        secretHash,
        oidcProvider: dto.oidcProvider,
        oidcSubject: dto.oidcSubject,
      },
    });

    await this.audit.record({
      eventType: 'CREDENTIAL_CREATED',
      identityId: dto.identityId,
      metadata: { credentialId: credential.id, type: credential.type },
    });

    return credential;
  }

  async revoke(id: string): Promise<Credential> {
    const credential = await this.prisma.credential.findUnique({ where: { id } });
    if (!credential) {
      throw new NotFoundException(`Credential with id "${id}" was not found`);
    }

    const revoked = await this.prisma.credential.update({
      where: { id },
      data: { status: CredentialStatus.REVOKED, revokedAt: new Date() },
    });

    await this.audit.record({
      eventType: 'CREDENTIAL_REVOKED',
      identityId: credential.identityId,
      metadata: { credentialId: id },
    });

    return revoked;
  }
}
