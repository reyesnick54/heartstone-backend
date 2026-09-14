import { Injectable } from '@nestjs/common';
import {
  InstrumentDeliveryAuditEvent,
  InstrumentDeliveryAuditEventType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface RecordInstrumentDeliveryAuditInput {
  officialInstrumentId: string;
  instrumentVersionId?: string;
  instrumentDeliveryId?: string;
  eventType: InstrumentDeliveryAuditEventType;
  actorIdentityId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class InstrumentDeliveryAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordInstrumentDeliveryAuditInput): Promise<InstrumentDeliveryAuditEvent> {
    return this.prisma.instrumentDeliveryAuditEvent.create({
      data: {
        officialInstrumentId: input.officialInstrumentId,
        instrumentVersionId: input.instrumentVersionId,
        instrumentDeliveryId: input.instrumentDeliveryId,
        eventType: input.eventType,
        actorIdentityId: input.actorIdentityId,
        metadata: input.metadata ?? {},
      },
    });
  }
}
