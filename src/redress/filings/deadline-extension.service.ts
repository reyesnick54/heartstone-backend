import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  DeadlineExtensionOutcome,
  RedressTimelinessOutcome,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface RequestExtensionInput {
  matterId: string;
  requestedByIdentityId: string;
  reason: string;
}

export interface DecideExtensionInput {
  requestId: string;
  deciderIdentityId: string;
  deciderOfficeholderId: string;
  functionAuthorityRecordId: string;
  appointmentId?: string;
  delegationId?: string;
  outcome: DeadlineExtensionOutcome;
}

@Injectable()
export class DeadlineExtensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly actorResolver: InstitutionalActorResolver,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async requestExtension(input: RequestExtensionInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'deadline extension request');

    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: input.matterId },
      include: { routeVersion: true },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${input.matterId} not found`);
    }

    if (!matter.routeVersion?.permitsDeadlineExtension) {
      throw new BadRequestException('Route does not permit deadline extensions');
    }

    return this.prisma.deadlineExtensionRequest.create({
      data: {
        matterId: input.matterId,
        requestedByIdentityId: input.requestedByIdentityId,
        reason: input.reason,
        outcome: DeadlineExtensionOutcome.PENDING,
      },
    });
  }

  async decideExtension(input: DecideExtensionInput) {
    const request = await this.prisma.deadlineExtensionRequest.findUnique({
      where: { id: input.requestId },
      include: { matter: true },
    });

    if (!request) {
      throw new NotFoundException(`DeadlineExtensionRequest ${input.requestId} not found`);
    }

    if (request.outcome !== DeadlineExtensionOutcome.PENDING) {
      throw new BadRequestException('Extension request has already been decided');
    }

    await this.safeHalt.assertMatterNotSafeHalted(request.matterId, 'deadline extension decision');

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.deciderIdentityId },
    });

    if (!identity?.type || !this.actorResolver.isHumanActor(identity.type)) {
      throw new ForbiddenException('Extension decision requires a human institutional actor');
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.deciderIdentityId,
      officeholderId: input.deciderOfficeholderId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.HEAR_REVIEW,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(
        'Deadline extension decision requires authority evaluation ALLOW',
      );
    }

    const updated = await this.prisma.deadlineExtensionRequest.update({
      where: { id: input.requestId },
      data: {
        outcome: input.outcome,
        decidedByIdentityId: input.deciderIdentityId,
        decidedByOfficeholderId: input.deciderOfficeholderId,
        authorityEvaluationRecordId: authorityResult.evaluationId,
        decidedAt: new Date(),
      },
    });

    if (input.outcome === DeadlineExtensionOutcome.GRANTED) {
      await this.prisma.redressTimelinessAssessment.create({
        data: {
          matterId: request.matterId,
          outcome: RedressTimelinessOutcome.EXTENSION_GRANTED,
          assessedByIdentityId: input.deciderIdentityId,
          assessedByOfficeholderId: input.deciderOfficeholderId,
          authorityEvaluationRecordId: authorityResult.evaluationId,
          explanation: 'Deadline extension granted',
          assessedAt: new Date(),
        },
      });
    }

    return updated;
  }
}
