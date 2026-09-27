import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  DigitalAssetsActorPersona,
  DigitalAssetsExternalDependencyRecordedBy,
  DigitalAssetsExternalDependencyStatus,
  DigitalAssetsExternalDependencyType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DigitalAssetsBoundaryService } from '../common/digital-assets-boundary.service';
import { DIGITAL_ASSETS_EXTERNAL_DEPENDENCY_PREFIX } from '../digital-assets.constants';

@Injectable()
export class DigitalAssetsExternalDependencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: DigitalAssetsBoundaryService,
  ) {}

  async assertFinalDecisionAllowed(regulatedEntityId: string): Promise<void> {
    const dependencies = await this.prisma.digitalAssetsExternalDependency.findMany({
      where: { regulatedEntityId },
    });
    this.boundary.assertExternalDependenciesResolved(dependencies);
  }

  async recordExternalResponse(
    actorPersona: DigitalAssetsActorPersona,
    input: {
      regulatedEntityId: string;
      dependencyType: DigitalAssetsExternalDependencyType;
      externalAuthorityId?: string;
      blocksFinalDecision?: boolean;
      status: DigitalAssetsExternalDependencyStatus;
      isAuthenticated: boolean;
      authenticatedPayload?: Record<string, unknown>;
      recordedBy: DigitalAssetsExternalDependencyRecordedBy;
      recordedByIdentityId?: string;
      responseAttributionSummary?: string;
    },
  ) {
    this.boundary.rejectApplicantForgedExternalResponse(actorPersona, input.isAuthenticated);

    const authenticatedPayloadHash = input.authenticatedPayload
      ? createHash('sha256').update(JSON.stringify(input.authenticatedPayload)).digest('hex')
      : undefined;

    const dependencyReference = `${DIGITAL_ASSETS_EXTERNAL_DEPENDENCY_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.digitalAssetsExternalDependency.create({
      data: {
        id: randomUUID(),
        regulatedEntityId: input.regulatedEntityId,
        dependencyType: input.dependencyType,
        externalAuthorityId: input.externalAuthorityId,
        blocksFinalDecision: input.blocksFinalDecision ?? false,
        status: input.status,
        isAuthenticated: input.isAuthenticated,
        authenticatedPayloadHash,
        recordedBy: input.recordedBy,
        recordedByIdentityId: input.recordedByIdentityId,
        responseAttributionSummary:
          input.responseAttributionSummary ?? `Recorded as ${dependencyReference}`,
      },
    });
  }
}
