import { Injectable } from '@nestjs/common';
import { ReleaseRevalidationTriggerType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReleaseRevalidationService {
  constructor(private readonly prisma: PrismaService) {}

  async recordTrigger(input: {
    triggerType: ReleaseRevalidationTriggerType;
    sourceRecordType: string;
    sourceRecordId: string;
    reason: string;
    releaseDefinitionId?: string;
  }) {
    return this.prisma.releaseRevalidationTrigger.create({
      data: {
        triggerType: input.triggerType,
        sourceRecordType: input.sourceRecordType,
        sourceRecordId: input.sourceRecordId,
        reason: input.reason,
        releaseDefinitionId: input.releaseDefinitionId,
        revalidationRequired: true,
      },
    });
  }
}
