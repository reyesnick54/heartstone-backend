import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type RecordRetentionAssignment,
  type RetentionSchedule,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateRetentionScheduleInput {
  scheduleCode: string;
  name: string;
  description?: string;
  institutionId?: string;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
}

export interface AssignRetentionInput {
  retentionRuleId: string;
  masterAdministrativeFileId?: string;
  documentRecordId?: string;
  evidenceRecordId?: string;
  reviewDueAt?: Date;
  dispositionDueAt?: Date;
}

@Injectable()
export class RetentionScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async createSchedule(input: CreateRetentionScheduleInput): Promise<RetentionSchedule> {
    return this.prisma.retentionSchedule.create({
      data: {
        scheduleCode: input.scheduleCode,
        name: input.name,
        description: input.description,
        institutionId: input.institutionId,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
      },
    });
  }

  async assignRetention(input: AssignRetentionInput): Promise<RecordRetentionAssignment> {
    const rule = await this.prisma.retentionRule.findUnique({
      where: { id: input.retentionRuleId },
    });

    if (!rule) {
      throw new NotFoundException(`Retention rule "${input.retentionRuleId}" was not found`);
    }

    return this.prisma.recordRetentionAssignment.create({
      data: {
        retentionRuleId: rule.id,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        documentRecordId: input.documentRecordId,
        evidenceRecordId: input.evidenceRecordId,
        reviewDueAt: input.reviewDueAt,
        dispositionDueAt: input.dispositionDueAt,
      },
    });
  }

  async findScheduleByCode(scheduleCode: string): Promise<RetentionSchedule> {
    const schedule = await this.prisma.retentionSchedule.findUnique({
      where: { scheduleCode },
      include: { rules: true },
    });

    if (!schedule) {
      throw new NotFoundException(`Retention schedule "${scheduleCode}" was not found`);
    }

    return schedule;
  }
}
