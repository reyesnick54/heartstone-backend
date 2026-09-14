import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  ExternalDeterminationAuthenticity,
  ExternalReviewReferralStatus,
  RedressMatterStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface CreateReferralInput {
  matterId: string;
  externalAuthorityLabel: string;
}

export interface PackageReferralInput {
  referralId: string;
  packageReference: string;
}

export interface RecordDeterminationInput {
  referralId: string;
  determinationReference: string;
  authenticity: ExternalDeterminationAuthenticity;
  implementerIdentityId?: string;
  implementerOfficeholderId?: string;
  functionAuthorityRecordId?: string;
}

@Injectable()
export class ExternalReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly actorResolver: InstitutionalActorResolver,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async createReferral(input: CreateReferralInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'external review referral');

    const referral = await this.prisma.externalReviewReferral.create({
      data: {
        matterId: input.matterId,
        externalAuthorityLabel: input.externalAuthorityLabel,
        status: ExternalReviewReferralStatus.PREPARING,
      },
    });

    await this.prisma.redressMatter.update({
      where: { id: input.matterId },
      data: { status: RedressMatterStatus.EXTERNAL_REFERRAL },
    });

    return referral;
  }

  async packageReferral(input: PackageReferralInput) {
    const referral = await this.prisma.externalReviewReferral.findUnique({
      where: { id: input.referralId },
      include: { packages: true },
    });

    if (!referral) {
      throw new NotFoundException(`ExternalReviewReferral ${input.referralId} not found`);
    }

    const versionNumber = referral.packages.length + 1;
    const packageHash = createHash('sha256').update(input.packageReference, 'utf8').digest('hex');

    const pkg = await this.prisma.externalReviewPackage.create({
      data: {
        referralId: input.referralId,
        versionNumber,
        packageReference: input.packageReference,
        packageHash,
      },
    });

    await this.prisma.externalReviewReferral.update({
      where: { id: input.referralId },
      data: {
        status: ExternalReviewReferralStatus.TRANSMITTED,
        transmittedAt: new Date(),
      },
    });

    return pkg;
  }

  async recordDetermination(input: RecordDeterminationInput) {
    const referral = await this.prisma.externalReviewReferral.findUnique({
      where: { id: input.referralId },
    });

    if (!referral) {
      throw new NotFoundException(`ExternalReviewReferral ${input.referralId} not found`);
    }

    const determination = await this.prisma.externalReviewDetermination.create({
      data: {
        referralId: input.referralId,
        determinationReference: input.determinationReference,
        authenticity: input.authenticity,
        receivedAt: new Date(),
      },
    });

    if (input.authenticity === ExternalDeterminationAuthenticity.UNVERIFIED) {
      await this.safeHalt.triggerSafeHalt({
        matterId: referral.matterId,
        reason: this.safeHalt.forExternalAuthenticity(),
      });
    }

    await this.prisma.externalReviewReferral.update({
      where: { id: input.referralId },
      data: { status: ExternalReviewReferralStatus.DETERMINATION_RECEIVED },
    });

    return determination;
  }

  async implementDetermination(
    determinationId: string,
    implementerIdentityId: string,
    implementerOfficeholderId: string,
    functionAuthorityRecordId: string,
  ) {
    const determination = await this.prisma.externalReviewDetermination.findUnique({
      where: { id: determinationId },
      include: { referral: true },
    });

    if (!determination) {
      throw new NotFoundException(`ExternalReviewDetermination ${determinationId} not found`);
    }

    if (determination.authenticity !== ExternalDeterminationAuthenticity.AUTHENTICATED) {
      throw new BadRequestException(
        'External determination must be authenticated before implementation',
      );
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: implementerIdentityId },
    });

    if (!identity?.type || !this.actorResolver.isHumanActor(identity.type)) {
      throw new ForbiddenException('Implementation requires human institutional actor');
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: implementerIdentityId,
      officeholderId: implementerOfficeholderId,
      functionAuthorityRecordId,
      action: AuthorityActionType.HEAR_REVIEW,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Implementation requires authority evaluation ALLOW');
    }

    const updated = await this.prisma.externalReviewDetermination.update({
      where: { id: determinationId },
      data: {
        authorityEvaluationRecordId: authorityResult.evaluationId,
        implementedAt: new Date(),
      },
    });

    await this.prisma.externalReviewReferral.update({
      where: { id: determination.referralId },
      data: { status: ExternalReviewReferralStatus.IMPLEMENTED },
    });

    await this.prisma.redressMatter.update({
      where: { id: determination.referral.matterId },
      data: { status: RedressMatterStatus.IMPLEMENTATION },
    });

    return updated;
  }
}
