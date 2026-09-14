import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ExternalReviewRouteType,
  ExternalReviewStatus,
  ExternalReviewTransmissionMethod,
  RetainedAppealAuthorityClass,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ExternalReviewBoundaryService } from '../common/external-review-boundary.service';
import { RedressMatterService } from '../matters/redress-matter.service';
import {
  EXTERNAL_REVIEW_NOT_INTERNAL_ADJUDICATION_MESSAGE,
  EXTERNAL_REVIEW_REFERRAL_NUMBER_PREFIX,
  PHASE_10F_BOUNDARY_DISCLAIMER,
} from '../redress.constants';

export interface CreateExternalReviewReferralInput {
  redressMatterId: string;
  caseId?: string;
  routeType: ExternalReviewRouteType;
  competentAuthority: string;
  externalAuthorityId?: string;
  routeVersion: string;
  authorityPurpose: string;
  standingRecordReference?: string;
  timelinessRecordReference?: string;
  challengedDecisionId?: string;
  challengedInstrumentId?: string;
  grounds: string;
  requestedRemedy?: string;
  securityClassification: string;
  transmissionMethod?: ExternalReviewTransmissionMethod;
  retainedAuthorityClass?: RetainedAppealAuthorityClass;
  preparedByIdentityId?: string;
}

export interface TransmitExternalReviewReferralInput {
  referralId: string;
  transmissionMethod: ExternalReviewTransmissionMethod;
  externalReference?: string;
}

export interface RecordExternalReviewStatusInput {
  referralId: string;
  status: ExternalReviewStatus;
  sourceAuthority?: string;
  sourceReference?: string;
  notes?: string;
  isAuthenticated?: boolean;
}

@Injectable()
export class ExternalReviewReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ExternalReviewBoundaryService,
    private readonly redressMatterService: RedressMatterService,
  ) {}

  async create(input: CreateExternalReviewReferralInput) {
    const matter = await this.redressMatterService.findById(input.redressMatterId);
    const retainsNationalAuthority =
      matter.retainsNationalAppealAuthority ||
      this.boundary.isRetainedAppealAuthority(input.retainedAuthorityClass);

    const sequence = await this.prisma.externalReviewReferral.count();
    const referralNumber = `${EXTERNAL_REVIEW_REFERRAL_NUMBER_PREFIX}-${String(sequence + 1).padStart(6, '0')}`;

    const referral = await this.prisma.externalReviewReferral.create({
      data: {
        referralNumber,
        redressMatterId: input.redressMatterId,
        caseId: input.caseId ?? matter.caseId,
        routeType: input.routeType,
        competentAuthority: input.competentAuthority,
        externalAuthorityId: input.externalAuthorityId,
        routeVersion: input.routeVersion,
        authorityPurpose: input.authorityPurpose,
        standingRecordReference: input.standingRecordReference,
        timelinessRecordReference: input.timelinessRecordReference,
        challengedDecisionId: input.challengedDecisionId ?? matter.challengedDecisionId,
        challengedInstrumentId: input.challengedInstrumentId ?? matter.challengedInstrumentId,
        grounds: input.grounds,
        requestedRemedy: input.requestedRemedy,
        securityClassification: input.securityClassification,
        transmissionMethod: input.transmissionMethod,
        retainsNationalAuthority,
        retainedAuthorityClass: input.retainedAuthorityClass ?? matter.retainedAuthorityClass,
        blocksInternalAdjudication: retainsNationalAuthority || matter.blocksInternalAdjudication,
        preparedByIdentityId: input.preparedByIdentityId,
        status: ExternalReviewStatus.PREPARATION,
      },
    });

    await this.prisma.externalReviewStatusRecord.create({
      data: {
        referralId: referral.id,
        status: ExternalReviewStatus.PREPARATION,
        notes: EXTERNAL_REVIEW_NOT_INTERNAL_ADJUDICATION_MESSAGE,
      },
    });

    return this.withBoundaryMetadata(referral);
  }

  async markReadyForTransmission(referralId: string) {
    const referral = await this.getReferral(referralId);
    if (!referral.evidenceManifestReference) {
      throw new BadRequestException(
        'External review package with pinned evidence manifest is required before transmission',
      );
    }

    return this.updateStatus(referralId, ExternalReviewStatus.READY_FOR_TRANSMISSION);
  }

  async transmit(input: TransmitExternalReviewReferralInput) {
    const referral = await this.getReferral(input.referralId);
    if (referral.status !== ExternalReviewStatus.READY_FOR_TRANSMISSION) {
      throw new BadRequestException('Referral must be ready for transmission');
    }

    const updated = await this.prisma.externalReviewReferral.update({
      where: { id: input.referralId },
      data: {
        status: ExternalReviewStatus.TRANSMITTED,
        transmissionMethod: input.transmissionMethod,
        externalReference: input.externalReference,
        recordTransmitted: true,
        sentAt: new Date(),
      },
    });

    await this.recordStatus({
      referralId: input.referralId,
      status: ExternalReviewStatus.TRANSMITTED,
      sourceAuthority: referral.competentAuthority,
      sourceReference: input.externalReference,
    });

    return this.withBoundaryMetadata(updated);
  }

  async recordStatus(input: RecordExternalReviewStatusInput) {
    const referral = await this.getReferral(input.referralId);
    if (!this.boundary.canTransitionStatus(referral.status, input.status)) {
      throw new BadRequestException(`Cannot transition external review status from ${referral.status} to ${input.status}`);
    }

    await this.prisma.externalReviewStatusRecord.create({
      data: {
        referralId: input.referralId,
        status: input.status,
        sourceAuthority: input.sourceAuthority,
        sourceReference: input.sourceReference,
        notes: input.notes,
        isAuthenticated: input.isAuthenticated ?? false,
      },
    });

    const updated = await this.prisma.externalReviewReferral.update({
      where: { id: input.referralId },
      data: { status: input.status },
    });

    return this.withBoundaryMetadata(updated);
  }

  async getReferral(referralId: string) {
    const referral = await this.prisma.externalReviewReferral.findUnique({
      where: { id: referralId },
      include: {
        packages: { orderBy: { packageVersion: 'desc' } },
        statusRecords: { orderBy: { recordedAt: 'asc' } },
        determination: true,
      },
    });

    if (!referral) {
      throw new NotFoundException(`ExternalReviewReferral ${referralId} not found`);
    }

    return referral;
  }

  referralIsInternalAdjudication(): boolean {
    return this.boundary.referralIsInternalAdjudication();
  }

  private async updateStatus(referralId: string, status: ExternalReviewStatus) {
    await this.recordStatus({ referralId, status });
    return this.getReferral(referralId);
  }

  private withBoundaryMetadata<T extends object>(record: T) {
    return {
      ...record,
      boundaryDisclaimer: PHASE_10F_BOUNDARY_DISCLAIMER,
      isInternalAdjudication: false,
    };
  }
}
