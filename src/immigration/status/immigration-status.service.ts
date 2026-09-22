import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { ImmigrationActorPersona, ImmigrationStatusCategory, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ImmigrationBoundaryService } from '../common/immigration-boundary.service';

export interface RecordImmigrationStatusInput {
  immigrationProfileId: string;
  statusCategory: ImmigrationStatusCategory;
  statusCode: string;
  actorIdentityId?: string;
  actorPersona: ImmigrationActorPersona;
  reason?: string;
  governmentDecisionId?: string;
  officialInstrumentId?: string;
}

@Injectable()
export class ImmigrationStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ImmigrationBoundaryService,
  ) {}

  async recordStatus(input: RecordImmigrationStatusInput) {
    this.boundary.assertTechnicalAdminCannotChangeCitizenshipStatus(
      input.actorPersona,
      input.statusCategory === ImmigrationStatusCategory.CITIZENSHIP
        ? 'CITIZENSHIP_STATUS'
        : input.statusCategory === ImmigrationStatusCategory.VISA
          ? 'VISA'
          : 'RESIDENCY',
    );

    const profile = await this.prisma.immigrationProfile.findUnique({
      where: { id: input.immigrationProfileId },
      include: { currentStatusRecord: true },
    });
    if (!profile) {
      throw new NotFoundException('Immigration profile not found');
    }

    const fromRecordId = profile.currentStatusRecordId ?? undefined;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (profile.currentStatusRecordId) {
        await tx.immigrationStatusRecord.update({
          where: { id: profile.currentStatusRecordId },
          data: {
            isCurrent: false,
            supersededAt: new Date(),
          },
        });
      }

      const toRecord = await tx.immigrationStatusRecord.create({
        data: {
          id: randomUUID(),
          immigrationProfileId: input.immigrationProfileId,
          statusCategory: input.statusCategory,
          statusCode: input.statusCode,
          isCurrent: true,
          governmentDecisionId: input.governmentDecisionId,
          officialInstrumentId: input.officialInstrumentId,
        },
      });

      await tx.immigrationStatusHistory.create({
        data: {
          id: randomUUID(),
          immigrationProfileId: input.immigrationProfileId,
          fromStatusRecordId: fromRecordId,
          toStatusRecordId: toRecord.id,
          actorIdentityId: input.actorIdentityId,
          actorPersona: input.actorPersona,
          reason: input.reason,
        },
      });

      await tx.immigrationProfile.update({
        where: { id: input.immigrationProfileId },
        data: { currentStatusRecordId: toRecord.id },
      });

      const historyCount = await tx.immigrationStatusHistory.count({
        where: { immigrationProfileId: input.immigrationProfileId },
      });

      return {
        toRecord,
        historyEntries: historyCount,
        priorRecordPreserved: Boolean(fromRecordId),
      };
    });
  }
}
