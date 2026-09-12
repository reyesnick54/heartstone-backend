import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CaseEventType,
  CaseReferralResponseAuthStatus,
  CaseReferralStatus,
  CaseReferralType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CaseEventsService } from '../cases/case-events.service';

export interface CreateReferralInput {
  caseId: string;
  referralType: CaseReferralType;
  externalAuthorityId?: string;
  institutionId?: string;
  authorityDependencyId?: string;
  referralBasis?: string;
  scope?: string;
  actorIdentityId: string;
}

export interface RecordReferralResponseInput {
  caseReferralId: string;
  responseReference: string;
  responseSummary: string;
  authenticationStatus: CaseReferralResponseAuthStatus;
  satisfiesDependency?: boolean;
  actorIdentityId: string;
}

@Injectable()
export class CaseReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseEvents: CaseEventsService,
  ) {}

  async createReferral(input: CreateReferralInput) {
    const referral = await this.prisma.caseReferral.create({
      data: {
        caseId: input.caseId,
        referralType: input.referralType,
        externalAuthorityId: input.externalAuthorityId,
        institutionId: input.institutionId,
        authorityDependencyId: input.authorityDependencyId,
        referralBasis: input.referralBasis,
        scope: input.scope,
        status: CaseReferralStatus.PENDING,
      },
    });

    await this.caseEvents.record(
      input.caseId,
      CaseEventType.REFERRAL_CREATED,
      {
        referralId: referral.id,
        referralType: input.referralType,
      },
      input.actorIdentityId,
    );

    return referral;
  }

  async acknowledgeReferral(caseReferralId: string, actorIdentityId: string) {
    const referral = await this.prisma.caseReferral.update({
      where: { id: caseReferralId },
      data: {
        status: CaseReferralStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
      },
    });

    await this.caseEvents.record(
      referral.caseId,
      CaseEventType.REFERRAL_ACKNOWLEDGED,
      {
        referralId: caseReferralId,
      },
      actorIdentityId,
    );

    return referral;
  }

  async recordResponse(input: RecordReferralResponseInput) {
    const referral = await this.prisma.caseReferral.findUnique({
      where: { id: input.caseReferralId },
      include: { authorityDependency: true },
    });

    if (!referral) {
      throw new NotFoundException('Case referral not found');
    }

    if (input.authenticationStatus !== CaseReferralResponseAuthStatus.AUTHENTICATED) {
      await this.prisma.caseReferralResponse.create({
        data: {
          caseReferralId: input.caseReferralId,
          responseReference: input.responseReference,
          responseSummary: input.responseSummary,
          authenticationStatus: input.authenticationStatus,
          satisfiesDependency: false,
        },
      });

      await this.caseEvents.record(
        referral.caseId,
        CaseEventType.REFERRAL_RESPONSE_RECEIVED,
        {
          referralId: input.caseReferralId,
          authenticated: false,
        },
        input.actorIdentityId,
      );

      throw new ForbiddenException(
        'Unauthenticated external response cannot satisfy consequential dependency gate',
      );
    }

    const satisfiesDependency = input.satisfiesDependency ?? false;

    const response = await this.prisma.caseReferralResponse.create({
      data: {
        caseReferralId: input.caseReferralId,
        responseReference: input.responseReference,
        responseSummary: input.responseSummary,
        authenticationStatus: input.authenticationStatus,
        satisfiesDependency,
      },
    });

    await this.prisma.caseReferral.update({
      where: { id: input.caseReferralId },
      data: { status: CaseReferralStatus.RESPONDED },
    });

    await this.caseEvents.record(
      referral.caseId,
      CaseEventType.REFERRAL_RESPONSE_RECEIVED,
      {
        referralId: input.caseReferralId,
        authenticated: true,
        satisfiesDependency,
      },
      input.actorIdentityId,
    );

    return response;
  }
}
