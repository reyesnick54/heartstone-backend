import { Injectable } from '@nestjs/common';
import { Prisma, SecurityAuditEvent, SecurityAuditEventType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface AuthorityAuditEventInput {
  eventType: SecurityAuditEventType;
  actorIdentityId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuthorityAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuthorityAuditEventInput): Promise<SecurityAuditEvent> {
    return this.prisma.securityAuditEvent.create({
      data: {
        eventType: input.eventType,
        actorIdentityId: input.actorIdentityId,
        metadata: input.metadata,
      },
    });
  }
}
