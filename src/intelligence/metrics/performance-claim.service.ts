import { Injectable, NotFoundException } from '@nestjs/common';
import { PerformanceClaimStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { PERFORMANCE_CLAIM_REFERENCE_PREFIX } from '../intelligence.constants';

export interface CreatePerformanceClaimInput {
  institutionId: string;
  metricDefinitionId?: string;
  metricObservationId?: string;
  claimStatement: string;
  claimedValue?: number;
  createdByIdentityId?: string;
  limitations?: string;
  uncertaintyNotes?: string;
}

@Injectable()
export class PerformanceClaimService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  private generateReference(): string {
    return `${PERFORMANCE_CLAIM_REFERENCE_PREFIX}-${String(Date.now())}`;
  }

  async findById(id: string) {
    const claim = await this.prisma.performanceClaim.findUnique({
      where: { id },
      include: { reviews: true },
    });
    if (!claim) {
      throw new NotFoundException(`Performance claim ${id} not found`);
    }
    return claim;
  }

  async createClaim(input: CreatePerformanceClaimInput) {
    this.boundary.rejectClientPerformanceClaimFields(input as unknown as Record<string, unknown>);
    this.boundary.assertPerformanceClaimNotDecision();
    return this.prisma.performanceClaim.create({
      data: {
        institutionId: input.institutionId,
        metricDefinitionId: input.metricDefinitionId,
        metricObservationId: input.metricObservationId,
        claimReference: this.generateReference(),
        status: PerformanceClaimStatus.DRAFT,
        claimStatement: input.claimStatement,
        claimedValue:
          input.claimedValue !== undefined ? new Decimal(input.claimedValue) : undefined,
        createdByIdentityId: input.createdByIdentityId,
        limitations: input.limitations,
        uncertaintyNotes: input.uncertaintyNotes,
      },
    });
  }

  async submitClaim(id: string) {
    const claim = await this.findById(id);
    this.boundary.assertPerformanceClaimNotDecision();
    return this.prisma.performanceClaim.update({
      where: { id: claim.id },
      data: {
        status: PerformanceClaimStatus.SUBMITTED,
        claimedAt: new Date(),
      },
    });
  }
}
