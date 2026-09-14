import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';
import { SECTOR_OBSERVATION_DISCLAIMER } from '../intelligence.constants';

export interface RecordSectorObservationInput {
  sectorCode: string;
  observationSummary: string;
  attributionMetadata: Prisma.InputJsonValue;
  externalFactorNotes?: string;
  sourceDataRefs?: Prisma.InputJsonValue;
  recordedByIdentityId: string;
}

@Injectable()
export class SectorDevelopmentObservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: StrategicProjectBoundaryService,
  ) {}

  async recordObservation(input: RecordSectorObservationInput) {
    this.boundary.assertAttributionMetadataPresent(
      input.attributionMetadata as Record<string, unknown>,
    );

    const observation = await this.prisma.sectorDevelopmentObservation.create({
      data: {
        sectorCode: input.sectorCode,
        observationSummary: input.observationSummary,
        attributionMetadata: input.attributionMetadata,
        externalFactorNotes: input.externalFactorNotes,
        sourceDataRefs: input.sourceDataRefs ?? [],
        doesNotClaimNationalCausation: true,
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });

    return {
      ...observation,
      disclaimer: SECTOR_OBSERVATION_DISCLAIMER,
    };
  }
}
