import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  DecisionTypeLifecycleStatus,
  DecisionTypeTransitionBasis,
  IdentityType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DecisionCatalogBoundaryService } from '../common/decision-catalog-boundary.service';
import { DECISIONS_EXPLANATION_CODES } from '../decisions.constants';

export interface DecisionLifecycleActor {
  identityId: string;
}

const CONTROLLED_TRANSITIONS: Partial<
  Record<DecisionTypeLifecycleStatus, DecisionTypeLifecycleStatus[]>
> = {
  DRAFT: [DecisionTypeLifecycleStatus.AUTHORITY_REVIEW, DecisionTypeLifecycleStatus.CONFIGURED],
  AUTHORITY_REVIEW: [DecisionTypeLifecycleStatus.APPROVED],
  APPROVED: [DecisionTypeLifecycleStatus.CONFIGURED],
  CONFIGURED: [DecisionTypeLifecycleStatus.TESTED],
  TESTED: [DecisionTypeLifecycleStatus.ACCEPTED],
  ACCEPTED: [DecisionTypeLifecycleStatus.ACTIVE],
  ACTIVE: [DecisionTypeLifecycleStatus.SUSPENDED, DecisionTypeLifecycleStatus.RETIRED],
  SUSPENDED: [DecisionTypeLifecycleStatus.ACTIVE, DecisionTypeLifecycleStatus.RETIRED],
};

@Injectable()
export class DecisionTypeLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: DecisionCatalogBoundaryService,
  ) {}

  async transition(
    decisionTypeVersionId: string,
    targetStatus: DecisionTypeLifecycleStatus,
    actor: DecisionLifecycleActor,
    reason?: string,
  ): Promise<void> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: actor.identityId },
      include: { officeholderLinks: { take: 1 } },
    });

    if (!identity) {
      throw new BadRequestException(`Identity "${actor.identityId}" was not found`);
    }

    this.assertActorMayControlLifecycle(identity.type);

    const version = await this.prisma.decisionTypeVersion.findUnique({
      where: { id: decisionTypeVersionId },
      include: { decisionTypeDefinition: true },
    });

    if (!version) {
      throw new BadRequestException(
        `Decision type version "${decisionTypeVersionId}" was not found`,
      );
    }

    this.boundary.assertVersionMutable(version.status);

    const allowedTargets = CONTROLLED_TRANSITIONS[version.status] ?? [];
    if (!allowedTargets.includes(targetStatus)) {
      throw new BadRequestException(
        `Transition from ${version.status} to ${targetStatus} is not permitted`,
      );
    }

    if (targetStatus === DecisionTypeLifecycleStatus.ACTIVE) {
      if (version.status !== DecisionTypeLifecycleStatus.ACCEPTED) {
        throw new BadRequestException({
          message: 'Operational activation requires institutional acceptance',
          code: DECISIONS_EXPLANATION_CODES.ACTIVATION_REQUIRES_ACCEPTANCE,
        });
      }
      if (!version.institutionallyAcceptedAt) {
        throw new BadRequestException({
          message: 'Operational activation requires a recorded acceptance timestamp',
          code: DECISIONS_EXPLANATION_CODES.ACTIVATION_REQUIRES_ACCEPTANCE,
        });
      }
    }

    if (targetStatus === DecisionTypeLifecycleStatus.ACCEPTED) {
      await this.prisma.decisionTypeVersion.update({
        where: { id: decisionTypeVersionId },
        data: { institutionallyAcceptedAt: new Date() },
      });
    }

    const transitionBasis = this.resolveTransitionBasis(targetStatus);

    await this.prisma.$transaction(async (tx) => {
      await tx.decisionTypeVersion.update({
        where: { id: decisionTypeVersionId },
        data: {
          status: targetStatus,
          operationallyActivatedAt:
            targetStatus === DecisionTypeLifecycleStatus.ACTIVE ? new Date() : undefined,
        },
      });

      await tx.decisionTypeLifecycleTransition.create({
        data: {
          decisionTypeVersionId,
          priorStatus: version.status,
          newStatus: targetStatus,
          transitionBasis,
          actorIdentityId: actor.identityId,
          officeholderId: identity.officeholderLinks[0]?.officeholderId,
          reason,
        },
      });
    });
  }

  private assertActorMayControlLifecycle(identityType: IdentityType): void {
    if (identityType === IdentityType.SERVICE) {
      throw new ForbiddenException({
        message:
          'Technical or service identities cannot activate decision types without a controlled institutional pathway',
        code: DECISIONS_EXPLANATION_CODES.ACTIVATION_REQUIRES_CONTROLLED_PATHWAY,
      });
    }
  }

  private resolveTransitionBasis(
    targetStatus: DecisionTypeLifecycleStatus,
  ): DecisionTypeTransitionBasis {
    switch (targetStatus) {
      case DecisionTypeLifecycleStatus.AUTHORITY_REVIEW:
        return DecisionTypeTransitionBasis.AUTHORITY_REVIEW_COMPLETE;
      case DecisionTypeLifecycleStatus.CONFIGURED:
        return DecisionTypeTransitionBasis.CONFIGURATION_COMPLETE;
      case DecisionTypeLifecycleStatus.ACCEPTED:
        return DecisionTypeTransitionBasis.INSTITUTIONAL_ACCEPTANCE;
      case DecisionTypeLifecycleStatus.ACTIVE:
        return DecisionTypeTransitionBasis.OPERATIONAL_ACTIVATION;
      case DecisionTypeLifecycleStatus.SUSPENDED:
        return DecisionTypeTransitionBasis.SUSPENSION;
      case DecisionTypeLifecycleStatus.RETIRED:
        return DecisionTypeTransitionBasis.RETIREMENT;
      default:
        return DecisionTypeTransitionBasis.CONFIGURATION_COMPLETE;
    }
  }
}
