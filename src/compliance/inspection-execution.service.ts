import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplianceObservationClassification,
  InspectionSessionStatus,
  InspectionStatus,
  InspectionType,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { InspectionService } from '../evidence/inspection/inspection.service';
import { INSPECTION_SESSION_NUMBER_PREFIX } from './compliance.constants';
import { ComplianceBoundaryService } from './compliance-boundary.service';

export interface StartInspectionSessionInput {
  inspectionPlanId?: string;
  complianceMatterId?: string;
  caseId?: string;
  officialInstrumentId?: string;
  inspectionTypeDefinitionId?: string;
  functionAuthorityRecordId?: string;
  reusePhase7Inspection?: {
    caseId: string;
    inspectionType: InspectionType;
    inspectionDate: Date;
    scope: string;
    inspectorOfficeholderId: string;
    inspectorIdentityId: string;
    locationSite?: string;
  };
}

export interface RecordSessionObservationInput {
  inspectionSessionId: string;
  description: string;
  observerIdentityId: string;
  observerOfficeholderId?: string;
  evidenceRecordId?: string;
  classification?: ComplianceObservationClassification;
}

@Injectable()
export class InspectionExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phase7Inspection: InspectionService,
    private readonly boundary: ComplianceBoundaryService,
  ) {}

  async startSession(input: StartInspectionSessionInput) {
    const sessionNumber = `${INSPECTION_SESSION_NUMBER_PREFIX}-${Date.now()}`;
    let inspectionRecordId: string | undefined;

    if (input.reusePhase7Inspection) {
      const record = await this.phase7Inspection.create(input.reusePhase7Inspection);
      inspectionRecordId = record.id;
    }

    return this.prisma.inspectionSession.create({
      data: {
        sessionNumber,
        inspectionPlanId: input.inspectionPlanId,
        complianceMatterId: input.complianceMatterId,
        caseId: input.caseId ?? input.reusePhase7Inspection?.caseId,
        officialInstrumentId: input.officialInstrumentId,
        inspectionRecordId,
        inspectionTypeDefinitionId: input.inspectionTypeDefinitionId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        status: InspectionSessionStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: { inspectionRecord: true },
    });
  }

  async recordObservation(input: RecordSessionObservationInput) {
    const session = await this.prisma.inspectionSession.findUnique({
      where: { id: input.inspectionSessionId },
    });
    if (!session) {
      throw new NotFoundException(
        `Inspection session "${input.inspectionSessionId}" was not found`,
      );
    }

    this.boundary.assertObservationIsNotFinding({ autoPromoteObservationToFinding: false });

    return this.prisma.inspectionObservation.create({
      data: {
        inspectionSessionId: input.inspectionSessionId,
        description: input.description,
        observerIdentityId: input.observerIdentityId,
        observerOfficeholderId: input.observerOfficeholderId,
        evidenceRecordId: input.evidenceRecordId,
        classification: input.classification ?? ComplianceObservationClassification.OBSERVATION,
      },
    });
  }

  async completeSession(inspectionSessionId: string) {
    const session = await this.prisma.inspectionSession.update({
      where: { id: inspectionSessionId },
      data: {
        status: InspectionSessionStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: { inspectionRecord: true },
    });

    if (session.inspectionRecordId) {
      await this.prisma.inspectionRecord.update({
        where: { id: session.inspectionRecordId },
        data: { status: InspectionStatus.COMPLETED },
      });
    }

    return session;
  }
}
