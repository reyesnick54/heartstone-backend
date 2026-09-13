import { Injectable, NotFoundException } from '@nestjs/common';
import { ContinuingObligationStatus, ObligationScheduleFrequency } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateContinuingObligationInput {
  complianceMatterId: string;
  officialInstrumentId?: string;
  description: string;
  obligationType: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  sourceReference?: string;
  schedule?: {
    frequency: ObligationScheduleFrequency;
    nextDueAt: Date;
    reminderDaysBefore?: number;
  };
}

@Injectable()
export class ContinuingObligationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateContinuingObligationInput) {
    await this.assertMatterExists(input.complianceMatterId);

    return this.prisma.continuingObligation.create({
      data: {
        complianceMatterId: input.complianceMatterId,
        officialInstrumentId: input.officialInstrumentId,
        description: input.description,
        obligationType: input.obligationType,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        sourceReference: input.sourceReference,
        status: ContinuingObligationStatus.ACTIVE,
        schedules: input.schedule
          ? {
              create: {
                frequency: input.schedule.frequency,
                nextDueAt: input.schedule.nextDueAt,
                reminderDaysBefore: input.schedule.reminderDaysBefore,
              },
            }
          : undefined,
      },
      include: { schedules: true },
    });
  }

  async markSatisfied(id: string) {
    return this.prisma.continuingObligation.update({
      where: { id },
      data: { status: ContinuingObligationStatus.SATISFIED },
    });
  }

  private async assertMatterExists(complianceMatterId: string) {
    const matter = await this.prisma.complianceMatter.findUnique({
      where: { id: complianceMatterId },
    });
    if (!matter) {
      throw new NotFoundException(`Compliance matter "${complianceMatterId}" was not found`);
    }
  }
}
