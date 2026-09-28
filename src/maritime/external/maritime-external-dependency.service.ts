import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  MaritimeActorPersona,
  MaritimeExternalDependencyRecordedBy,
  MaritimeExternalDependencyStatus,
  MaritimeExternalDependencyType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { MaritimeBoundaryService } from '../common/maritime-boundary.service';
import { MARITIME_EXTERNAL_DEPENDENCY_PREFIX } from '../maritime.constants';

@Injectable()
export class MaritimeExternalDependencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: MaritimeBoundaryService,
  ) {}

  async assertAdministrativeDecisionAllowed(vesselRecordId: string): Promise<void> {
    const dependencies = await this.prisma.maritimeExternalDependency.findMany({
      where: { vesselRecordId },
    });
    this.boundary.assertExternalDependenciesResolved(dependencies);
  }

  async countAwaitingExternal(vesselRecordId: string): Promise<number> {
    return this.prisma.maritimeExternalDependency.count({
      where: {
        vesselRecordId,
        blocksAbsezAdministrativeDecision: true,
        status: MaritimeExternalDependencyStatus.PENDING,
      },
    });
  }

  async recordExternalDetermination(
    actorPersona: MaritimeActorPersona,
    input: {
      vesselRecordId: string;
      dependencyType: MaritimeExternalDependencyType;
      externalAuthorityId?: string;
      blocksAbsezAdministrativeDecision?: boolean;
      status: MaritimeExternalDependencyStatus;
      externalDecisionReference?: string;
      effectiveAt?: Date;
      evidenceRecordId?: string;
      recordedBy: MaritimeExternalDependencyRecordedBy;
      recordedByIdentityId?: string;
      responseAttributionSummary?: string;
    },
  ) {
    this.boundary.rejectApplicantForgedExternalResponse(actorPersona);

    const dependencyReference = `${MARITIME_EXTERNAL_DEPENDENCY_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.maritimeExternalDependency.create({
      data: {
        id: randomUUID(),
        vesselRecordId: input.vesselRecordId,
        dependencyType: input.dependencyType,
        externalAuthorityId: input.externalAuthorityId,
        blocksAbsezAdministrativeDecision: input.blocksAbsezAdministrativeDecision ?? false,
        status: input.status,
        externalDecisionReference: input.externalDecisionReference,
        effectiveAt: input.effectiveAt,
        evidenceRecordId: input.evidenceRecordId,
        recordedBy: input.recordedBy,
        recordedByIdentityId: input.recordedByIdentityId,
        doesNotReplaceExternalDecision: true,
        responseAttributionSummary:
          input.responseAttributionSummary ?? `Recorded as ${dependencyReference}`,
      },
    });
  }
}
