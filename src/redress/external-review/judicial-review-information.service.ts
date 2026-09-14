import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExternalReviewRouteType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ExternalReviewBoundaryService } from '../common/external-review-boundary.service';
import { JUDICIAL_ROUTE_NOT_COURT_MESSAGE } from '../redress.constants';
import { ExternalReviewReferralService } from './external-review-referral.service';

export interface CreateJudicialReviewInformationInput {
  redressMatterId: string;
  routeInformation: string;
  competentForum: string;
  competentAuthority: string;
  routeVersion: string;
  authorityPurpose: string;
  grounds: string;
  securityClassification: string;
  deadlineInformation?: string;
  filingReference?: string;
  exportAssistanceReference?: string;
  preparedByIdentityId?: string;
}

export interface UpdateJudicialCaseStatusInput {
  referralId: string;
  caseStatusText: string;
  caseStatusAuthenticated: boolean;
  outcomeCharacterization?: string;
  outcomeAuthenticated?: boolean;
}

@Injectable()
export class JudicialReviewInformationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ExternalReviewBoundaryService,
    private readonly referralService: ExternalReviewReferralService,
  ) {}

  async create(input: CreateJudicialReviewInformationInput) {
    this.boundary.assertJudicialRouteIsNotCourt({ isCourtSystem: false });

    const referral = await this.referralService.create({
      redressMatterId: input.redressMatterId,
      routeType: ExternalReviewRouteType.JUDICIAL_REVIEW,
      competentAuthority: input.competentAuthority,
      routeVersion: input.routeVersion,
      authorityPurpose: input.authorityPurpose,
      grounds: input.grounds,
      securityClassification: input.securityClassification,
      preparedByIdentityId: input.preparedByIdentityId,
      retainedAuthorityClass: undefined,
    });

    const judicial = await this.prisma.judicialReviewInformationRecord.create({
      data: {
        referralId: referral.id,
        redressMatterId: input.redressMatterId,
        routeInformation: input.routeInformation,
        deadlineInformation: input.deadlineInformation,
        competentForum: input.competentForum,
        filingReference: input.filingReference,
        exportAssistanceReference: input.exportAssistanceReference,
        isCourtSystem: false,
        caseStatusAuthenticated: false,
        outcomeAuthenticated: false,
      },
    });

    return {
      ...judicial,
      referral,
      boundaryMessage: JUDICIAL_ROUTE_NOT_COURT_MESSAGE,
    };
  }

  async updateCaseStatus(input: UpdateJudicialCaseStatusInput) {
    this.boundary.assertJudicialOutcomeRequiresAuthentication({
      outcomeCharacterization: input.outcomeCharacterization,
      outcomeAuthenticated: input.outcomeAuthenticated ?? false,
    });

    const judicial = await this.prisma.judicialReviewInformationRecord.findUnique({
      where: { referralId: input.referralId },
    });

    if (!judicial) {
      throw new NotFoundException('Judicial review information record not found');
    }

    if (input.caseStatusText && !input.caseStatusAuthenticated) {
      throw new BadRequestException(
        'Case status from external court must be marked authenticated when recorded',
      );
    }

    return this.prisma.judicialReviewInformationRecord.update({
      where: { referralId: input.referralId },
      data: {
        caseStatusText: input.caseStatusText,
        caseStatusAuthenticated: input.caseStatusAuthenticated,
        outcomeCharacterization: input.outcomeCharacterization,
        outcomeAuthenticated: input.outcomeAuthenticated ?? false,
      },
    });
  }
}
