import { Injectable, NotFoundException } from '@nestjs/common';
import { type CaseMilestone, CaseMilestoneStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import {
  type CreateCaseMilestoneInput,
  type UpdateCaseMilestoneInput,
} from './case-timeline.types';

@Injectable()
export class CaseMilestoneService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCaseMilestoneInput): Promise<CaseMilestone> {
    await this.assertCaseExists(input.caseId);

    return this.prisma.caseMilestone.create({
      data: {
        caseId: input.caseId,
        name: input.name,
        targetDate: input.targetDate,
        actualDate: input.actualDate,
        status: input.status ?? CaseMilestoneStatus.UPCOMING,
        responsiblePartyRef: input.responsiblePartyRef,
        sourceSlaReference: input.sourceSlaReference,
        dependencyReference: input.dependencyReference,
      },
    });
  }

  async update(milestoneId: string, input: UpdateCaseMilestoneInput): Promise<CaseMilestone> {
    const milestone = await this.prisma.caseMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      throw new NotFoundException(`CaseMilestone "${milestoneId}" was not found`);
    }

    return this.prisma.caseMilestone.update({
      where: { id: milestoneId },
      data: {
        targetDate: input.targetDate,
        actualDate: input.actualDate,
        status: input.status,
        responsiblePartyRef: input.responsiblePartyRef,
      },
    });
  }

  async listForCase(caseId: string): Promise<CaseMilestone[]> {
    await this.assertCaseExists(caseId);

    return this.prisma.caseMilestone.findMany({
      where: { caseId },
      orderBy: [{ targetDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async markDelayed(milestoneId: string): Promise<CaseMilestone> {
    return this.update(milestoneId, { status: CaseMilestoneStatus.DELAYED });
  }

  async markCompleted(milestoneId: string, actualDate?: Date): Promise<CaseMilestone> {
    return this.update(milestoneId, {
      status: CaseMilestoneStatus.COMPLETED,
      actualDate: actualDate ?? new Date(),
    });
  }

  private async assertCaseExists(caseId: string): Promise<void> {
    const exists = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }
}
