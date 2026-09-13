import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EvidenceCustodyEventType,
  EvidenceIntegrityState,
  InspectionFindingClassification,
  InspectionStatus,
  InspectionType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateInspectionInput {
  caseId: string;
  inspectionType: InspectionType;
  functionAuthorityRecordId?: string;
  locationSite?: string;
  inspectionDate: Date;
  scope: string;
  method?: string;
  inspectorOfficeholderId: string;
  inspectorIdentityId: string;
}

export interface RecordInspectionObservationInput {
  inspectionId: string;
  evidenceRecordId: string;
  findingClassification: InspectionFindingClassification;
  observationNotes?: string;
  custodianIdentityId: string;
  custodianOfficeholderId?: string;
}

export interface CompleteInspectionInput {
  inspectionId: string;
  conditionsObserved?: string;
  findings?: string;
  limitations?: string;
  followUpRequired?: boolean;
}

@Injectable()
export class InspectionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateInspectionInput) {
    await this.assertCaseExists(input.caseId);

    return this.prisma.inspectionRecord.create({
      data: {
        caseId: input.caseId,
        inspectionType: input.inspectionType,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        locationSite: input.locationSite,
        inspectionDate: input.inspectionDate,
        scope: input.scope,
        method: input.method,
        status: InspectionStatus.SCHEDULED,
        inspectors: {
          create: {
            officeholderId: input.inspectorOfficeholderId,
            identityId: input.inspectorIdentityId,
          },
        },
      },
      include: { inspectors: true },
    });
  }

  async recordEvidenceObservation(input: RecordInspectionObservationInput) {
    const inspection = await this.prisma.inspectionRecord.findUnique({
      where: { id: input.inspectionId },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection record not found');
    }

    if (input.findingClassification === InspectionFindingClassification.NON_COMPLIANCE) {
      throw new BadRequestException(
        'Inspection observation cannot be automatically classified as non-compliance violation',
      );
    }

    const item = await this.prisma.inspectionEvidenceItem.create({
      data: {
        inspectionId: input.inspectionId,
        evidenceRecordId: input.evidenceRecordId,
        findingClassification: input.findingClassification,
        observationNotes: input.observationNotes,
      },
    });

    await this.prisma.evidenceCustodyEvent.create({
      data: {
        eventType: EvidenceCustodyEventType.COLLECTED,
        inspectionEvidenceItemId: item.id,
        evidenceRecordId: input.evidenceRecordId,
        custodianIdentityId: input.custodianIdentityId,
        custodianOfficeholderId: input.custodianOfficeholderId,
        integrityState: EvidenceIntegrityState.UNKNOWN,
        reason: 'Inspection evidence collected',
      },
    });

    return item;
  }

  async complete(input: CompleteInspectionInput) {
    return this.prisma.inspectionRecord.update({
      where: { id: input.inspectionId },
      data: {
        conditionsObserved: input.conditionsObserved,
        findings: input.findings,
        limitations: input.limitations,
        followUpRequired: input.followUpRequired ?? false,
        status: InspectionStatus.COMPLETED,
      },
      include: { evidenceItems: true, inspectors: true },
    });
  }

  observationIsViolation(classification: InspectionFindingClassification): boolean {
    return classification === InspectionFindingClassification.NON_COMPLIANCE;
  }

  private async assertCaseExists(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }
}
