import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LegalHoldTargetType,
  Prisma,
  RetentionDurationUnit,
  RetentionScheduleStatus,
  RetentionTriggerType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { buildScheduleSnapshot } from '../common/records-hash.util';

export interface CreateRetentionScheduleInput {
  code: string;
  name: string;
  recordsClassificationId: string;
  triggerType: RetentionTriggerType;
  triggerConfiguration?: Record<string, unknown>;
  retentionDurationValue?: number;
  retentionDurationUnit?: RetentionDurationUnit;
  governingSourceId: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  reviewAt?: Date;
  rules?: {
    label: string;
    triggerType: RetentionTriggerType;
    triggerConfiguration?: Record<string, unknown>;
    durationValue?: number;
    durationUnit?: RetentionDurationUnit;
  }[];
}

export interface ApproveRetentionScheduleInput {
  approvedByIdentityId: string;
  approvedAt?: Date;
}

@Injectable()
export class RetentionSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRetentionScheduleInput) {
    const classification = await this.prisma.recordsClassification.findUnique({
      where: { id: input.recordsClassificationId },
    });
    if (!classification) {
      throw new NotFoundException(
        `RecordsClassification "${input.recordsClassificationId}" was not found`,
      );
    }

    const source = await this.prisma.governingSource.findUnique({
      where: { id: input.governingSourceId },
    });
    if (!source) {
      throw new NotFoundException(`GoverningSource "${input.governingSourceId}" was not found`);
    }

    const latest = await this.prisma.retentionSchedule.findFirst({
      where: { code: input.code },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (latest?.versionNumber ?? 0) + 1;
    const scheduleSnapshotHash = buildScheduleSnapshot({
      code: input.code,
      versionNumber,
      triggerType: input.triggerType,
      triggerConfiguration: input.triggerConfiguration ?? {},
      retentionDurationValue: input.retentionDurationValue,
      retentionDurationUnit: input.retentionDurationUnit,
      governingSourceId: input.governingSourceId,
    });

    return this.prisma.retentionSchedule.create({
      data: {
        code: input.code,
        name: input.name,
        recordsClassificationId: input.recordsClassificationId,
        versionNumber,
        triggerType: input.triggerType,
        triggerConfiguration: (input.triggerConfiguration ?? {}) as Prisma.InputJsonValue,
        retentionDurationValue: input.retentionDurationValue,
        retentionDurationUnit: input.retentionDurationUnit,
        governingSourceId: input.governingSourceId,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        reviewAt: input.reviewAt,
        scheduleSnapshotHash,
        status: RetentionScheduleStatus.DRAFT,
        rules: input.rules
          ? {
              create: input.rules.map((rule, index) => ({
                ruleOrder: index + 1,
                label: rule.label,
                triggerType: rule.triggerType,
                triggerConfiguration: (rule.triggerConfiguration ?? {}) as Prisma.InputJsonValue,
                durationValue: rule.durationValue,
                durationUnit: rule.durationUnit,
              })),
            }
          : undefined,
      },
      include: { rules: true },
    });
  }

  async approve(id: string, input: ApproveRetentionScheduleInput) {
    const schedule = await this.prisma.retentionSchedule.findUnique({ where: { id } });
    if (!schedule) {
      throw new NotFoundException(`RetentionSchedule "${id}" was not found`);
    }
    if (schedule.status !== RetentionScheduleStatus.DRAFT) {
      throw new BadRequestException('Only draft retention schedules can be approved');
    }

    return this.prisma.retentionSchedule.update({
      where: { id },
      data: {
        status: RetentionScheduleStatus.ACTIVE,
        approvedByIdentityId: input.approvedByIdentityId,
        approvedAt: input.approvedAt ?? new Date(),
      },
      include: { rules: true },
    });
  }

  async supersede(id: string, successorId: string) {
    const [current, successor] = await Promise.all([
      this.prisma.retentionSchedule.findUnique({ where: { id } }),
      this.prisma.retentionSchedule.findUnique({ where: { id: successorId } }),
    ]);
    if (!current || !successor) {
      throw new NotFoundException('Retention schedule or successor was not found');
    }
    if (current.code !== successor.code) {
      throw new BadRequestException('Successor schedule must share the same schedule code');
    }

    await this.prisma.retentionSchedule.update({
      where: { id },
      data: {
        status: RetentionScheduleStatus.SUPERSEDED,
        supersededByScheduleId: successorId,
      },
    });

    return this.prisma.retentionSchedule.findUnique({
      where: { id },
      include: { rules: true, supersededBySchedule: true },
    });
  }

  async getVersionHistory(code: string) {
    return this.prisma.retentionSchedule.findMany({
      where: { code },
      orderBy: { versionNumber: 'asc' },
      include: { rules: true, supersededBySchedule: true },
    });
  }

  async assignToTarget(input: {
    targetType: LegalHoldTargetType;
    targetReference: string;
    recordsClassificationId: string;
    retentionScheduleId: string;
    assignedByIdentityId: string;
    triggerAnchorAt?: Date;
    retentionExpiresAt?: Date;
  }) {
    const schedule = await this.prisma.retentionSchedule.findUnique({
      where: { id: input.retentionScheduleId },
    });
    if (!schedule) {
      throw new NotFoundException(`RetentionSchedule "${input.retentionScheduleId}" was not found`);
    }

    return this.prisma.recordRetentionAssignment.create({
      data: {
        targetType: input.targetType,
        targetReference: input.targetReference,
        recordsClassificationId: input.recordsClassificationId,
        retentionScheduleId: input.retentionScheduleId,
        assignedByIdentityId: input.assignedByIdentityId,
        triggerAnchorAt: input.triggerAnchorAt,
        retentionExpiresAt: input.retentionExpiresAt,
        scheduleVersionNumber: schedule.versionNumber,
      },
    });
  }
}
