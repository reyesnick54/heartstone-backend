import { ConflictException, Injectable } from '@nestjs/common';
import { LegalHoldStatus, LegalHoldTargetType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface ProtectedDeletionRequest {
  targetType: LegalHoldTargetType;
  targetReference: string;
  operation: 'DELETE' | 'HARD_REMOVE' | 'CASCADE_PURGE';
}

@Injectable()
export class ProtectedRecordDeletionGuardService {
  constructor(private readonly prisma: PrismaService) {}

  async assertDestructiveDeletionAllowed(request: ProtectedDeletionRequest): Promise<void> {
    const activeHold = await this.prisma.legalHold.findFirst({
      where: {
        status: LegalHoldStatus.ACTIVE,
        targets: {
          some: {
            targetType: request.targetType,
            targetReference: request.targetReference,
          },
        },
      },
      select: { id: true },
    });

    if (activeHold) {
      throw new ConflictException(
        `Destructive ${request.operation} blocked: active legal hold applies to ${request.targetType}:${request.targetReference}`,
      );
    }

    if (request.operation === 'CASCADE_PURGE') {
      throw new ConflictException(
        'Cascade purge is prohibited for governed records; use archival disposition workflows',
      );
    }
  }
}
