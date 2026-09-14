import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RedressDecisionStatus, RedressImplementationStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface CreateImplementationPlanInput {
  matterId: string;
  decisionId: string;
  actions: {
    actionType: string;
    actionSummary: string;
    phase8Controlled?: boolean;
    phase9Controlled?: boolean;
  }[];
}

export interface CompleteActionInput {
  actionId: string;
}

export interface VerifyImplementationInput {
  planId: string;
  verifiedByIdentityId?: string;
  verificationSummary: string;
}

@Injectable()
export class RedressImplementationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async createPlan(input: CreateImplementationPlanInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'implementation planning');

    const decision = await this.prisma.redressDecision.findUnique({
      where: { id: input.decisionId },
    });

    if (decision?.matterId !== input.matterId) {
      throw new NotFoundException('Redress decision not found for matter');
    }

    return this.prisma.redressImplementationPlan.create({
      data: {
        matterId: input.matterId,
        decisionId: input.decisionId,
        status: RedressImplementationStatus.PENDING,
        actions: {
          create: input.actions.map((action) => ({
            actionType: action.actionType,
            actionSummary: action.actionSummary,
            phase8Controlled: action.phase8Controlled ?? true,
            phase9Controlled: action.phase9Controlled ?? false,
            status: RedressImplementationStatus.PENDING,
          })),
        },
      },
      include: { actions: true },
    });
  }

  async completeAction(input: CompleteActionInput) {
    const action = await this.prisma.redressImplementationAction.findUnique({
      where: { id: input.actionId },
      include: { plan: true },
    });

    if (!action) {
      throw new NotFoundException(`RedressImplementationAction ${input.actionId} not found`);
    }

    return this.prisma.redressImplementationAction.update({
      where: { id: input.actionId },
      data: {
        status: RedressImplementationStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async markPlanImplemented(planId: string) {
    const plan = await this.prisma.redressImplementationPlan.findUnique({
      where: { id: planId },
      include: { actions: true },
    });

    if (!plan) {
      throw new NotFoundException(`RedressImplementationPlan ${planId} not found`);
    }

    const incomplete = plan.actions.filter(
      (a) => a.status !== RedressImplementationStatus.COMPLETED,
    );

    if (incomplete.length > 0) {
      throw new BadRequestException(
        'Implementation cannot be marked complete before all actions complete',
      );
    }

    return this.prisma.redressImplementationPlan.update({
      where: { id: planId },
      data: {
        status: RedressImplementationStatus.COMPLETED,
        markedImplementedAt: new Date(),
      },
    });
  }

  async recordFailure(actionId: string, failureReason: string) {
    const action = await this.prisma.redressImplementationAction.update({
      where: { id: actionId },
      data: {
        status: RedressImplementationStatus.FAILED,
        failureReason,
      },
      include: { plan: true },
    });

    await this.prisma.redressImplementationPlan.update({
      where: { id: action.planId },
      data: { failureVisible: true },
    });

    return action;
  }

  async verifyImplementation(input: VerifyImplementationInput) {
    const plan = await this.prisma.redressImplementationPlan.findUnique({
      where: { id: input.planId },
    });

    if (!plan) {
      throw new NotFoundException(`RedressImplementationPlan ${input.planId} not found`);
    }

    if (plan.status !== RedressImplementationStatus.COMPLETED) {
      throw new BadRequestException('Plan must be completed before verification');
    }

    const verification = await this.prisma.redressImplementationVerification.create({
      data: {
        planId: input.planId,
        verifiedByIdentityId: input.verifiedByIdentityId,
        verificationSummary: input.verificationSummary,
      },
    });

    await this.prisma.redressImplementationPlan.update({
      where: { id: input.planId },
      data: { status: RedressImplementationStatus.VERIFIED },
    });

    await this.prisma.redressDecision.update({
      where: { id: plan.decisionId },
      data: { isImplemented: true, status: RedressDecisionStatus.IMPLEMENTED },
    });

    return verification;
  }
}
