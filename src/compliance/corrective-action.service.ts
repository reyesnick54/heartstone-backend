import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CorrectiveActionItemStatus,
  CorrectiveActionPlanStatus,
  CorrectiveActionVerificationOutcome,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CORRECTIVE_ACTION_PLAN_NUMBER_PREFIX } from './compliance.constants';
import { ComplianceBoundaryService } from './compliance-boundary.service';

export interface CreateCorrectiveActionPlanInput {
  complianceMatterId?: string;
  inspectionFindingId?: string;
  requiredBy?: Date;
  items: Array<{ description: string; dueAt?: Date; assignedToIdentityId?: string }>;
}

export interface VerifyCorrectiveActionInput {
  correctiveActionItemId: string;
  verifierIdentityId: string;
  verifierOfficeholderId: string;
  outcome: CorrectiveActionVerificationOutcome;
  notes?: string;
  assigneeIdentityId?: string | null;
  holderIdentityId?: string | null;
}

@Injectable()
export class CorrectiveActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplianceBoundaryService,
  ) {}

  async createPlan(input: CreateCorrectiveActionPlanInput) {
    const planNumber = `${CORRECTIVE_ACTION_PLAN_NUMBER_PREFIX}-${Date.now()}`;

    return this.prisma.correctiveActionPlan.create({
      data: {
        planNumber,
        complianceMatterId: input.complianceMatterId,
        inspectionFindingId: input.inspectionFindingId,
        requiredBy: input.requiredBy,
        status: CorrectiveActionPlanStatus.ACTIVE,
        items: {
          create: input.items.map((item) => ({
            description: item.description,
            dueAt: item.dueAt,
            assignedToIdentityId: item.assignedToIdentityId,
            status: CorrectiveActionItemStatus.PENDING,
          })),
        },
      },
      include: { items: true },
    });
  }

  async completeItem(itemId: string) {
    return this.prisma.correctiveActionItem.update({
      where: { id: itemId },
      data: { status: CorrectiveActionItemStatus.COMPLETED },
    });
  }

  async verifyItem(input: VerifyCorrectiveActionInput) {
    const item = await this.prisma.correctiveActionItem.findUnique({
      where: { id: input.correctiveActionItemId },
    });
    if (!item) {
      throw new NotFoundException(`Corrective action item "${input.correctiveActionItemId}" was not found`);
    }

    this.boundary.assertHolderCannotVerifyCorrectiveAction({
      verifierIdentityId: input.verifierIdentityId,
      assigneeIdentityId: input.assigneeIdentityId ?? item.assignedToIdentityId,
      holderIdentityId: input.holderIdentityId,
    });

    const verification = await this.prisma.correctiveActionVerification.create({
      data: {
        correctiveActionItemId: input.correctiveActionItemId,
        verifierIdentityId: input.verifierIdentityId,
        verifierOfficeholderId: input.verifierOfficeholderId,
        outcome: input.outcome,
        verifiedAt: new Date(),
        notes: input.notes,
      },
    });

    if (input.outcome === CorrectiveActionVerificationOutcome.VERIFIED_SATISFACTORY) {
      await this.prisma.correctiveActionItem.update({
        where: { id: input.correctiveActionItemId },
        data: { status: CorrectiveActionItemStatus.VERIFIED },
      });
    }

    return verification;
  }
}
