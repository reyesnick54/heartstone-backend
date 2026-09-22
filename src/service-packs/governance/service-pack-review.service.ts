import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ServicePackGovernanceAuditEventType,
  ServicePackGovernanceLifecycleStatus,
  ServicePackManifestValidationStatus,
  ServicePackReviewFindingStatus,
  ServicePackReviewStatus,
  ServicePackRevisionRequestStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { type AddReviewFindingDto } from './dto/add-review-finding.dto';
import { type CreateServicePackReviewDto } from './dto/create-service-pack-review.dto';
import { type RequestRevisionDto } from './dto/request-revision.dto';
import { type ResolveFindingDto } from './dto/resolve-finding.dto';
import { SERVICE_PACK_GOVERNANCE_REASON_CODES } from './service-pack-governance.constants';
import { ServicePackGovernanceAuditService } from './service-pack-governance-audit.service';
import { ServicePackGovernanceBoundaryService } from './service-pack-governance-boundary.service';
import { ServicePackReviewChainService } from './service-pack-review-chain.service';

@Injectable()
export class ServicePackReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ServicePackGovernanceBoundaryService,
    private readonly audit: ServicePackGovernanceAuditService,
    private readonly reviewChain: ServicePackReviewChainService,
  ) {}

  async listReviews(servicePackId: string) {
    return this.prisma.servicePackReview.findMany({
      where: { servicePackId },
      include: {
        findings: true,
        assignments: true,
        signoffs: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReview(servicePackId: string, actor: ActorContext, dto: CreateServicePackReviewDto) {
    this.boundary.rejectClientGovernanceIdentityFields(dto as unknown as Record<string, unknown>);

    const pack = await this.prisma.servicePack.findUnique({ where: { id: servicePackId } });
    if (!pack) {
      throw new NotFoundException(`Service pack ${servicePackId} not found`);
    }

    const version = await this.prisma.servicePackVersion.findFirst({
      where: { id: dto.servicePackVersionId, servicePackId },
    });
    if (!version) {
      throw new NotFoundException(`Service pack version ${dto.servicePackVersionId} not found`);
    }

    if (version.manifestValidationStatus !== ServicePackManifestValidationStatus.VALIDATED) {
      throw new BadRequestException(SERVICE_PACK_GOVERNANCE_REASON_CODES.NOT_VALIDATED);
    }

    const existingCount = await this.prisma.servicePackReview.count({
      where: { servicePackVersionId: version.id },
    });
    if (existingCount === 0) {
      await this.bootstrapConfiguredReviews(servicePackId, version.id, actor.identityId);
    }

    if (dto.reviewType) {
      const review = await this.prisma.servicePackReview.findFirst({
        where: { servicePackVersionId: version.id, reviewType: dto.reviewType },
      });
      if (!review) {
        throw new BadRequestException('Review type is not configured for this service pack');
      }
      return review;
    }

    const reviews = await this.listReviews(servicePackId);
    return reviews.filter((item) => item.servicePackVersionId === version.id);
  }

  async bootstrapConfiguredReviews(
    servicePackId: string,
    servicePackVersionId: string,
    actorIdentityId: string,
  ): Promise<void> {
    const pack = await this.prisma.servicePack.findUnique({ where: { id: servicePackId } });
    if (!pack) {
      return;
    }

    const steps = await this.reviewChain.resolveRequiredSteps({
      institutionId: pack.institutionId,
      servicePackId,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.servicePackVersion.update({
        where: { id: servicePackVersionId },
        data: {
          manifestValidationStatus: ServicePackManifestValidationStatus.PENDING_REVIEW,
          governanceLifecycleStatus: ServicePackGovernanceLifecycleStatus.IN_REVIEW,
        },
      });

      for (const step of steps) {
        const existing = await tx.servicePackReview.findFirst({
          where: {
            servicePackVersionId,
            reviewType: step.reviewType,
          },
        });
        if (existing) {
          continue;
        }
        const created = await tx.servicePackReview.create({
          data: {
            servicePackId,
            servicePackVersionId,
            reviewType: step.reviewType,
            status: ServicePackReviewStatus.OPEN,
            chainStepId: step.chainStepId,
            openedAt: new Date(),
          },
        });
        await this.audit.record(
          {
            servicePackId,
            servicePackVersionId,
            reviewId: created.id,
            eventType: ServicePackGovernanceAuditEventType.REVIEW_CREATED,
            actorIdentityId,
            metadata: { reviewType: step.reviewType, bootstrapped: true },
          },
          tx,
        );
      }
    });
  }

  async addFinding(
    servicePackId: string,
    reviewId: string,
    actor: ActorContext,
    dto: AddReviewFindingDto,
  ) {
    this.boundary.rejectClientGovernanceIdentityFields(dto as unknown as Record<string, unknown>);
    this.boundary.assertReviewerCommentDoesNotCreateAuthority(
      dto as unknown as Record<string, unknown>,
    );

    const review = await this.loadReviewForPack(servicePackId, reviewId);

    const finding = await this.prisma.$transaction(async (tx) => {
      const created = await tx.servicePackReviewFinding.create({
        data: {
          reviewId: review.id,
          findingCode: dto.findingCode,
          severity: dto.severity,
          category: dto.category,
          description: dto.description,
          affectedComponent: dto.affectedComponent,
          resolverIdentityId: dto.resolverIdentityId,
          evidenceReference: dto.evidenceReference,
          reporterIdentityId: actor.identityId,
        },
      });

      await this.audit.record(
        {
          servicePackId,
          servicePackVersionId: review.servicePackVersionId,
          reviewId: review.id,
          eventType: ServicePackGovernanceAuditEventType.FINDING_RECORDED,
          actorIdentityId: actor.identityId,
          metadata: { findingId: created.id, findingCode: created.findingCode },
        },
        tx,
      );

      return created;
    });

    return finding;
  }

  async resolveFinding(
    servicePackId: string,
    reviewId: string,
    findingId: string,
    actor: ActorContext,
    dto: ResolveFindingDto,
    authorityEvaluationAllowed: boolean,
  ) {
    this.boundary.rejectClientGovernanceIdentityFields(dto as unknown as Record<string, unknown>);

    const review = await this.loadReviewForPack(servicePackId, reviewId);
    const finding = await this.prisma.servicePackReviewFinding.findFirst({
      where: { id: findingId, reviewId: review.id },
    });
    if (!finding) {
      throw new NotFoundException(`Finding ${findingId} not found`);
    }

    this.boundary.assertAuthorityReviewCannotAuthenticateSourceUnlessPermitted({
      reviewType: review.reviewType,
      resolutionClaimsSourceAuthenticated: dto.governingSourceAuthenticated === true,
      authorityEvaluationAllowed,
    });

    const terminalStatuses: ServicePackReviewFindingStatus[] = [
      ServicePackReviewFindingStatus.RESOLVED,
      ServicePackReviewFindingStatus.DISMISSED,
      ServicePackReviewFindingStatus.ACCEPTED_RISK,
    ];
    const resolvedAt = terminalStatuses.includes(dto.status) ? new Date() : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const record = await tx.servicePackReviewFinding.update({
        where: { id: finding.id },
        data: {
          status: dto.status,
          resolutionNotes: dto.resolutionNotes,
          resolvedAt,
        },
      });

      await this.audit.record(
        {
          servicePackId,
          servicePackVersionId: review.servicePackVersionId,
          reviewId: review.id,
          eventType: ServicePackGovernanceAuditEventType.FINDING_RESOLVED,
          actorIdentityId: actor.identityId,
          metadata: { findingId: record.id, status: record.status },
        },
        tx,
      );

      return record;
    });

    return updated;
  }

  async requestRevision(
    servicePackId: string,
    reviewId: string,
    actor: ActorContext,
    dto: RequestRevisionDto,
  ) {
    const review = await this.loadReviewForPack(servicePackId, reviewId);

    const revision = await this.prisma.$transaction(async (tx) => {
      const created = await tx.servicePackRevisionRequest.create({
        data: {
          servicePackId,
          servicePackVersionId: review.servicePackVersionId,
          reviewId: review.id,
          requestedByIdentityId: actor.identityId,
          summary: dto.summary,
          status: ServicePackRevisionRequestStatus.OPEN,
        },
      });

      await tx.servicePackReview.update({
        where: { id: review.id },
        data: {
          status: ServicePackReviewStatus.COMPLETED,
          closedAt: new Date(),
        },
      });

      await tx.servicePackVersion.update({
        where: { id: review.servicePackVersionId },
        data: {
          governanceLifecycleStatus: ServicePackGovernanceLifecycleStatus.REVISION_REQUIRED,
          manifestValidationStatus: ServicePackManifestValidationStatus.PENDING_REVIEW,
        },
      });

      await this.audit.record(
        {
          servicePackId,
          servicePackVersionId: review.servicePackVersionId,
          reviewId: review.id,
          eventType: ServicePackGovernanceAuditEventType.REVISION_REQUESTED,
          actorIdentityId: actor.identityId,
          metadata: { revisionRequestId: created.id },
        },
        tx,
      );

      return created;
    });

    return revision;
  }

  async markReviewCompleted(
    servicePackId: string,
    reviewId: string,
    actorIdentityId: string,
  ): Promise<void> {
    const review = await this.loadReviewForPack(servicePackId, reviewId);
    await this.prisma.$transaction(async (tx) => {
      await tx.servicePackReview.update({
        where: { id: review.id },
        data: {
          status: ServicePackReviewStatus.COMPLETED,
          closedAt: new Date(),
        },
      });
      await this.audit.record(
        {
          servicePackId,
          servicePackVersionId: review.servicePackVersionId,
          reviewId: review.id,
          eventType: ServicePackGovernanceAuditEventType.REVIEW_COMPLETED,
          actorIdentityId,
        },
        tx,
      );
    });
  }

  async assertRequiredReviewsComplete(servicePackVersionId: string): Promise<void> {
    const version = await this.prisma.servicePackVersion.findUnique({
      where: { id: servicePackVersionId },
      include: { servicePack: true, reviews: { include: { findings: true } } },
    });
    if (!version) {
      throw new NotFoundException(`Service pack version ${servicePackVersionId} not found`);
    }

    const steps = await this.reviewChain.resolveRequiredSteps({
      institutionId: version.servicePack.institutionId,
      servicePackId: version.servicePackId,
    });

    for (const step of steps.filter((item) => item.required)) {
      const review = version.reviews.find((candidate) => candidate.reviewType === step.reviewType);
      if (review?.status !== ServicePackReviewStatus.COMPLETED) {
        throw new BadRequestException(SERVICE_PACK_GOVERNANCE_REASON_CODES.REVIEWS_INCOMPLETE);
      }
    }

    const allFindings = version.reviews.flatMap((review) => review.findings);
    this.boundary.assertNoBlockingFindings(allFindings);
  }

  private async loadReviewForPack(servicePackId: string, reviewId: string) {
    const review = await this.prisma.servicePackReview.findFirst({
      where: { id: reviewId, servicePackId },
    });
    if (!review) {
      throw new NotFoundException(`Review ${reviewId} not found for service pack ${servicePackId}`);
    }
    return review;
  }
}
