import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ActivationAuditEventType,
  FeatureActivationStatus,
  ProductionActivationDecisionOutcome,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface DeployFeatureInput {
  featureCode: string;
  releaseReference: string;
  institutionId: string;
  environment: string;
}

export interface TransitionToOperationallyAvailableInput {
  featureActivationId: string;
  productionActivationDecisionId: string;
  activationScopeId: string;
  actorIdentityId: string;
}

@Injectable()
export class FeatureActivationService {
  constructor(private readonly prisma: PrismaService) {}

  async recordDeployed(input: DeployFeatureInput) {
    return this.prisma.featureActivation.upsert({
      where: {
        featureCode_releaseReference_environment_institutionId: {
          featureCode: input.featureCode,
          releaseReference: input.releaseReference,
          environment: input.environment,
          institutionId: input.institutionId,
        },
      },
      create: {
        featureCode: input.featureCode,
        releaseReference: input.releaseReference,
        institutionId: input.institutionId,
        environment: input.environment,
        status: FeatureActivationStatus.DEPLOYED,
      },
      update: {
        status: FeatureActivationStatus.DEPLOYED,
      },
    });
  }

  async transitionToOperationallyAvailable(input: TransitionToOperationallyAvailableInput) {
    const feature = await this.prisma.featureActivation.findUnique({
      where: { id: input.featureActivationId },
    });
    if (!feature) {
      throw new NotFoundException(`FeatureActivation ${input.featureActivationId} not found`);
    }

    if (feature.status !== FeatureActivationStatus.DEPLOYED) {
      throw new BadRequestException('Only deployed features may transition to operationally available');
    }

    const decision = await this.prisma.productionActivationDecision.findUnique({
      where: { id: input.productionActivationDecisionId },
      include: { scopes: true, activationRequest: true },
    });
    if (!decision) {
      throw new NotFoundException(
        `ProductionActivationDecision ${input.productionActivationDecisionId} not found`,
      );
    }

    const approvedOutcomes: ProductionActivationDecisionOutcome[] = [
      ProductionActivationDecisionOutcome.APPROVED,
      ProductionActivationDecisionOutcome.APPROVED_WITH_RESTRICTIONS,
    ];
    if (!approvedOutcomes.includes(decision.outcome)) {
      throw new BadRequestException(
        'Feature activation requires approved production activation decision',
      );
    }

    const scope = decision.scopes.find((item) => item.id === input.activationScopeId);
    if (!scope) {
      throw new BadRequestException('Activation scope is not part of approved production activation');
    }

    if (decision.activationRequest.environment !== feature.environment) {
      throw new BadRequestException('Feature environment must match approved activation environment');
    }

    if (decision.activationRequest.acceptedReleaseReference !== feature.releaseReference) {
      throw new BadRequestException('Feature release must match approved activation release');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.featureActivation.update({
        where: { id: input.featureActivationId },
        data: {
          status: FeatureActivationStatus.OPERATIONALLY_AVAILABLE,
          operationallyAvailableAt: new Date(),
          productionActivationDecisionId: input.productionActivationDecisionId,
          activationScopeId: input.activationScopeId,
        },
      });

      await tx.activationAuditRecord.create({
        data: {
          eventType: ActivationAuditEventType.FEATURE_TRANSITIONED,
          activationDecisionId: input.productionActivationDecisionId,
          actorIdentityId: input.actorIdentityId,
          eventSnapshot: {
            featureActivationId: input.featureActivationId,
            activationScopeId: input.activationScopeId,
            newStatus: FeatureActivationStatus.OPERATIONALLY_AVAILABLE,
          },
        },
      });

      return result;
    });

    return updated;
  }
}
