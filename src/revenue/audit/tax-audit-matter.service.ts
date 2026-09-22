import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { RevenueBoundaryService } from '../common/revenue-boundary.service';
import { REVENUE_AUDIT_BOUNDARY_DISCLAIMER } from '../revenue.constants';

@Injectable()
export class TaxAuditMatterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RevenueBoundaryService,
  ) {}

  async openMatter(input: {
    taxpayerAccountId: string;
    matterReference: string;
    riskScore?: number;
    notes?: string;
  }) {
    this.boundary.assertAuditMatterDoesNotProveViolation(input.notes);

    const matter = await this.prisma.taxAuditMatter.create({
      data: {
        taxpayerAccountId: input.taxpayerAccountId,
        matterReference: input.matterReference,
        riskScore: input.riskScore,
        notes: input.notes,
      },
    });

    return {
      matter,
      auditDisclaimer: REVENUE_AUDIT_BOUNDARY_DISCLAIMER,
      violationProven: false,
    };
  }
}
