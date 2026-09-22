import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { BenefitAwardLifecycleStatus, Prisma, SocialProtectionActorPersona } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SocialProtectionBoundaryService } from '../common/social-protection-boundary.service';
import { BENEFIT_AWARD_NUMBER_PREFIX } from '../social-protection.constants';

@Injectable()
export class BenefitAwardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: SocialProtectionBoundaryService,
  ) {}

  async createAuthoritativeAward(input: {
    benefitApplicationProfileId?: string;
    benefitProgramId: string;
    benefitProgramVersionId: string;
    governmentDecisionId?: string;
    actorPersona: SocialProtectionActorPersona;
    actorRoleMarker?: string;
    amountCents?: number;
    requiresHumanDecision?: boolean;
    humanDecisionRecorded?: boolean;
    destructiveOverwrite?: boolean;
  }) {
    this.boundary.assertPlatformAdminCannotCreateAward(input.actorRoleMarker);
    this.boundary.assertAiCannotTerminateBenefit(input.actorPersona, 'CREATE_BENEFIT_AWARD');
    this.boundary.assertPaymentDoesNotDetermineEligibility(input.actorPersona);
    this.boundary.rejectClientForgedAwardFields({});

    this.boundary.assertHumanDecisionRequiredBeforeFinalAward({
      requiresHumanDecision: input.requiresHumanDecision ?? true,
      humanDecisionRecorded: input.humanDecisionRecorded ?? Boolean(input.governmentDecisionId),
      creatingAward: true,
    });

    const awardNumber = `${BENEFIT_AWARD_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const award = await tx.benefitAward.create({
        data: {
          id: randomUUID(),
          awardNumber,
          benefitApplicationProfileId: input.benefitApplicationProfileId,
          benefitProgramId: input.benefitProgramId,
          benefitProgramVersionId: input.benefitProgramVersionId,
          governmentDecisionId: input.governmentDecisionId,
          lifecycleStatus: input.governmentDecisionId
            ? BenefitAwardLifecycleStatus.AWARDED
            : BenefitAwardLifecycleStatus.PENDING_DECISION,
          doesNotDetermineContinuingEligibility: true,
        },
      });

      const version = await tx.benefitAwardVersion.create({
        data: {
          id: randomUUID(),
          benefitAwardId: award.id,
          versionNumber: 1,
          amountCents: input.amountCents,
          governmentDecisionId: input.governmentDecisionId,
          isCurrent: true,
          effectiveFrom: new Date(),
        },
      });

      this.boundary.assertNoDestructiveAwardVersionOverwrite(
        0,
        Boolean(input.destructiveOverwrite),
      );

      const updated = await tx.benefitAward.update({
        where: { id: award.id },
        data: { currentBenefitAwardVersionId: version.id },
      });

      await tx.benefitStatusHistory.create({
        data: {
          id: randomUUID(),
          subjectKind: 'AWARD',
          benefitAwardId: award.id,
          toStatusCode: updated.lifecycleStatus,
          actorPersona: input.actorPersona,
        },
      });

      const versionCount = await tx.benefitAwardVersion.count({
        where: { benefitAwardId: award.id },
      });

      return {
        award: updated,
        currentVersion: version,
        versionCount,
        priorVersionsPreserved: versionCount >= 1,
      };
    });
  }

  async recordAwardVersionChange(input: {
    benefitAwardId: string;
    amountCents?: number;
    governmentDecisionId?: string;
    actorPersona: SocialProtectionActorPersona;
    destructiveOverwrite?: boolean;
  }) {
    const award = await this.prisma.benefitAward.findUnique({
      where: { id: input.benefitAwardId },
      include: { versions: true },
    });
    if (!award) {
      throw new NotFoundException('Benefit award not found');
    }

    this.boundary.assertNoDestructiveAwardVersionOverwrite(
      award.versions.length,
      Boolean(input.destructiveOverwrite),
    );

    const nextVersion = award.versions.length + 1;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (award.currentBenefitAwardVersionId) {
        await tx.benefitAwardVersion.update({
          where: { id: award.currentBenefitAwardVersionId },
          data: { isCurrent: false, supersededAt: new Date() },
        });
      }

      const version = await tx.benefitAwardVersion.create({
        data: {
          id: randomUUID(),
          benefitAwardId: award.id,
          versionNumber: nextVersion,
          amountCents: input.amountCents,
          governmentDecisionId: input.governmentDecisionId,
          isCurrent: true,
          effectiveFrom: new Date(),
        },
      });

      const updatedAward = await tx.benefitAward.update({
        where: { id: award.id },
        data: { currentBenefitAwardVersionId: version.id },
      });

      return {
        award: updatedAward,
        version,
        priorVersionsPreserved: award.versions.length > 0,
      };
    });
  }
}
