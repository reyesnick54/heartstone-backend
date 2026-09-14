import { Injectable, NotFoundException } from '@nestjs/common';
import { InfrastructureDeliveryStage, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';

export interface RecordInfrastructureDeliveryInput {
  profileId: string;
  stage: InfrastructureDeliveryStage;
  digitalTwinStatus?: string;
  dashboardStatus?: string;
  physicalCompletionVerified?: boolean;
  evidenceRecordRefs?: Prisma.InputJsonValue;
  independentVerificationRefs?: Prisma.InputJsonValue;
  recordedByIdentityId: string;
  isAiActor?: boolean;
}

@Injectable()
export class InfrastructureDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: StrategicProjectBoundaryService,
  ) {}

  async recordInfrastructureDelivery(input: RecordInfrastructureDeliveryInput) {
    const profile = await this.prisma.strategicProjectProfile.findUnique({
      where: { id: input.profileId },
    });

    if (!profile) {
      throw new NotFoundException(`StrategicProjectProfile ${input.profileId} not found`);
    }

    const physicalCompletionVerified = input.physicalCompletionVerified ?? false;

    if (!physicalCompletionVerified) {
      this.boundary.assertAiCannotPerformStrategicProjectAction(
        'VERIFY_INFRASTRUCTURE_FROM_DASHBOARD',
        input.isAiActor,
      );
    }

    this.boundary.assertDashboardIsNotInfrastructureProof({
      digitalTwinStatus: input.digitalTwinStatus,
      dashboardStatus: input.dashboardStatus,
      physicalCompletionVerified,
      targetStage: input.stage,
    });

    return this.prisma.infrastructureDeliveryRecord.create({
      data: {
        profileId: input.profileId,
        stage: input.stage,
        digitalTwinStatus: input.digitalTwinStatus,
        dashboardStatus: input.dashboardStatus,
        physicalCompletionVerified,
        evidenceRecordRefs: input.evidenceRecordRefs ?? [],
        independentVerificationRefs: input.independentVerificationRefs ?? [],
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });
  }
}
