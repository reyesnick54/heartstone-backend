import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  RedressImplementationActionStatus,
  RedressImplementationVerificationOutcome,
  RedressMatterStatus,
  RedressRemedyType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';

export interface CompleteImplementationActionInput {
  actionId: string;
  lifecycleServiceReference?: string;
  verifiedByIdentityId?: string;
  verificationNotes?: string;
}

export interface FailImplementationActionInput {
  actionId: string;
  errorMessage: string;
}

@Injectable()
export class RedressImplementationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
  ) {}

  async getImplementationStatus(redressDecisionId: string): Promise<string> {
    const plan = await this.prisma.redressImplementationPlan.findUnique({
      where: { redressDecisionId },
      include: { actions: { include: { verification: true } } },
    });

    if (!plan) {
      return 'PENDING';
    }

    if (plan.actions.length === 0) {
      return plan.status;
    }

    if (plan.actions.some((action) => action.status === RedressImplementationActionStatus.FAILED)) {
      return 'FAILED';
    }

    if (
      plan.actions.some((action) => action.status === RedressImplementationActionStatus.BLOCKED)
    ) {
      return 'BLOCKED';
    }

    if (
      plan.actions.every((action) => action.status === RedressImplementationActionStatus.COMPLETED)
    ) {
      return 'COMPLETED';
    }

    if (
      plan.actions.some((action) => action.status === RedressImplementationActionStatus.IN_PROGRESS)
    ) {
      return 'IN_PROGRESS';
    }

    return 'PENDING';
  }

  async isRemedyFullyImplemented(redressDecisionId: string): Promise<boolean> {
    const status = await this.getImplementationStatus(redressDecisionId);
    return status === 'COMPLETED';
  }

  async completeAction(input: CompleteImplementationActionInput) {
    const action = await this.prisma.redressImplementationAction.findUnique({
      where: { id: input.actionId },
      include: {
        implementationPlan: {
          include: {
            redressDecision: {
              include: { remedies: true, redressMatter: true },
            },
          },
        },
      },
    });

    if (!action) {
      throw new NotFoundException(`RedressImplementationAction ${input.actionId} not found`);
    }

    const matchingRemedy = action.implementationPlan.redressDecision.remedies.find(
      (remedy) => remedy.remedyType === (action.requiredOperation as RedressRemedyType),
    );

    if (matchingRemedy && this.isInstrumentRemedy(matchingRemedy.remedyType)) {
      this.boundary.assertInstrumentRemedyUsesLifecycleService(
        matchingRemedy.remedyType,
        input.lifecycleServiceReference ?? action.lifecycleServiceReference,
      );
    }

    const updated = await this.prisma.redressImplementationAction.update({
      where: { id: action.id },
      data: {
        status: RedressImplementationActionStatus.COMPLETED,
        completedAt: new Date(),
        lifecycleServiceReference:
          input.lifecycleServiceReference ?? action.lifecycleServiceReference,
      },
    });

    await this.prisma.redressImplementationVerification.create({
      data: {
        actionId: action.id,
        outcome: RedressImplementationVerificationOutcome.VERIFIED,
        verifiedByIdentityId: input.verifiedByIdentityId,
        notes: input.verificationNotes,
      },
    });

    await this.refreshPlanStatus(action.implementationPlanId);

    const allComplete = await this.isRemedyFullyImplemented(
      action.implementationPlan.redressDecisionId,
    );

    if (allComplete) {
      await this.prisma.redressMatter.update({
        where: { id: action.implementationPlan.redressDecision.redressMatterId },
        data: { status: RedressMatterStatus.IMPLEMENTED },
      });
    }

    return updated;
  }

  async failAction(input: FailImplementationActionInput) {
    const existing = await this.prisma.redressImplementationAction.findUnique({
      where: { id: input.actionId },
    });

    if (!existing) {
      throw new NotFoundException(`RedressImplementationAction ${input.actionId} not found`);
    }

    const action = await this.prisma.redressImplementationAction.update({
      where: { id: input.actionId },
      data: {
        status: RedressImplementationActionStatus.FAILED,
        errorMessage: input.errorMessage,
      },
      include: { implementationPlan: true },
    });

    await this.prisma.redressImplementationPlan.update({
      where: { id: action.implementationPlanId },
      data: { status: RedressImplementationActionStatus.FAILED },
    });

    return action;
  }

  async blockAction(actionId: string, reason: string) {
    const existing = await this.prisma.redressImplementationAction.findUnique({
      where: { id: actionId },
    });

    if (!existing) {
      throw new NotFoundException(`RedressImplementationAction ${actionId} not found`);
    }

    const action = await this.prisma.redressImplementationAction.update({
      where: { id: actionId },
      data: {
        status: RedressImplementationActionStatus.BLOCKED,
        errorMessage: reason,
      },
    });

    await this.refreshPlanStatus(action.implementationPlanId);
    return action;
  }

  async assertPublicVerificationMayUpdate(redressDecisionId: string): Promise<void> {
    const implemented = await this.isRemedyFullyImplemented(redressDecisionId);
    if (!implemented) {
      throw new BadRequestException(
        'Public verification may update only after the implemented remedy is complete',
      );
    }
  }

  private async refreshPlanStatus(planId: string): Promise<void> {
    const plan = await this.prisma.redressImplementationPlan.findUnique({
      where: { id: planId },
      include: { actions: true },
    });

    if (!plan) {
      return;
    }

    const derived = this.derivePlanStatus(plan.actions);
    await this.prisma.redressImplementationPlan.update({
      where: { id: planId },
      data: { status: derived },
    });
  }

  private derivePlanStatus(
    actions: { status: RedressImplementationActionStatus }[],
  ): RedressImplementationActionStatus {
    if (actions.some((action) => action.status === RedressImplementationActionStatus.FAILED)) {
      return RedressImplementationActionStatus.FAILED;
    }
    if (actions.some((action) => action.status === RedressImplementationActionStatus.BLOCKED)) {
      return RedressImplementationActionStatus.BLOCKED;
    }
    if (
      actions.length > 0 &&
      actions.every((action) => action.status === RedressImplementationActionStatus.COMPLETED)
    ) {
      return RedressImplementationActionStatus.COMPLETED;
    }
    if (actions.some((action) => action.status === RedressImplementationActionStatus.IN_PROGRESS)) {
      return RedressImplementationActionStatus.IN_PROGRESS;
    }
    return RedressImplementationActionStatus.PENDING;
  }

  private isInstrumentRemedy(remedyType: RedressRemedyType): boolean {
    return (
      remedyType === RedressRemedyType.AMEND_INSTRUMENT ||
      remedyType === RedressRemedyType.REINSTATE_INSTRUMENT ||
      remedyType === RedressRemedyType.SUSPEND_EFFECT
    );
  }
}
