import { Injectable } from '@nestjs/common';
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
