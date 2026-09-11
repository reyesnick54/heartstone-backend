import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthSession,
  AuthSessionStatus,
  PrincipalKind,
  SecurityAuditEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { ActorPrincipal } from '../auth/principal.types';
import { generateSessionToken, hashToken } from '../common/crypto.util';

const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export interface CreateSessionInput {
  userAccountId?: string;
  serviceIdentityId?: string;
  correlationId?: string;
  source?: string;
  actor?: ActorPrincipal;
  ttlMs?: number;
}

export interface SessionWithToken {
  session: AuthSession;
  token: string;
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
  ) {}

  async create(input: CreateSessionInput): Promise<SessionWithToken> {
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + (input.ttlMs ?? DEFAULT_SESSION_TTL_MS));

    const session = await this.prisma.authSession.create({
      data: {
        userAccountId: input.userAccountId,
        serviceIdentityId: input.serviceIdentityId,
        tokenHash: hashToken(token),
        status: AuthSessionStatus.ACTIVE,
        expiresAt,
        correlationId: input.correlationId,
      },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.SESSION_CREATED,
      actor: input.actor ?? { kind: PrincipalKind.SYSTEM, correlationId: input.correlationId },
      subjectType: 'auth_session',
      subjectId: session.id,
      correlationId: input.correlationId,
      source: input.source,
      metadata: {
        userAccountId: session.userAccountId,
        serviceIdentityId: session.serviceIdentityId,
        expiresAt: session.expiresAt.toISOString(),
      },
    });

    return { session, token };
  }

  async findActiveByToken(token: string): Promise<AuthSession | null> {
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!session) {
      return null;
    }

    if (session.status !== AuthSessionStatus.ACTIVE) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { status: AuthSessionStatus.EXPIRED },
      });
      return null;
    }

    return session;
  }

  async revoke(
    id: string,
    actor: ActorPrincipal,
    reason?: string,
    correlationId?: string,
  ): Promise<AuthSession> {
    const session = await this.prisma.authSession.findUnique({ where: { id } });

    if (!session) {
      throw new NotFoundException(`Session with id "${id}" was not found`);
    }

    const updated = await this.prisma.authSession.update({
      where: { id },
      data: {
        status: AuthSessionStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.SESSION_REVOKED,
      actor,
      subjectType: 'auth_session',
      subjectId: session.id,
      correlationId,
      reason,
    });

    return updated;
  }
}
