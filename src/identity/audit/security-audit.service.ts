import { Injectable } from '@nestjs/common';
import {
  PrincipalKind,
  Prisma,
  SecurityAuditEvent,
  SecurityAuditEventType,
  SecurityAuditResult,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ActorPrincipal } from '../auth/principal.types';
import { sanitizeAuditMetadata } from '../common/audit-metadata.util';

export interface RecordAuditEventInput {
  eventType: SecurityAuditEventType;
  actor?: ActorPrincipal;
  subjectType?: string;
  subjectId?: string;
  correlationId?: string;
  source?: string;
  result?: SecurityAuditResult;
  reason?: string;
  metadata?: Record<string, unknown>;
import { Prisma, SecurityAuditEvent, SecurityAuditEventType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface AuditEventInput {
  eventType: SecurityAuditEventType;
  identityId?: string;
  userAccountId?: string;
  sessionId?: string;
  actorIdentityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}

@Injectable()
export class SecurityAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditEventInput): Promise<SecurityAuditEvent> {
    const actor = input.actor;
    const actorKind =
      actor?.kind === 'USER_ACCOUNT' || actor?.kind === 'SERVICE_IDENTITY'
        ? actor.kind
        : actor?.kind === 'SYSTEM'
          ? PrincipalKind.SYSTEM
          : undefined;
    const actorId =
      actor?.kind === 'USER_ACCOUNT' || actor?.kind === 'SERVICE_IDENTITY'
        ? actor.accountId
        : undefined;

    return this.prisma.securityAuditEvent.create({
      data: {
        eventType: input.eventType,
        actorKind,
        actorId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        correlationId: input.correlationId ?? input.actor?.correlationId,
        source: input.source,
        result: input.result ?? SecurityAuditResult.SUCCESS,
        reason: input.reason,
        metadata: sanitizeAuditMetadata(input.metadata) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async listBySubject(subjectType: string, subjectId: string): Promise<SecurityAuditEvent[]> {
    return this.prisma.securityAuditEvent.findMany({
      where: {
        subjectType,
        subjectId,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listByEventType(eventType: SecurityAuditEventType): Promise<SecurityAuditEvent[]> {
    return this.prisma.securityAuditEvent.findMany({
      where: { eventType },
  async record(input: AuditEventInput): Promise<SecurityAuditEvent> {
    return this.prisma.securityAuditEvent.create({
      data: {
        eventType: input.eventType,
        identityId: input.identityId,
        userAccountId: input.userAccountId,
        sessionId: input.sessionId,
        actorIdentityId: input.actorIdentityId,
        metadata: input.metadata,
        ipAddress: input.ipAddress,
      },
    });
  }

  async findByIdentity(identityId: string): Promise<SecurityAuditEvent[]> {
    return this.prisma.securityAuditEvent.findMany({
      where: { identityId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
