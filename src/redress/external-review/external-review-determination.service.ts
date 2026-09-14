import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ExternalAuthorityBindingClass,
  ExternalDeterminationAuthenticityStatus,
  ExternalReviewStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ExternalReviewBoundaryService } from '../common/external-review-boundary.service';
import { ExternalReviewReferralService } from './external-review-referral.service';

export interface RecordExternalDeterminationInput {
  referralId: string;
  sourceAuthority: string;
  outcomeText: string;
  receivedDate: Date;
  officialReference?: string;
  decisionDate?: Date;
  reasonsReference?: string;
  effectiveDate?: Date;
  stayInterimEffect?: string;
  remedyText?: string;
  furtherRightsText?: string;
  instrumentOrderReference?: string;
  conditionsText?: string;
  implementationRequirements?: string;
  verificationMethod?: string;
  bindingClass?: ExternalAuthorityBindingClass;
  authenticityStatus?: ExternalDeterminationAuthenticityStatus;
  authenticityVerificationRef?: string;
  isAuthenticated?: boolean;
  recordedByIdentityId?: string;
  actorRoleMarker?: string;
  hasOfficeholderAuthority?: boolean;
}

export interface AuthorizeImplementationInput {
  referralId: string;
  actorRoleMarker?: string;
  hasOfficeholderAuthority?: boolean;
}

@Injectable()
export class ExternalReviewDeterminationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ExternalReviewBoundaryService,
    private readonly referralService: ExternalReviewReferralService,
  ) {}

  async record(input: RecordExternalDeterminationInput) {
    this.boundary.rejectClientProtectedFields(input as unknown as Record<string, unknown>);
    this.boundary.assertAiCannotDetermineOutcome({ actorRoleMarker: input.actorRoleMarker });
    this.boundary.assertTechnicalAdminCannotFabricateDetermination({
      actorRoleMarker: input.actorRoleMarker,
      hasOfficeholderAuthority: input.hasOfficeholderAuthority,
      markingAuthenticated: input.isAuthenticated,
    });

    const referral = await this.referralService.getReferral(input.referralId);
    if (referral.blocksInternalAdjudication) {
      this.boundary.assertNotInternalAdjudication({
        blocksInternalAdjudication: true,
        attemptingInternalOutcome: true,
      });
    }

    const isAuthenticated = input.isAuthenticated ?? false;
    const authenticityStatus =
      input.authenticityStatus ??
      (isAuthenticated
        ? ExternalDeterminationAuthenticityStatus.AUTHENTICATED
        : ExternalDeterminationAuthenticityStatus.UNVERIFIED);

    this.boundary.assertApprovedOutcomeRequiresAuthentication({
      outcomeText: input.outcomeText,
      isAuthenticated,
    });

    const bindingClass = input.bindingClass ?? ExternalAuthorityBindingClass.UNKNOWN;
    this.boundary.assertRecommendationNotBindingUnlessAuthenticated({
      bindingClass,
      isAuthenticated,
    });

    const existing = await this.prisma.externalReviewDetermination.findUnique({
      where: { referralId: input.referralId },
    });

    if (existing) {
      this.boundary.assertOutcomePreservesSourceWording({
        sourceOutcomeText: existing.outcomeText,
        proposedOutcomeText: input.outcomeText,
        sourceReference: existing.officialReference,
        proposedReference: input.officialReference,
      });
    }

    const determination = await this.prisma.externalReviewDetermination.upsert({
      where: { referralId: input.referralId },
      create: {
        referralId: input.referralId,
        sourceAuthority: input.sourceAuthority,
        outcomeText: input.outcomeText,
        receivedDate: input.receivedDate,
        officialReference: input.officialReference,
        decisionDate: input.decisionDate,
        reasonsReference: input.reasonsReference,
        effectiveDate: input.effectiveDate,
        stayInterimEffect: input.stayInterimEffect,
        remedyText: input.remedyText,
        furtherRightsText: input.furtherRightsText,
        instrumentOrderReference: input.instrumentOrderReference,
        conditionsText: input.conditionsText,
        implementationRequirements: input.implementationRequirements,
        verificationMethod: input.verificationMethod,
        bindingClass,
        authenticityStatus,
        authenticityVerificationRef: input.authenticityVerificationRef,
        isAuthenticated,
        implementationAuthorized: false,
        recordedByIdentityId: input.recordedByIdentityId,
      },
      update: {
        sourceAuthority: input.sourceAuthority,
        outcomeText: input.outcomeText,
        receivedDate: input.receivedDate,
        officialReference: input.officialReference,
        decisionDate: input.decisionDate,
        reasonsReference: input.reasonsReference,
        effectiveDate: input.effectiveDate,
        stayInterimEffect: input.stayInterimEffect,
        remedyText: input.remedyText,
        furtherRightsText: input.furtherRightsText,
        instrumentOrderReference: input.instrumentOrderReference,
        conditionsText: input.conditionsText,
        implementationRequirements: input.implementationRequirements,
        verificationMethod: input.verificationMethod,
        bindingClass,
        authenticityStatus,
        authenticityVerificationRef: input.authenticityVerificationRef,
        isAuthenticated,
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });

    await this.referralService.recordStatus({
      referralId: input.referralId,
      status: ExternalReviewStatus.EXTERNAL_DETERMINATION_RECEIVED,
      sourceAuthority: input.sourceAuthority,
      sourceReference: input.officialReference,
      isAuthenticated,
    });

    return determination;
  }

  async authorizeImplementation(input: AuthorizeImplementationInput) {
    this.boundary.assertTechnicalAdminCannotFabricateDetermination({
      actorRoleMarker: input.actorRoleMarker,
      hasOfficeholderAuthority: input.hasOfficeholderAuthority,
      markingAuthenticated: true,
    });

    const determination = await this.prisma.externalReviewDetermination.findUnique({
      where: { referralId: input.referralId },
    });

    if (!determination) {
      throw new NotFoundException('External review determination not found');
    }

    this.boundary.assertAuthenticatedBeforeImplementation({
      isAuthenticated: determination.isAuthenticated,
      implementationAuthorized: true,
      authenticityStatus: determination.authenticityStatus,
    });

    if (determination.bindingClass === ExternalAuthorityBindingClass.RECOMMENDATORY) {
      throw new ForbiddenException(
        'Recommendatory external outcome cannot be implemented as binding government action without separate authority',
      );
    }

    const updated = await this.prisma.externalReviewDetermination.update({
      where: { referralId: input.referralId },
      data: { implementationAuthorized: true },
    });

    await this.referralService.recordStatus({
      referralId: input.referralId,
      status: ExternalReviewStatus.IMPLEMENTATION_PENDING,
      isAuthenticated: true,
    });

    return updated;
  }

  async assertCannotImplementUnauthenticated(referralId: string): Promise<void> {
    const determination = await this.prisma.externalReviewDetermination.findUnique({
      where: { referralId },
    });

    if (!determination) {
      throw new NotFoundException('External review determination not found');
    }

    this.boundary.assertAuthenticatedBeforeImplementation({
      isAuthenticated: determination.isAuthenticated,
      implementationAuthorized: determination.implementationAuthorized,
      authenticityStatus: determination.authenticityStatus,
    });

    if (!determination.implementationAuthorized) {
      throw new BadRequestException('External determination implementation is not authorized');
    }
  }
}
