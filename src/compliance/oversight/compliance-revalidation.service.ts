import { Injectable } from '@nestjs/common';
import { ComplianceRevalidationTrigger } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface RecordRevalidationInput {
  projectionId: string;
  trigger: ComplianceRevalidationTrigger;
  triggerSummary: string;
  sourceDataRefs: { type: string; id: string }[];
  priorAssessmentId?: string;
  priorAssessmentType?: string;
  recordedByIdentityId?: string;
}

@Injectable()
export class ComplianceRevalidationService {
  constructor(private readonly prisma: PrismaService) {}

  async recordRevalidation(input: RecordRevalidationInput) {
    const record = await this.prisma.complianceRevalidationRecord.create({
      data: {
        projectionId: input.projectionId,
        trigger: input.trigger,
        triggerSummary: input.triggerSummary,
        sourceDataRefs: input.sourceDataRefs,
        priorAssessmentId: input.priorAssessmentId,
        priorAssessmentType: input.priorAssessmentType,
        doesNotRenewInstrument: true,
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });

    await this.prisma.complianceMonitoringEvent.create({
      data: {
        projectionId: input.projectionId,
        eventType: 'REVALIDATION_TRIGGERED',
        eventSummary: input.triggerSummary,
        sourceDataRefs: input.sourceDataRefs,
        uncertaintyNotes:
          'Revalidation records a need to reassess compliance posture; it does not renew an instrument.',
      },
    });

    return record;
  }

  async triggerFromMaterialEvidence(
    projectionId: string,
    evidenceRecordId: string,
    recordedByIdentityId?: string,
  ) {
    return this.recordRevalidation({
      projectionId,
      trigger: ComplianceRevalidationTrigger.MATERIAL_INSPECTION_FINDING,
      triggerSummary: 'New material evidence requires compliance revalidation',
      sourceDataRefs: [{ type: 'EvidenceRecord', id: evidenceRecordId }],
      priorAssessmentType: 'EvidenceRecord',
      priorAssessmentId: evidenceRecordId,
      recordedByIdentityId,
    });
  }
}
