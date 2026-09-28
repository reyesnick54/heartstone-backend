import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { CannabisAdministrationBoundaryService } from '../common/cannabis-administration-boundary.service';

@Injectable()
export class CannabisRegulatoryReferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CannabisAdministrationBoundaryService,
  ) {}

  async linkComplianceMatter(input: {
    regulatedEntityId: string;
    complianceMatterId: string;
    linkageRole?: string;
  }) {
    return this.prisma.cannabisComplianceReference.create({
      data: {
        regulatedEntityId: input.regulatedEntityId,
        complianceMatterId: input.complianceMatterId,
        linkageRole: input.linkageRole ?? 'SUBJECT',
      },
    });
  }

  async linkInspectionRecord(input: {
    regulatedEntityId: string;
    inspectionRecordId: string;
    isFinalSanctionDecision?: boolean;
  }) {
    this.boundary.assertInspectionFindingIsNotFinalSanction(
      Boolean(input.isFinalSanctionDecision),
    );

    return this.prisma.cannabisInspectionReference.create({
      data: {
        regulatedEntityId: input.regulatedEntityId,
        inspectionRecordId: input.inspectionRecordId,
      },
    });
  }
}
