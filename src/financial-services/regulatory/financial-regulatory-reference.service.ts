import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { FinancialServicesBoundaryService } from '../common/financial-services-boundary.service';

@Injectable()
export class FinancialRegulatoryReferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: FinancialServicesBoundaryService,
  ) {}

  async linkComplianceMatter(input: {
    regulatedEntityProfileId: string;
    complianceMatterId: string;
    linkageRole?: string;
  }) {
    return this.prisma.financialComplianceMatterReference.create({
      data: {
        regulatedEntityProfileId: input.regulatedEntityProfileId,
        complianceMatterId: input.complianceMatterId,
        linkageRole: input.linkageRole ?? 'SUBJECT',
      },
    });
  }

  async linkInspectionRecord(input: {
    regulatedEntityProfileId: string;
    inspectionRecordId: string;
    isFinalEnforcementDecision?: boolean;
  }) {
    this.boundary.assertInspectionFindingIsNotFinalEnforcement(
      Boolean(input.isFinalEnforcementDecision),
    );

    return this.prisma.financialInspectionReference.create({
      data: {
        regulatedEntityProfileId: input.regulatedEntityProfileId,
        inspectionRecordId: input.inspectionRecordId,
      },
    });
  }

  async registerReportingRequirement(input: {
    regulatedEntityProfileId: string;
    requirementCode: string;
    requirementLabel: string;
    dueAt?: Date;
  }) {
    return this.prisma.financialReportingRequirementReference.create({
      data: {
        regulatedEntityProfileId: input.regulatedEntityProfileId,
        requirementCode: input.requirementCode,
        requirementLabel: input.requirementLabel,
        dueAt: input.dueAt,
      },
    });
  }
}
