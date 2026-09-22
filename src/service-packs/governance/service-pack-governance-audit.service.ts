import { Injectable } from '@nestjs/common';
import { type Prisma, type ServicePackGovernanceAuditEventType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface RecordGovernanceAuditInput {
  servicePackId: string;
  servicePackVersionId?: string;
  reviewId?: string;
  eventType: ServicePackGovernanceAuditEventType;
  actorIdentityId: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ServicePackGovernanceAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordGovernanceAuditInput, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.servicePackGovernanceAuditRecord.create({
      data: {
        servicePackId: input.servicePackId,
        servicePackVersionId: input.servicePackVersionId,
        reviewId: input.reviewId,
        eventType: input.eventType,
        actorIdentityId: input.actorIdentityId,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
