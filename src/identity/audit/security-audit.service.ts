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
      orderBy: { createdAt: 'asc' },
    });
  }
}
