import { Injectable } from '@nestjs/common';
import { PlatformEnvironmentClassification } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PRODUCTION_CAPABLE_CLASSIFICATIONS } from '../production-readiness.constants';
import { ReleaseRevalidationService } from '../releases/release-revalidation.service';

@Injectable()
export class AiModelGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: ReleaseRevalidationService,
  ) {}

  async recordModelUpdate(input: {
    modelIdentifier: string;
    environmentDefinitionId: string;
    version: string;
    requiresInstitutionalAcceptance: boolean;
  }) {
    const environment = await this.prisma.environmentDefinition.findUniqueOrThrow({
      where: { id: input.environmentDefinitionId },
    });

    if (
      PRODUCTION_CAPABLE_CLASSIFICATIONS.includes(environment.classification) ||
      input.requiresInstitutionalAcceptance
    ) {
      await this.revalidation.recordTrigger({
        triggerType: 'AI_MODEL_UPDATE',
        sourceRecordType: 'AiModelUpdate',
        sourceRecordId: environment.id,
        reason: `AI model ${input.modelIdentifier} updated to ${input.version}; institutional acceptance required before production use`,
      });
    }

    return {
      modelIdentifier: input.modelIdentifier,
      version: input.version,
      environmentClassification: environment.classification,
      silentlyEnteredProduction: false,
      requiresRevalidation:
        environment.classification === PlatformEnvironmentClassification.PRODUCTION,
    };
  }
}
