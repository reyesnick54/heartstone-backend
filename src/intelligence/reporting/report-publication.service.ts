import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityEvaluationOutcome,
  InstitutionalMetricClaimStatus,
  Prisma,
  ReportApprovalStatus,
  ReportClaimStatus,
  ReportClassification,
  ReportGenerationRunStatus,
  ReportPublicationStatus,
  ReportReviewStatus,
  ReportType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ReportingBoundaryService } from '../common/reporting-boundary.service';
import { hashReportContent } from '../common/reporting-hash.util';

export interface PublishReportInput {
  reportGenerationRunId: string;
  publisherIdentityId: string;
  publisherOfficeholderId?: string;
  authorityEvaluationRecordId: string;
  classification: ReportClassification;
  publicationReference?: string;
}

@Injectable()
export class ReportPublicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ReportingBoundaryService,
  ) {}

  async publish(input: PublishReportInput) {
    this.boundary.assertAiCannotApprovePublication(input.publisherIdentityId);

    const run = await this.prisma.reportGenerationRun.findUnique({
      where: { id: input.reportGenerationRunId },
      include: {
        reportDefinitionVersion: {
          include: { reportDefinition: true },
        },
        claimPins: { include: { institutionalMetricClaim: true } },
        metricPins: { include: { metricCalculationRun: true } },
        sections: {
          include: { institutionalMetricClaim: true },
        },
        reviews: true,
        approvals: true,
        publications: true,
      },
    });

    if (!run) {
      throw new NotFoundException(`ReportGenerationRun "${input.reportGenerationRunId}" not found`);
    }

    if (run.publications.some((p) => p.status === ReportPublicationStatus.PUBLISHED)) {
      throw new BadRequestException('Report has already been published; use correction workflow');
    }

    const definition = run.reportDefinitionVersion.reportDefinition;
    this.assertRequiredReviews(run.reviews, definition);
    this.assertApprovalsGranted(run.approvals);
    this.assertApprovedClaimsOnly(run.sections);
    this.assertNoExpiredClaims(run.sections, run.dataCutoffAt);
    this.assertSupportedMetrics(run.metricPins);
    this.assertAdverseFindingsPresent(run.frozenContent as Record<string, unknown>, run.sections);
    this.assertPublicReportConstraints(
      definition.reportType,
      input.classification,
      run.frozenContent as Record<string, unknown>,
      run.sections,
    );

    const evaluation = await this.prisma.authorityEvaluationRecord.findUnique({
      where: { id: input.authorityEvaluationRecordId },
    });
    if (evaluation?.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Publication requires successful authority evaluation');
    }

    const redactedContent = this.boundary.redactRestrictedContent(
      run.frozenContent as Record<string, unknown>,
      input.classification,
    );
    this.boundary.assertPublicReportDoesNotRevealProtectedDetails(
      input.classification,
      redactedContent,
    );

    const frozenSnapshotHash = hashReportContent(redactedContent);
    const publishedAt = new Date();

    const publication = await this.prisma.$transaction(async (tx) => {
      const created = await tx.reportPublication.create({
        data: {
          reportGenerationRunId: run.id,
          publisherIdentityId: input.publisherIdentityId,
          publisherOfficeholderId: input.publisherOfficeholderId,
          authorityEvaluationRecordId: input.authorityEvaluationRecordId,
          classification: input.classification,
          publishedAt,
          publicationReference: input.publicationReference,
          frozenSnapshotHash,
          frozenContent: redactedContent as Prisma.InputJsonValue,
          status: ReportPublicationStatus.PUBLISHED,
        },
      });

      await tx.reportGenerationRun.update({
        where: { id: run.id },
        data: { status: ReportGenerationRunStatus.PUBLISHED },
      });

      return created;
    });

    return {
      publicationId: publication.id,
      frozenSnapshotHash,
      publishedAt,
      disclaimer:
        'Published report content is immutable. Later database changes do not rewrite published reports.',
    };
  }

  private assertRequiredReviews(
    reviews: { reviewType: string; status: ReportReviewStatus }[],
    definition: {
      requiresPrivacyReview: boolean;
      requiresSecurityReview: boolean;
      requiresRecordsReview: boolean;
    },
  ): void {
    const required: { type: string; label: string }[] = [];
    if (definition.requiresPrivacyReview) {
      required.push({ type: 'PRIVACY', label: 'privacy review' });
    }
    if (definition.requiresSecurityReview) {
      required.push({ type: 'SECURITY', label: 'security review' });
    }
    if (definition.requiresRecordsReview) {
      required.push({ type: 'RECORDS', label: 'records review' });
    }

    for (const req of required) {
      const review = reviews.find((r) => r.reviewType === req.type);
      if (review?.status !== ReportReviewStatus.SATISFACTORY) {
        throw new BadRequestException(`Publication requires satisfactory ${req.label}`);
      }
    }
  }

  private assertApprovedClaimsOnly(
    claims: { status: ReportClaimStatus; isOfficialClaim: boolean }[],
  ): void {
    const unapproved = claims.filter(
      (c) => c.status !== ReportClaimStatus.APPROVED || !c.isOfficialClaim,
    );
    if (unapproved.length > 0) {
      throw new BadRequestException('Publication requires approved official claims only');
    }
  }

  private assertNoExpiredClaims(
    claims: {
      status: ReportClaimStatus;
      institutionalMetricClaim: {
        status: InstitutionalMetricClaimStatus;
        validUntil: Date | null;
        revalidationState: string;
      };
    }[],
    dataCutoffAt: Date,
  ): void {
    for (const claim of claims) {
      const pc = claim.institutionalMetricClaim;
      if (pc.status === InstitutionalMetricClaimStatus.EXPIRED) {
        throw new BadRequestException(
          'Report cannot publish expired institutional metric claim as current',
        );
      }
      if (pc.validUntil && pc.validUntil < dataCutoffAt) {
        throw new BadRequestException(
          'Report cannot publish claim that expired before the report data cutoff',
        );
      }
      if (pc.revalidationState !== 'CURRENT') {
        throw new BadRequestException(
          'Report cannot publish claim that is not in current revalidation state',
        );
      }
    }
  }

  private assertSupportedMetrics(metricPins: { metricCalculationRun: { status: string } }[]): void {
    const unsupported = metricPins.filter(
      (pin) => pin.metricCalculationRun.status !== 'CALCULATED',
    );
    if (unsupported.length > 0) {
      throw new BadRequestException(
        'Report cannot publish unsupported or failed metric calculations',
      );
    }
  }

  private assertApprovalsGranted(
    approvals: { status: ReportApprovalStatus; isAiActor: boolean }[],
  ): void {
    if (approvals.some((a) => a.isAiActor)) {
      throw new ForbiddenException('AI cannot approve publication');
    }
    const approved = approvals.some((a) => a.status === ReportApprovalStatus.APPROVED);
    if (!approved) {
      throw new BadRequestException('Publication requires at least one human approval');
    }
  }

  private assertAdverseFindingsPresent(
    frozenContent: Record<string, unknown>,
    claims: { outcomeClassification: string }[],
  ): void {
    const requiredOutcomes = Array.isArray(frozenContent.requiredOutcomeClassifications)
      ? (frozenContent.requiredOutcomeClassifications as string[])
      : [];
    const includedOutcomes = claims.map((c) => c.outcomeClassification);
    this.boundary.assertAdverseFindingsNotSuppressed(requiredOutcomes, includedOutcomes);
  }

  private assertPublicReportConstraints(
    reportType: ReportType,
    classification: ReportClassification,
    content: Record<string, unknown>,
    claims: {
      causationDeclared: boolean;
      representsGovernmentStatistic: boolean;
      governmentStatisticConfirmed: boolean;
      institutionalMetricClaim: { associationOnly: boolean };
    }[],
  ): void {
    if (reportType !== ReportType.PUBLIC && classification !== ReportClassification.PUBLIC) {
      return;
    }

    for (const claim of claims) {
      this.boundary.assertPublicReportCannotDeclareCausation(
        reportType,
        claim.causationDeclared,
        claim.institutionalMetricClaim.associationOnly,
      );
      this.boundary.assertGovernmentStatisticConfirmationRequired(
        claim.representsGovernmentStatistic,
        claim.governmentStatisticConfirmed,
      );
    }

    this.boundary.assertPublicReportDoesNotRevealProtectedDetails(classification, content);
  }
}
