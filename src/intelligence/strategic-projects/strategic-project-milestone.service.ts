import { Injectable, NotFoundException } from '@nestjs/common';
import { StrategicProjectMilestoneStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';

export interface CreateStrategicProjectMilestoneInput {
  profileId: string;
  title: string;
  description?: string;
  plannedDate?: Date;
}

export interface UpdateMilestoneStatusInput {
  milestoneId: string;
  status: StrategicProjectMilestoneStatus;
  reportedByIdentityId?: string;
  evidenceRecordRefs?: Prisma.InputJsonValue;
  independentVerificationRefs?: Prisma.InputJsonValue;
  isAiActor?: boolean;
}

@Injectable()
export class StrategicProjectMilestoneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: StrategicProjectBoundaryService,
  ) {}

  async createMilestone(input: CreateStrategicProjectMilestoneInput) {
    const profile = await this.prisma.strategicProjectProfile.findUnique({
      where: { id: input.profileId },
    });

    if (!profile) {
      throw new NotFoundException(`StrategicProjectProfile ${input.profileId} not found`);
    }

    return this.prisma.strategicProjectMilestone.create({
      data: {
        profileId: input.profileId,
        title: input.title,
        description: input.description,
        plannedDate: input.plannedDate,
        status: StrategicProjectMilestoneStatus.PLANNED,
      },
    });
  }

  async updateMilestoneStatus(input: UpdateMilestoneStatusInput) {
    const milestone = await this.prisma.strategicProjectMilestone.findUnique({
      where: { id: input.milestoneId },
    });

    if (!milestone) {
      throw new NotFoundException(`StrategicProjectMilestone ${input.milestoneId} not found`);
    }

    if (input.status === StrategicProjectMilestoneStatus.COMPLETED) {
      this.boundary.assertAiCannotPerformStrategicProjectAction(
        'SET_MILESTONE_COMPLETED',
        input.isAiActor,
      );
    }

    this.boundary.assertMilestoneStatusTransition(milestone.status, input.status);
    this.boundary.assertPlannedMilestoneIsNotCompleted(input.status);
    this.boundary.assertReportedMilestoneIsNotVerified(input.status);

    const updateData: Prisma.StrategicProjectMilestoneUpdateInput = {
      status: input.status,
    };

    if (input.status === StrategicProjectMilestoneStatus.REPORTED) {
      updateData.reportedDate = new Date();
      updateData.reportedBy = input.reportedByIdentityId
        ? { connect: { id: input.reportedByIdentityId } }
        : undefined;
    }

    if (
      input.status === StrategicProjectMilestoneStatus.VERIFIED ||
      input.status === StrategicProjectMilestoneStatus.REVALIDATED
    ) {
      updateData.verifiedDate = new Date();
      updateData.independentVerificationRefs = input.independentVerificationRefs;
    }

    if (input.status === StrategicProjectMilestoneStatus.COMPLETED) {
      updateData.completedDate = new Date();
    }

    if (input.evidenceRecordRefs) {
      updateData.evidenceRecordRefs = input.evidenceRecordRefs;
    }

    return this.prisma.strategicProjectMilestone.update({
      where: { id: input.milestoneId },
      data: updateData,
    });
  }
}
