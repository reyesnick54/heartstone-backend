import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EvidenceCustodyEventType, InspectionSessionStatus } from '@prisma/client';

import { EvidenceCustodyService } from '../../evidence/custody/evidence-custody.service';
import { PrismaService } from '../../database/prisma.service';
import { InspectionComplianceBoundaryService } from '../boundary/inspection-compliance-boundary.service';

export interface RecordInspectionObservationInput {
  inspectionSessionId: string;
  inspectorIdentityId: string;
  inspectorOfficeholderId: string;
  whatObserved: string;
  whereObserved: string;
  observedAt: Date;
  observationMethod?: string;
  evidenceRecordIds?: string[];
  limitations?: string;
}

@Injectable()
export class InspectionObservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: InspectionComplianceBoundaryService,
    private readonly custody: EvidenceCustodyService,
  ) {}

  async recordObservation(input: RecordInspectionObservationInput) {
    const session = await this.prisma.inspectionSession.findUnique({
      where: { id: input.inspectionSessionId },
      include: { inspectionRecord: { include: { inspectors: true } } },
    });

    if (!session) {
      throw new NotFoundException('Inspection session not found');
    }

    if (session.status !== InspectionSessionStatus.IN_PROGRESS) {
      throw new ForbiddenException('Observations may only be recorded during an in-progress session');
    }

    const isAssignedInspector = session.inspectionRecord.inspectors.some(
      (inspector) =>
        inspector.identityId === input.inspectorIdentityId &&
        inspector.officeholderId === input.inspectorOfficeholderId,
    );
    if (!isAssignedInspector) {
      throw new ForbiddenException(
        'Government inspection observation must remain attributable to an assigned government inspector',
      );
    }

    this.boundary.assertObservationIsNotViolation(input.whatObserved);

    const observation = await this.prisma.inspectionObservation.create({
      data: {
        inspectionSessionId: input.inspectionSessionId,
        inspectorIdentityId: input.inspectorIdentityId,
        inspectorOfficeholderId: input.inspectorOfficeholderId,
        whatObserved: input.whatObserved,
        whereObserved: input.whereObserved,
        observedAt: input.observedAt,
        observationMethod: input.observationMethod,
        limitations: input.limitations,
        evidenceLinks: input.evidenceRecordIds?.length
          ? {
              create: input.evidenceRecordIds.map((evidenceRecordId) => ({
                evidenceRecordId,
              })),
            }
          : undefined,
      },
      include: { evidenceLinks: true },
    });

    for (const evidenceRecordId of input.evidenceRecordIds ?? []) {
      await this.custody.appendEvent({
        evidenceRecordId,
        custodianIdentityId: input.inspectorIdentityId,
        custodianOfficeholderId: input.inspectorOfficeholderId,
        eventType: EvidenceCustodyEventType.COLLECTED,
        reason: `Inspection observation ${observation.id} evidence reference`,
      });
    }

    return observation;
  }

  async markDisputedBySubject(observationId: string) {
    return this.prisma.inspectionObservation.update({
      where: { id: observationId },
      data: { disputedBySubject: true },
    });
  }
}
