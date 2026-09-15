import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureActivationStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';

@Injectable()
export class FeatureActivationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async registerDeployedFeature(input: {
    featureKey: string;
    environmentDefinitionId: string;
    governmentServiceId?: string;
  }) {
    return this.prisma.featureActivation.upsert({
      where: {
        featureKey_environmentDefinitionId: {
          featureKey: input.featureKey,
          environmentDefinitionId: input.environmentDefinitionId,
        },
      },
      create: {
        featureKey: input.featureKey,
        environmentDefinitionId: input.environmentDefinitionId,
        governmentServiceId: input.governmentServiceId,
        status: FeatureActivationStatus.DEPLOYED_ONLY,
      },
      update: {},
    });
  }

  async enableTechnically(input: {
    featureKey: string;
    environmentDefinitionId: string;
    activatedByIdentityId: string;
  }) {
    return this.prisma.featureActivation.update({
      where: {
        featureKey_environmentDefinitionId: {
          featureKey: input.featureKey,
          environmentDefinitionId: input.environmentDefinitionId,
        },
      },
      data: {
        status: FeatureActivationStatus.TECHNICALLY_ENABLED,
        technicallyEnabledAt: new Date(),
        activatedByIdentityId: input.activatedByIdentityId,
      },
    });
  }

  async activateInstitutionally(input: {
    featureKey: string;
    environmentDefinitionId: string;
    activatedByIdentityId: string;
  }) {
    const activation = await this.prisma.featureActivation.findUniqueOrThrow({
      where: {
        featureKey_environmentDefinitionId: {
          featureKey: input.featureKey,
          environmentDefinitionId: input.environmentDefinitionId,
        },
      },
    });

    if (activation.status === FeatureActivationStatus.DEPLOYED_ONLY) {
      throw new BadRequestException(
        'Feature must be technically enabled before institutional activation',
      );
    }

    return this.prisma.featureActivation.update({
      where: { id: activation.id },
      data: {
        status: FeatureActivationStatus.INSTITUTIONALLY_ACTIVATED,
        institutionallyActivatedAt: new Date(),
        activatedByIdentityId: input.activatedByIdentityId,
      },
    });
  }

  async assertFeatureUsable(featureKey: string, environmentDefinitionId: string): Promise<void> {
    const activation = await this.prisma.featureActivation.findUnique({
      where: {
        featureKey_environmentDefinitionId: {
          featureKey,
          environmentDefinitionId,
        },
      },
    });

    if (!activation) {
      throw new NotFoundException(`Feature ${featureKey} is not deployed in this environment`);
    }

    this.boundary.assertDeploymentNotEqualToFeatureActivation(
      true,
      activation.status === FeatureActivationStatus.INSTITUTIONALLY_ACTIVATED,
      'use',
    );
  }
}
