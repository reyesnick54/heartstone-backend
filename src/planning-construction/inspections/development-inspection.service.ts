import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DevelopmentAccessActorKind,
  DevelopmentInspectionOutcome,
  DevelopmentInspectionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PlanningConstructionBoundaryService } from '../common/planning-construction-boundary.service';

export interface RecordInspectionOutcomeInput {
  developmentInspectionId: string;
  outcome: DevelopmentInspectionOutcome;
  failureNotes?: string;
  actorKind: DevelopmentAccessActorKind;
  reinspectionRequested?: boolean;
  clientPayload?: Record<string, unknown>;
}

@Injectable()
export class DevelopmentInspectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PlanningConstructionBoundaryService,
  ) {}

  async recordOutcome(input: RecordInspectionOutcomeInput) {
    if (input.clientPayload) {
      this.boundary.rejectApplicantForgedInspectionOutcome(input.clientPayload, input.actorKind);
    }

    const inspection = await this.prisma.developmentInspection.findUnique({
      where: { id: input.developmentInspectionId },
    });
    if (!inspection) {
      throw new NotFoundException(
        `DevelopmentInspection ${input.developmentInspectionId} not found`,
      );
    }

    this.boundary.assertInspectionFailurePreserved(
      inspection.outcome,
      input.outcome,
      input.reinspectionRequested ?? false,
    );

    return this.prisma.developmentInspection.update({
      where: { id: inspection.id },
      data: {
        status: DevelopmentInspectionStatus.COMPLETED,
        outcome: input.outcome,
        failureNotes:
          input.outcome === DevelopmentInspectionOutcome.FAIL ? input.failureNotes : null,
        outcomeLockedAt: new Date(),
        completedAt: new Date(),
      },
    });
  }
}
