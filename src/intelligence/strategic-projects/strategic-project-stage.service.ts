import { Injectable, NotFoundException } from '@nestjs/common';
import { StrategicProjectLifecycleStage } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';

export interface RecordStrategicProjectStageInput {
  profileId: string;
  stage: StrategicProjectLifecycleStage;
  institutionalStateReference: string;
  effectiveFrom: Date;
  recordedByIdentityId: string;
  sourceRecordType?: string;
  sourceRecordId?: string;
  isAiActor?: boolean;
}

@Injectable()
export class StrategicProjectStageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: StrategicProjectBoundaryService,
  ) {}

  async recordStage(input: RecordStrategicProjectStageInput) {
    this.boundary.assertAiCannotPerformStrategicProjectAction(
      'PROMOTE_PROJECT_STAGE',
      input.isAiActor,
    );
    this.boundary.assertStageRequiresInstitutionalStateReference(input.institutionalStateReference);
    this.boundary.assertInquiryIsNotQualifiedApplication(
      input.stage,
      input.institutionalStateReference,
    );
    this.boundary.assertDoesNotInferApprovalFromActivity(
      input.stage,
      input.institutionalStateReference,
      true,
    );

    const profile = await this.prisma.strategicProjectProfile.findUnique({
      where: { id: input.profileId },
    });

    if (!profile) {
      throw new NotFoundException(`StrategicProjectProfile ${input.profileId} not found`);
    }

    this.boundary.assertAdverseStatusPreserved(profile.adverseStatusPreserved, input.stage);

    const previousStage = await this.prisma.strategicProjectStage.findFirst({
      where: { profileId: input.profileId, effectiveUntil: null },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (previousStage) {
      await this.prisma.strategicProjectStage.update({
        where: { id: previousStage.id },
        data: { effectiveUntil: input.effectiveFrom },
      });
    }

    const stageRecord = await this.prisma.strategicProjectStage.create({
      data: {
        profileId: input.profileId,
        stage: input.stage,
        institutionalStateReference: input.institutionalStateReference,
        effectiveFrom: input.effectiveFrom,
        recordedByIdentityId: input.recordedByIdentityId,
        sourceRecordType: input.sourceRecordType,
        sourceRecordId: input.sourceRecordId,
        doesNotInferApproval: true,
      },
    });

    await this.prisma.strategicProjectProfile.update({
      where: { id: input.profileId },
      data: { currentStage: input.stage },
    });

    return stageRecord;
  }
}
