import { Injectable } from '@nestjs/common';
import { HealthcareRegulatedEntityKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HealthcareRegulatoryReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async registerRegulatedEntity(input: {
    entityReference: string;
    entityKind: HealthcareRegulatedEntityKind;
    organizationId?: string;
    identityId?: string;
    externalRef?: string;
  }) {
    return this.prisma.healthcareRegulatedEntityReference.create({
      data: {
        entityReference: input.entityReference,
        entityKind: input.entityKind,
        organizationId: input.organizationId,
        identityId: input.identityId,
        externalRef: input.externalRef,
      },
    });
  }

  async linkComplianceMatter(input: {
    regulatedEntityId: string;
    complianceMatterId: string;
    linkageRole?: string;
  }) {
    return this.prisma.healthcareComplianceMatterReference.create({
      data: {
        regulatedEntityId: input.regulatedEntityId,
        complianceMatterId: input.complianceMatterId,
        linkageRole: input.linkageRole ?? 'SUBJECT',
      },
    });
  }

  async linkInspectionRecord(input: { regulatedEntityId: string; inspectionRecordId: string }) {
    return this.prisma.healthcareInspectionReference.create({
      data: {
        regulatedEntityId: input.regulatedEntityId,
        inspectionRecordId: input.inspectionRecordId,
      },
    });
  }
}
