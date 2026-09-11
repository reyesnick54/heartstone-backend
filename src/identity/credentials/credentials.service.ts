import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Credential, CredentialStatus, CredentialType } from '@prisma/client';
import { CredentialStatus, CredentialType } from '@prisma/client';

import { IDENTITY_CONFIG, type IdentityConfig } from '../../config/config.constants';
import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { hashApiKeySecret, hashSecret } from '../common/crypto.util';
import { IdentityValidationService } from '../common/identity-validation.service';
import { assertNotTerminal, assertStatusTransition } from '../common/lifecycle-transition.util';
import { toCredentialResponse } from './credential-response.mapper';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { CredentialResponseDto } from './dto/credential-response.dto';
import { QueryCredentialsDto } from './dto/query-credentials.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';

const TERMINAL_STATUSES: CredentialStatus[] = [CredentialStatus.REVOKED];

@Injectable()
export class CredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IdentityValidationService,
    private readonly audit: SecurityAuditService,
    private readonly configService: ConfigService,
  ) {}

  private get identityConfig(): IdentityConfig {
    return this.configService.getOrThrow<IdentityConfig>(IDENTITY_CONFIG);
  }

  async create(dto: CreateCredentialDto): Promise<Credential> {
  async create(dto: CreateCredentialDto): Promise<CredentialResponseDto> {
    await this.validation.ensureIdentityExists(dto.identityId);

    let secretHash: string | undefined;
    let apiKeyHash: string | undefined;

    if (dto.type === CredentialType.PASSWORD) {
      if (!dto.password) {
        throw new BadRequestException('Password is required for PASSWORD credential type');
      }
      secretHash = await hashSecret(dto.password);
    }

    if (dto.type === CredentialType.API_KEY) {
      if (!dto.apiKey) {
        throw new BadRequestException('API key is required for API_KEY credential type');
      }
      apiKeyHash = hashApiKeySecret(dto.apiKey, this.identityConfig.serviceCredentialPepper);
    }

    if (dto.type === CredentialType.OIDC) {
      if (!dto.oidcProvider || !dto.oidcSubject) {
        throw new BadRequestException(
          'oidcProvider and oidcSubject are required for OIDC credential type',
        );
      }
    }

    const credential = await this.prisma.credential.create({
      data: {
        identityId: dto.identityId,
        type: dto.type,
        status: dto.status ?? CredentialStatus.ACTIVE,
        secretHash,
        apiKeyHash,
        oidcProvider: dto.oidcProvider,
        oidcSubject: dto.oidcSubject,
      },
    });

    await this.audit.record({
      eventType: 'CREDENTIAL_CREATED',
      identityId: dto.identityId,
      metadata: { credentialId: credential.id, type: credential.type },
    });

    return toCredentialResponse(credential);
  }

  async findAll(query: QueryCredentialsDto): Promise<CredentialResponseDto[]> {
    const credentials = await this.prisma.credential.findMany({
      where: {
        identityId: query.identityId,
        type: query.type,
        status: query.status,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return credentials.map(toCredentialResponse);
  }

  async findOne(id: string): Promise<CredentialResponseDto> {
    const credential = await this.prisma.credential.findUnique({ where: { id } });
    if (!credential) {
      throw new NotFoundException(`Credential with id "${id}" was not found`);
    }
    return toCredentialResponse(credential);
  }

  async update(id: string, dto: UpdateCredentialDto): Promise<CredentialResponseDto> {
    const credential = await this.prisma.credential.findUnique({ where: { id } });
    if (!credential) {
      throw new NotFoundException(`Credential with id "${id}" was not found`);
    }
    assertNotTerminal(credential.status, TERMINAL_STATUSES, 'Credential');

    const updated = await this.prisma.credential.update({ where: { id }, data: dto });
    return toCredentialResponse(updated);
  }

  async activate(id: string): Promise<CredentialResponseDto> {
    const credential = await this.prisma.credential.findUnique({ where: { id } });
    if (!credential) {
      throw new NotFoundException(`Credential with id "${id}" was not found`);
    }
    assertStatusTransition(
      credential.status,
      [CredentialStatus.PENDING],
      CredentialStatus.ACTIVE,
      'credential',
    );

    const updated = await this.prisma.credential.update({
      where: { id },
      data: { status: CredentialStatus.ACTIVE },
    });
    return toCredentialResponse(updated);
  }

  async suspend(id: string): Promise<CredentialResponseDto> {
    const credential = await this.prisma.credential.findUnique({ where: { id } });
    if (!credential) {
      throw new NotFoundException(`Credential with id "${id}" was not found`);
    }
    assertStatusTransition(
      credential.status,
      [CredentialStatus.ACTIVE],
      CredentialStatus.PENDING,
      'credential',
    );

    const updated = await this.prisma.credential.update({
      where: { id },
      data: { status: CredentialStatus.PENDING },
    });
    return toCredentialResponse(updated);
  }

  async revoke(id: string): Promise<CredentialResponseDto> {
    const credential = await this.prisma.credential.findUnique({ where: { id } });
    if (!credential) {
      throw new NotFoundException(`Credential with id "${id}" was not found`);
    }
    assertNotTerminal(credential.status, TERMINAL_STATUSES, 'Credential');

    const revoked = await this.prisma.credential.update({
      where: { id },
      data: { status: CredentialStatus.REVOKED, revokedAt: new Date() },
    });

    await this.audit.record({
      eventType: 'CREDENTIAL_REVOKED',
      identityId: credential.identityId,
      metadata: { credentialId: id },
    });

    return toCredentialResponse(revoked);
  }
}
