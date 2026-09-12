import { Injectable } from '@nestjs/common';
import { CaseStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CasePublicStatusService } from '../public-status/case-public-status.service';

@Injectable()
export class CaseStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicStatus: CasePublicStatusService,
  ) {}

  async transition(
    caseId: string,
    toStatus: CaseStatus,
    reason?: string,
    actorIdentityId?: string,
  ) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      return null;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.caseStatusHistory.create({
        data: {
          caseId,
          fromStatus: caseRecord.caseStatus,
          toStatus,
          reason,
          actorIdentityId,
        },
      });

      return tx.case.update({
        where: { id: caseId, version: caseRecord.version },
        data: { caseStatus: toStatus, version: { increment: 1 } },
      });
    });

    await this.publicStatus.project(caseId, toStatus);
    return updated;
  }
}
