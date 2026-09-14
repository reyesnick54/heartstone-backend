import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type MeasuredPerformanceClaim,
  PerformanceAttributionClassification,
  PerformanceClaimStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { CreatePerformanceClaimDto } from '../dto/create-performance-claim.dto';
import { ReviewPerformanceClaimDto } from '../dto/review-performance-claim.dto';

@Injectable()
export class MeasuredPerformanceClaimService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async create(
    dto: CreatePerformanceClaimDto,
    ownerIdentityId: string,
  ): Promise<MeasuredPerformanceClaim> {
    const calculationRun = await this.prisma.metricCalculationRun.findUnique({
      where: { id: dto.calculationRunId },
    });
    if (!calculationRun) {
      throw new NotFoundException(`Calculation run ${dto.calculationRunId} not found`);
    }

    const claimReference = dto.claimReference ?? `PC-${String(Date.now())}`;
    const attribution = this.boundary.assertDefaultAttribution(dto.attributionClassification);

    return this.prisma.measuredPerformanceClaim.create({
      data: {
        claimReference,
        claimStatement: dto.claimStatement,
        metricDefinitionVersionId: dto.metricDefinitionVersionId,
        calculationRunId: dto.calculationRunId,
        baselineId: dto.baselineId,
        comparisonPeriodStart: dto.comparisonPeriodStart,
        comparisonPeriodEnd: dto.comparisonPeriodEnd,
        ownerIdentityId,
        status: PerformanceClaimStatus.DRAFT,
        confidence: dto.confidence,
        assumptions: dto.assumptions,
        limitations: dto.limitations,
        externalFactors: dto.externalFactors,
        attributionClassification: attribution,
        evidencePacketReference: dto.evidencePacketReference,
        effectivePeriodStart: dto.effectivePeriodStart,
        effectivePeriodEnd: dto.effectivePeriodEnd,
        revalidationDate: dto.revalidationDate,
      },
    });
  }

  async linkEvidence(
    claimId: string,
    evidencePacketId: string,
    linkPurpose: string,
  ): Promise<void> {
    const claim = await this.prisma.measuredPerformanceClaim.findUnique({ where: { id: claimId } });
    if (!claim) {
      throw new NotFoundException(`Measured performance claim ${claimId} not found`);
    }

    await this.prisma.measuredPerformanceClaimEvidenceLink.create({
      data: {
        performanceClaimId: claimId,
        evidencePacketId,
        linkPurpose,
      },
    });
  }

  async submitForReview(
    claimId: string,
    reviewerIdentityId: string,
  ): Promise<MeasuredPerformanceClaim> {
    const claim = await this.prisma.measuredPerformanceClaim.findUnique({ where: { id: claimId } });
    if (!claim) {
      throw new NotFoundException(`Measured performance claim ${claimId} not found`);
    }

    return this.prisma.measuredPerformanceClaim.update({
      where: { id: claimId },
      data: {
        status: PerformanceClaimStatus.UNDER_REVIEW,
        reviewerIdentityId,
      },
    });
  }

  async review(
    claimId: string,
    reviewerIdentityId: string,
    dto: ReviewPerformanceClaimDto,
    actorType: string,
  ): Promise<MeasuredPerformanceClaim> {
    this.boundary.assertAiCannotApprovePerformanceClaim(
      actorType,
      'approveOfficialPerformanceClaim',
    );

    const claim = await this.prisma.measuredPerformanceClaim.findUnique({
      where: { id: claimId },
      include: { evidenceLinks: true },
    });
    if (!claim) {
      throw new NotFoundException(`Measured performance claim ${claimId} not found`);
    }

    const nextStatus = dto.approved
      ? PerformanceClaimStatus.VERIFIED_FOR_STATED_PURPOSE
      : PerformanceClaimStatus.QUALIFIED;

    this.boundary.assertClaimRequiresEvidenceForPublication(nextStatus, claim.evidenceLinks.length);
    this.boundary.assertExpiredClaimCannotRemainCurrent(nextStatus, claim.effectivePeriodEnd);

    if (
      dto.attributionClassification ===
        PerformanceAttributionClassification.CAUSAL_WITH_APPROVED_METHOD &&
      !dto.approvedCausalMethod
    ) {
      throw new BadRequestException(
        'Causal attribution requires an approved method; do not default to causal',
      );
    }

    await this.prisma.measuredPerformanceClaimReview.create({
      data: {
        performanceClaimId: claimId,
        reviewerIdentityId,
        outcome: dto.outcome,
        findings: dto.findings,
        limitationsNoted: dto.limitationsNoted,
      },
    });

    return this.prisma.measuredPerformanceClaim.update({
      where: { id: claimId },
      data: {
        status: nextStatus,
        reviewerIdentityId,
        attributionClassification: dto.attributionClassification ?? claim.attributionClassification,
      },
    });
  }

  async supersede(claimId: string, newClaimId: string): Promise<MeasuredPerformanceClaim> {
    const prior = await this.prisma.measuredPerformanceClaim.update({
      where: { id: claimId },
      data: {
        status: PerformanceClaimStatus.SUPERSEDED,
        supersededByClaimId: newClaimId,
      },
    });
    this.boundary.assertSupersededClaimRetained(prior.status);
    return prior;
  }

  async expireStaleClaims(now: Date = new Date()): Promise<number> {
    const result = await this.prisma.measuredPerformanceClaim.updateMany({
      where: {
        effectivePeriodEnd: { lt: now },
        status: {
          in: [
            PerformanceClaimStatus.APPROVED_FOR_PUBLICATION,
            PerformanceClaimStatus.APPROVED_FOR_INTERNAL_USE,
            PerformanceClaimStatus.VERIFIED_FOR_STATED_PURPOSE,
          ],
        },
      },
      data: { status: PerformanceClaimStatus.EXPIRED },
    });
    return result.count;
  }
}
