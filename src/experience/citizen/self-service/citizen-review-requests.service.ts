import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RedressMatterStatus, RedressRouteVersionStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { SecurityAuditService } from '../../../identity/audit/security-audit.service';
import { type SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { ACTIVE_REDRESS_MATTER_STATUSES } from '../../../redress/common/active-redress-matter-statuses.constants';
import { RedressMatterService } from '../../../redress/matters/redress-matter.service';
import {
  CITIZEN_REVIEW_REQUEST_DISCLAIMER,
  CITIZEN_REVIEWABLE_DECISION_STATUSES,
  CITIZEN_SELF_SERVICE_ERROR_CODES,
} from './citizen-self-service.constants';
import {
  type CitizenReviewOverviewDto,
  type CitizenReviewRequestDto,
  type CreateCitizenReviewRequestDto,
} from './dto/citizen-self-service.dto';

type FiledMatter = Prisma.RedressMatterGetPayload<{
  include: { decisionReviewReference: true };
}>;

/**
 * Citizen requests for review of a decision on their own case. Filing goes through the
 * existing RedressMatterService against a review route configured on the service version the
 * case was opened under; the citizen never chooses a route version or a reviewer.
 */
@Injectable()
export class CitizenReviewRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redressMatters: RedressMatterService,
    private readonly audit: SecurityAuditService,
  ) {}

  async getOverview(identityId: string, caseId: string): Promise<CitizenReviewOverviewDto> {
    const caseRecord = await this.findOwnCase(identityId, caseId);

    const [decisions, routes, matters] = await Promise.all([
      this.prisma.governmentDecision.findMany({
        where: {
          caseId: caseRecord.id,
          decisionStatus: { in: [...CITIZEN_REVIEWABLE_DECISION_STATUSES] },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.listAvailableRoutes(caseRecord.governmentServiceVersionId),
      this.listOwnMatters(identityId, caseRecord.id),
    ]);

    return {
      caseId: caseRecord.id,
      caseReference: caseRecord.caseNumber,
      reviewableDecisions: decisions.map((decision) => ({
        decisionId: decision.id,
        decisionNumber: decision.decisionNumber,
        decisionStatus: decision.decisionStatus,
        outcome: decision.outcome,
        outcomeSummary: decision.outcomeSummary,
        decidedAt: decision.decidedAt?.toISOString() ?? null,
        reviewRequestAllowed:
          routes.length > 0 &&
          !matters.some(
            (matter) =>
              matter.challengedDecisionId === decision.id &&
              ACTIVE_REDRESS_MATTER_STATUSES.includes(matter.status),
          ),
      })),
      routes: routes.map((route) => ({
        routeCode: route.routeCode,
        label: route.label,
        description: route.description,
        automaticStayOnFiling: route.activeVersion.automaticStayOnFiling,
      })),
      requests: matters.map((matter) => this.toDto(matter)),
      disclaimer: CITIZEN_REVIEW_REQUEST_DISCLAIMER,
    };
  }

  async fileReviewRequest(
    session: SessionContextDto,
    caseId: string,
    dto: CreateCitizenReviewRequestDto,
  ): Promise<CitizenReviewRequestDto> {
    const identityId = session.identityId;
    const caseRecord = await this.findOwnCase(identityId, caseId);

    const decision = await this.prisma.governmentDecision.findFirst({
      where: { id: dto.decisionId, caseId: caseRecord.id },
    });
    if (!decision) {
      throw new NotFoundException('Decision not found');
    }
    if (!CITIZEN_REVIEWABLE_DECISION_STATUSES.includes(decision.decisionStatus)) {
      throw new ConflictException({
        message: 'This decision cannot be reviewed in its current state',
        code: CITIZEN_SELF_SERVICE_ERROR_CODES.DECISION_NOT_REVIEWABLE,
      });
    }

    const route = (await this.listAvailableRoutes(caseRecord.governmentServiceVersionId)).find(
      (candidate) => candidate.routeCode === dto.routeCode,
    );
    if (!route) {
      throw new NotFoundException({
        message: 'Review route is not available for this service',
        code: CITIZEN_SELF_SERVICE_ERROR_CODES.REVIEW_ROUTE_NOT_AVAILABLE,
      });
    }

    const matter = await this.prisma.$transaction(async (tx) => {
      // Serialize filings for this decision and appellant so a retried or double-clicked
      // submission cannot create two matters.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`citizen-review:${decision.id}:${identityId}`}))`;

      const prior = await tx.redressMatter.findMany({
        where: {
          challengedDecisionId: decision.id,
          appellantIdentityId: identityId,
          status: { not: RedressMatterStatus.WITHDRAWN },
        },
        include: { decisionReviewReference: true },
      });
      const duplicate = prior.find(
        (existing) =>
          ACTIVE_REDRESS_MATTER_STATUSES.includes(existing.status) ||
          existing.decisionReviewReference?.reviewRoute === route.routeCode,
      );
      if (duplicate) {
        throw new ConflictException({
          message: `A review of this decision has already been requested (${duplicate.redressMatterNumber})`,
          code: CITIZEN_SELF_SERVICE_ERROR_CODES.REVIEW_ALREADY_REQUESTED,
        });
      }

      return this.redressMatters.fileMatter(
        {
          routeVersionId: route.activeVersion.id,
          challengedDecisionId: decision.id,
          caseId: caseRecord.id,
          appellantIdentityId: identityId,
          reviewRoute: route.routeCode,
          reviewAuthority: route.activeVersion.functionAuthorityRecord.name,
          groundsStatement: dto.groundsStatement,
        },
        tx,
      );
    });

    await this.audit.record({
      eventType: 'PROTECTED_ENDPOINT_ACCESS',
      identityId,
      sessionId: session.sessionId,
      actorIdentityId: identityId,
      metadata: {
        action: 'CITIZEN_REVIEW_REQUEST_FILED',
        caseId: caseRecord.id,
        decisionId: decision.id,
        redressMatterId: matter.id,
        redressMatterNumber: matter.redressMatterNumber,
        routeCode: route.routeCode,
        routeVersionId: route.activeVersion.id,
      },
    });

    return this.toDto(matter);
  }

  /** 404 (not 403) for cases that are not the citizen's own, so ids cannot be probed. */
  private async findOwnCase(identityId: string, caseId: string) {
    const caseRecord = await this.prisma.case.findFirst({
      where: { id: caseId, applicantIdentityId: identityId },
      select: { id: true, caseNumber: true, governmentServiceVersionId: true },
    });
    if (!caseRecord) {
      throw new NotFoundException('Case not found');
    }
    return caseRecord;
  }

  /** Routes on the case's service version with exactly one currently effective active version. */
  private async listAvailableRoutes(governmentServiceVersionId: string) {
    const now = new Date();
    const routes = await this.prisma.governmentServiceRedressRoute.findMany({
      where: { governmentServiceVersionId },
      include: {
        routeVersions: {
          where: {
            status: RedressRouteVersionStatus.ACTIVE,
            AND: [
              { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
              { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }] },
            ],
          },
          include: { functionAuthorityRecord: { select: { id: true, name: true } } },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { routeCode: 'asc' }],
    });

    return routes.flatMap((route) => {
      const activeVersion = route.routeVersions[0];
      return activeVersion ? [{ ...route, activeVersion }] : [];
    });
  }

  private listOwnMatters(identityId: string, caseId: string): Promise<FiledMatter[]> {
    return this.prisma.redressMatter.findMany({
      where: { caseId, appellantIdentityId: identityId },
      include: { decisionReviewReference: true },
      orderBy: { filedAt: 'desc' },
    });
  }

  private toDto(matter: FiledMatter): CitizenReviewRequestDto {
    const reference = matter.decisionReviewReference;
    return {
      id: matter.id,
      reference: matter.redressMatterNumber,
      status: matter.status,
      decisionId: matter.challengedDecisionId,
      routeCode: reference?.reviewRoute ?? null,
      filedAt: matter.filedAt.toISOString(),
      groundsStatement: reference?.groundsStatement ?? null,
      interimEffect: reference?.interimEffect ?? 'NONE',
      stayStatus: reference?.stayStatus ?? 'NONE',
      disclaimer: CITIZEN_REVIEW_REQUEST_DISCLAIMER,
    };
  }
}
