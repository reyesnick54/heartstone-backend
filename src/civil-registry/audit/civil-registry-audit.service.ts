import { Injectable } from '@nestjs/common';
import { CivilRegistryAuditEventType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CivilRegistryAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    vitalEventId?: string;
    civilRegistryEntryId?: string;
    eventType: CivilRegistryAuditEventType;
    actorIdentityId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.civilRegistryAuditEvent.create({
      data: {
        vitalEventId: input.vitalEventId,
        civilRegistryEntryId: input.civilRegistryEntryId,
        eventType: input.eventType,
        actorIdentityId: input.actorIdentityId,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
