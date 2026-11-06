import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  RedressMatterStatus,
  RedressRouteVersionStatus,
  RetainedAppealAuthorityClass,
  ReviewInterimEffect,
  ReviewStayStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { ScopedResourceType } from '../../institutional-scope/institutional-scope.types';
import { ResourceAccessService } from '../../institutional-scope/resource-access.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { REDRESS_MATTER_NUMBER_PREFIX } from '../redress.constants';

export interface FileRedressMatterInput {
  routeVersionId: string;
  challengedDecisionId: string;
  challengedInstrumentId?: string;
  caseId?: string;
  masterAdministrativeFileId?: string;
  appellantIdentityId?: string;
  appellantOfficeholderId?: string;
  originalDecisionMakerOfficeholderId?: string;
  reviewRoute: string;
  reviewAuthority: string;
  groundsReference?: string;
  /** Grounds in the appellant's own words, stored verbatim on the review reference. */
  groundsStatement?: string;
  filedAt?: Date;
  deadline?: Date;
}

type RedressDbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class RedressMatterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
    private readonly resourceAccess: ResourceAccessService,
  ) {}

  /**
   * Files a redress matter. Pass `db` to file inside a caller's transaction (for example one
   * that holds a duplicate-filing lock); the matter is then returned as read in that transaction.
   */
  async fileMatter(input: FileRedressMatterInput, db: RedressDbClient = this.prisma) {
    const routeVersion = await db.redressRouteVersion.findUnique({
      where: { id: input.routeVersionId },
    });

    if (!routeVersion) {
      throw new NotFoundException(`RedressRouteVersion ${input.routeVersionId} not found`);
    }

    if (routeVersion.status !== RedressRouteVersionStatus.ACTIVE) {
      throw new BadRequestException(
        'Redress matter may be filed only against an active route version',
      );
    }

    const challengedDecision = await db.governmentDecision.findUnique({
      where: { id: input.challengedDecisionId },
    });

    if (!challengedDecision) {
      throw new NotFoundException(`GovernmentDecision ${input.challengedDecisionId} not found`);
    }

    const filedAt = input.filedAt ?? new Date();
    const redressMatterNumber = `${REDRESS_MATTER_NUMBER_PREFIX}-${String(Date.now())}-${input.challengedDecisionId.slice(0, 8)}`;

    const reviewReference = await db.decisionReviewReference.create({
      data: {
        challengedDecisionId: input.challengedDecisionId,
        challengedInstrumentId: input.challengedInstrumentId,
        reviewRoute: input.reviewRoute,
        reviewAuthority: input.reviewAuthority,
        filedAt,
        deadline: input.deadline,
        appellantIdentityId: input.appellantIdentityId,
        appellantOfficeholderId: input.appellantOfficeholderId,
        groundsReference: input.groundsReference,
        groundsStatement: input.groundsStatement,
        interimEffect: ReviewInterimEffect.NONE,
        stayStatus: ReviewStayStatus.NONE,
      },
    });

    this.boundary.assertFilingDoesNotAutoStay(routeVersion.automaticStayOnFiling, false);

    const matter = await db.redressMatter.create({
      data: {
        redressMatterNumber,
        routeVersionId: input.routeVersionId,
        decisionReviewReferenceId: reviewReference.id,
        challengedDecisionId: input.challengedDecisionId,
        challengedInstrumentId: input.challengedInstrumentId,
        caseId: input.caseId ?? challengedDecision.caseId,
        masterAdministrativeFileId:
          input.masterAdministrativeFileId ?? challengedDecision.masterAdministrativeFileId,
        appellantIdentityId: input.appellantIdentityId,
        appellantOfficeholderId: input.appellantOfficeholderId,
        originalDecisionMakerOfficeholderId:
          input.originalDecisionMakerOfficeholderId ??
          challengedDecision.decisionMakerOfficeholderId,
        status: RedressMatterStatus.FILED,
        filedAt,
      },
    });

    if (routeVersion.automaticStayOnFiling) {
      await db.decisionReviewReference.update({
        where: { id: reviewReference.id },
        data: {
          interimEffect: ReviewInterimEffect.FULL_STAY,
          stayStatus: ReviewStayStatus.INTERIM_STAY_AUTHORIZED,
        },
      });
    }

    return this.findById(matter.id, undefined, db);
  }

  async markRetainedNationalAuthority(
    redressMatterId: string,
    retainedAuthorityClass: RetainedAppealAuthorityClass,
  ) {
    return this.prisma.redressMatter.update({
      where: { id: redressMatterId },
      data: {
        retainsNationalAppealAuthority: true,
        blocksInternalAdjudication: true,
        retainedAuthorityClass,
      },
    });
  }

  async assertBlocksInternalAdjudication(redressMatterId: string): Promise<void> {
    const matter = await this.findById(redressMatterId);
    if (matter.blocksInternalAdjudication) {
      throw new BadRequestException(
        'Internal adjudication is blocked for this redress matter; external coordination only',
      );
    }
  }

  async findById(id: string, session?: SessionContextDto, db: RedressDbClient = this.prisma) {
    if (session) {
      await this.resourceAccess.assertVisibility(session, ScopedResourceType.REDRESS_MATTER, id);
    }

    const matter = await db.redressMatter.findUnique({
      where: { id },
      include: {
        routeVersion: true,
        decisionReviewReference: true,
        challengedDecision: true,
        reviewStayRecords: true,
        interimReliefRequests: true,
        redressDecisions: true,
        externalReviewReferrals: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${id} not found`);
    }

    return matter;
  }
}
