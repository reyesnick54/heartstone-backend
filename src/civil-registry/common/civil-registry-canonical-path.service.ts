import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

/**
 * Canonical civil registry path: VitalEvent intake → governed CivilRegistryEntry (foundation).
 * Service-pack CivilRegistryVitalRecord rows are linked projections for experience/entitlements.
 */
@Injectable()
export class CivilRegistryCanonicalPathService {
  constructor(private readonly prisma: PrismaService) {}

  async linkServicePackRecordToFoundation(input: {
    vitalRecordId: string;
    vitalEventId?: string | null;
    civilRegistryEntryId?: string | null;
  }): Promise<void> {
    if (!input.vitalEventId && !input.civilRegistryEntryId) {
      return;
    }

    await this.prisma.civilRegistryVitalRecord.update({
      where: { id: input.vitalRecordId },
      data: {
        vitalEventId: input.vitalEventId ?? undefined,
        civilRegistryEntryId: input.civilRegistryEntryId ?? undefined,
      },
    });
  }

  async syncServicePackRecordsForOfficialEntry(input: {
    civilRegistryEntryId: string;
    vitalEventId: string;
    caseId: string;
  }): Promise<void> {
    const vitalRecord = await this.prisma.civilRegistryVitalRecord.findFirst({
      where: {
        OR: [{ registrationCaseId: input.caseId }, { vitalEventId: input.vitalEventId }],
      },
      select: { id: true },
    });

    if (!vitalRecord) {
      return;
    }

    await this.linkServicePackRecordToFoundation({
      vitalRecordId: vitalRecord.id,
      vitalEventId: input.vitalEventId,
      civilRegistryEntryId: input.civilRegistryEntryId,
    });
  }

  async resolveCanonicalEntryId(vitalRecordId: string): Promise<string | null> {
    const record = await this.prisma.civilRegistryVitalRecord.findUnique({
      where: { id: vitalRecordId },
      select: { civilRegistryEntryId: true, vitalEventId: true },
    });

    if (!record) {
      return null;
    }

    if (record.civilRegistryEntryId) {
      return record.civilRegistryEntryId;
    }

    if (!record.vitalEventId) {
      return null;
    }

    const entry = await this.prisma.civilRegistryEntry.findUnique({
      where: { vitalEventId: record.vitalEventId },
      select: { id: true },
    });

    return entry?.id ?? null;
  }
}
