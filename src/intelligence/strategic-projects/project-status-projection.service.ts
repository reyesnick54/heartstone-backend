import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CapitalEvidenceClassification,
  EmploymentEvidenceClassification,
  InfrastructureDeliveryStage,
  Prisma,
  ProjectStatusProjectionAudience,
  StrategicProjectLifecycleStage,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PROJECT_PROJECTION_DISCLAIMER } from '../intelligence.constants';

export interface DeriveProjectStatusProjectionInput {
  profileId: string;
  audience: ProjectStatusProjectionAudience;
  evidenceCutoffAt?: Date;
  derivedByIdentityId?: string;
}

@Injectable()
export class ProjectStatusProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async deriveProjection(input: DeriveProjectStatusProjectionInput) {
    const profile = await this.prisma.strategicProjectProfile.findUnique({
      where: { id: input.profileId },
      include: {
        stageHistory: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
        capitalEvidence: { orderBy: { recordedAt: 'desc' }, take: 1 },
        employmentEvidence: true,
        infrastructureRecords: { orderBy: { recordedAt: 'desc' }, take: 1 },
        milestones: true,
      },
    });

    if (!profile) {
      throw new NotFoundException(`StrategicProjectProfile ${input.profileId} not found`);
    }

    const derivedStage = profile.currentStage;
    const sourceDataRefs: Prisma.InputJsonValue[] = [];

    if (profile.stageHistory[0]) {
      sourceDataRefs.push({
        type: 'StrategicProjectStage',
        id: profile.stageHistory[0].id,
        institutionalStateReference: profile.stageHistory[0].institutionalStateReference,
      });
    }

    if (profile.capitalEvidence[0]) {
      sourceDataRefs.push({
        type: 'CapitalEvidenceRecord',
        id: profile.capitalEvidence[0].id,
        classification: profile.capitalEvidence[0].classification,
      });
    }

    const verifiedEmployment = profile.employmentEvidence.filter(
      (record) => record.classification === EmploymentEvidenceClassification.ACTIVE_VERIFIED,
    );
    if (verifiedEmployment.length > 0) {
      sourceDataRefs.push({
        type: 'EmploymentEvidenceRecord',
        count: verifiedEmployment.length,
        note: 'Only ACTIVE_VERIFIED employment counts; forecasts excluded',
      });
    }

    if (profile.infrastructureRecords[0]) {
      const infra = profile.infrastructureRecords[0];
      sourceDataRefs.push({
        type: 'InfrastructureDeliveryRecord',
        id: infra.id,
        stage: infra.stage,
        physicalCompletionVerified: infra.physicalCompletionVerified,
        note: 'Dashboard status does not prove physical completion',
      });
    }

    const existing = await this.prisma.projectStatusProjection.findFirst({
      where: {
        profileId: input.profileId,
        audience: input.audience,
      },
      orderBy: { lastDerivedAt: 'desc' },
    });

    const projectionData = {
      derivedStage,
      projectionDisclaimer: PROJECT_PROJECTION_DISCLAIMER,
      sourceDataRefs: sourceDataRefs as Prisma.InputJsonValue,
      evidenceCutoffAt: input.evidenceCutoffAt,
      adverseStatusPreserved: profile.adverseStatusPreserved,
      projectionVersion: (existing?.projectionVersion ?? 0) + 1,
      lastDerivedAt: new Date(),
      derivedByIdentityId: input.derivedByIdentityId,
    };

    const projection = existing
      ? await this.prisma.projectStatusProjection.update({
          where: { id: existing.id },
          data: projectionData,
        })
      : await this.prisma.projectStatusProjection.create({
          data: {
            profileId: input.profileId,
            audience: input.audience,
            ...projectionData,
          },
        });

    return projection;
  }

  isOperationalStage(stage: StrategicProjectLifecycleStage): boolean {
    return (
      stage === StrategicProjectLifecycleStage.OPERATIONAL ||
      stage === StrategicProjectLifecycleStage.PARTIALLY_OPERATIONAL
    );
  }

  hasVerifiedDeployedCapital(classification: CapitalEvidenceClassification | undefined): boolean {
    return classification === CapitalEvidenceClassification.VERIFIED_DEPLOYED;
  }

  hasVerifiedInfrastructure(
    stage: InfrastructureDeliveryStage | undefined,
    physicalCompletionVerified: boolean,
  ): boolean {
    if (!stage || !physicalCompletionVerified) {
      return false;
    }

    return (
      stage === InfrastructureDeliveryStage.CONSTRUCTION_VERIFIED ||
      stage === InfrastructureDeliveryStage.ACCEPTED ||
      stage === InfrastructureDeliveryStage.OPERATIONAL
    );
  }
}
