import { Injectable, NotFoundException } from '@nestjs/common';
import { RedressNoticeStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { RedressImplementationService } from '../implementation/redress-implementation.service';

export interface PrepareRedressNoticeInput {
  redressDecisionId: string;
  outcomeSummary: string;
  reasonsSummary: string;
  remedySummary: string;
  effectiveDate?: Date;
  stayEffectSummary?: string;
  contactReference?: string;
  requestedFurtherReviewRights?: string[];
  filingRoute?: string;
  filingDeadline?: Date;
}

@Injectable()
export class RedressNoticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
    private readonly implementation: RedressImplementationService,
  ) {}

  async prepareNotice(input: PrepareRedressNoticeInput) {
    const decision = await this.prisma.redressDecision.findUnique({
      where: { id: input.redressDecisionId },
      include: {
        redressMatter: {
          include: { routeVersion: true, reviewStayRecords: true },
        },
      },
    });

    if (!decision) {
      throw new NotFoundException(`RedressDecision ${input.redressDecisionId} not found`);
    }

    const configuredRights = decision.redressMatter.routeVersion.furtherReviewRights as string[];
    const furtherReviewRights = this.boundary.assertFurtherReviewRightsFromConfiguration(
      configuredRights,
      input.requestedFurtherReviewRights ?? [],
    );

    const implementationStatus = await this.implementation.getImplementationStatus(decision.id);

    return this.prisma.redressNotice.upsert({
      where: { redressDecisionId: decision.id },
      create: {
        redressDecisionId: decision.id,
        redressMatterId: decision.redressMatterId,
        outcomeSummary: input.outcomeSummary,
        reasonsSummary: input.reasonsSummary,
        remedySummary: input.remedySummary,
        effectiveDate: input.effectiveDate ?? decision.effectiveAt,
        implementationStatus,
        furtherReviewRights,
        filingRoute: configuredRights.length > 0 ? input.filingRoute : null,
        filingDeadline: configuredRights.length > 0 ? input.filingDeadline : null,
        stayEffectSummary:
          input.stayEffectSummary ??
          (decision.redressMatter.reviewStayRecords.length > 0 ? 'Active stay in effect' : null),
        contactReference: input.contactReference,
        status: RedressNoticeStatus.PREPARED,
      },
      update: {
        outcomeSummary: input.outcomeSummary,
        reasonsSummary: input.reasonsSummary,
        remedySummary: input.remedySummary,
        effectiveDate: input.effectiveDate ?? decision.effectiveAt,
        implementationStatus,
        furtherReviewRights,
        filingRoute: configuredRights.length > 0 ? input.filingRoute : null,
        filingDeadline: configuredRights.length > 0 ? input.filingDeadline : null,
        stayEffectSummary: input.stayEffectSummary,
        contactReference: input.contactReference,
        status: RedressNoticeStatus.PREPARED,
      },
    });
  }

  async deliverNotice(redressDecisionId: string, deliveredAt: Date = new Date()) {
    const notice = await this.prisma.redressNotice.findUnique({
      where: { redressDecisionId },
    });

    if (!notice) {
      throw new NotFoundException(`RedressNotice for decision ${redressDecisionId} not found`);
    }

    const implementationStatus =
      await this.implementation.getImplementationStatus(redressDecisionId);

    return this.prisma.redressNotice.update({
      where: { id: notice.id },
      data: {
        status: RedressNoticeStatus.DELIVERED,
        deliveredAt,
        implementationStatus,
      },
    });
  }
}
