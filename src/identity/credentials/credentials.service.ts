import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Credential,
  CredentialStatus,
  CredentialType,
  PrincipalKind,
  SecurityAuditEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { ActorPrincipal } from '../auth/principal.types';
import { hashSecret } from '../common/crypto.util';

export interface CreateCredentialInput {
  userAccountId?: string;
  serviceIdentityId?: string;
  type: CredentialType;
  identifier: string;
  secret?: string;
  actor?: ActorPrincipal;
  correlationId?: string;
  source?: string;
}
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CredentialStatus, CredentialType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { hashSecret } from '../common/crypto.util';
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
    private readonly audit: SecurityAuditService,
  ) {}

  async create(input: CreateCredentialInput): Promise<Credential> {
    const credential = await this.prisma.credential.create({
      data: {
        userAccountId: input.userAccountId,
        serviceIdentityId: input.serviceIdentityId,
        type: input.type,
        identifier: input.identifier,
        secretHash: input.secret ? hashSecret(input.secret) : null,
        status: CredentialStatus.ACTIVE,
    private readonly validation: IdentityValidationService,
    private readonly audit: SecurityAuditService,
  ) {}

  async create(dto: CreateCredentialDto): Promise<CredentialResponseDto> {
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
      eventType: SecurityAuditEventType.CREDENTIAL_CREATED,
      actor: input.actor ?? { kind: PrincipalKind.SYSTEM, correlationId: input.correlationId },
      subjectType: 'credential',
      subjectId: credential.id,
      correlationId: input.correlationId,
      source: input.source,
      metadata: {
        type: credential.type,
        identifier: credential.identifier,
        userAccountId: credential.userAccountId,
        serviceIdentityId: credential.serviceIdentityId,
      },
    });

    return credential;
  }

  async revoke(
    id: string,
    actor: ActorPrincipal,
    reason?: string,
    correlationId?: string,
  ): Promise<Credential> {
    const credential = await this.prisma.credential.findUnique({ where: { id } });

    if (!credential) {
      throw new NotFoundException(`Credential with id "${id}" was not found`);
    }

    const updated = await this.prisma.credential.update({
      where: { id },
      data: {
        status: CredentialStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.CREDENTIAL_REVOKED,
      actor,
      subjectType: 'credential',
      subjectId: credential.id,
      correlationId,
      reason,
    });

    return updated;
  }

  async findActivePasswordCredential(userAccountId: string): Promise<Credential | null> {
    return this.prisma.credential.findFirst({
      where: {
        userAccountId,
        type: CredentialType.PASSWORD,
        status: CredentialStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveApiKeyCredential(
    serviceIdentityId: string,
    identifier: string,
  ): Promise<Credential | null> {
    return this.prisma.credential.findFirst({
      where: {
        serviceIdentityId,
        type: CredentialType.API_KEY,
        identifier,
        status: CredentialStatus.ACTIVE,
      },
    });
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
