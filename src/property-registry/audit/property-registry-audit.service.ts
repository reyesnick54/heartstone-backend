import { Injectable } from '@nestjs/common';
import { Prisma, PropertyRegistryAuditEventType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PropertyRegistryAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    propertyRegistryEntryId?: string;
    propertyTransferId?: string;
    eventType: PropertyRegistryAuditEventType;
    actorIdentityId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.propertyRegistryAuditEvent.create({
      data: {
        propertyRegistryEntryId: input.propertyRegistryEntryId,
        propertyTransferId: input.propertyTransferId,
        eventType: input.eventType,
        actorIdentityId: input.actorIdentityId,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
