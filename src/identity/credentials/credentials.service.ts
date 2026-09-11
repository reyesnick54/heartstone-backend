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
  }
}
