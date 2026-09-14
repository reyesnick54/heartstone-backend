import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplaintClassificationType,
  ComplaintClosureReason,
  ComplaintInvestigationStatus,
  RedressMatterStatus,
  RedressRouteCategory,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';
import { APPEAL_ROUTE_CATEGORIES } from '../redress.constants';

export interface ClassifyComplaintInput {
  matterId: string;
  classificationType: ComplaintClassificationType;
  classifiedByIdentityId?: string;
  classifiedByOfficeholderId?: string;
  requestedRouteCategory?: RedressRouteCategory;
  explanation?: string;
}

export interface StartInvestigationInput {
  matterId: string;
  classificationId: string;
  investigatorIdentityId?: string;
  investigatorOfficeholderId?: string;
}

export interface RecordServiceRemedyInput {
  investigationId: string;
  actionSummary: string;
}

export interface CloseComplaintInput {
  investigationId: string;
  reason: ComplaintClosureReason;
}

@Injectable()
export class ComplaintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async classifyComplaint(input: ClassifyComplaintInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'complaint classification');

    if (input.requestedRouteCategory) {
      if (APPEAL_ROUTE_CATEGORIES.includes(input.requestedRouteCategory)) {
        throw new BadRequestException('Complaint does not equal appeal');
      }
    }

    const isAppealMislabel =
      input.requestedRouteCategory != null &&
      APPEAL_ROUTE_CATEGORIES.includes(input.requestedRouteCategory);

    const classification = await this.prisma.complaintClassification.create({
      data: {
        matterId: input.matterId,
        classificationType: input.classificationType,
        classifiedByIdentityId: input.classifiedByIdentityId,
        classifiedByOfficeholderId: input.classifiedByOfficeholderId,
        isAppealMislabel,
        explanation: input.explanation,
        classifiedAt: new Date(),
      },
    });

    await this.prisma.redressMatter.update({
      where: { id: input.matterId },
      data: { status: RedressMatterStatus.CLASSIFICATION },
    });

    return classification;
  }

  async startInvestigation(input: StartInvestigationInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'complaint investigation');

    const classification = await this.prisma.complaintClassification.findUnique({
      where: { id: input.classificationId },
    });

    if (classification?.matterId !== input.matterId) {
      throw new NotFoundException('Complaint classification not found for matter');
    }

    if (classification.classificationType === ComplaintClassificationType.NOT_A_COMPLAINT) {
      throw new BadRequestException(
        'Investigation cannot start for NOT_A_COMPLAINT classification',
      );
    }

    const investigation = await this.prisma.complaintInvestigation.create({
      data: {
        matterId: input.matterId,
        classificationId: input.classificationId,
        status: ComplaintInvestigationStatus.IN_PROGRESS,
        investigatorIdentityId: input.investigatorIdentityId,
        investigatorOfficeholderId: input.investigatorOfficeholderId,
        startedAt: new Date(),
      },
    });

    await this.prisma.redressMatter.update({
      where: { id: input.matterId },
      data: { status: RedressMatterStatus.INVESTIGATION },
    });

    return investigation;
  }

  async recordServiceRemedy(input: RecordServiceRemedyInput) {
    const investigation = await this.prisma.complaintInvestigation.findUnique({
      where: { id: input.investigationId },
    });

    if (!investigation) {
      throw new NotFoundException(`ComplaintInvestigation ${input.investigationId} not found`);
    }

    this.boundary.assertSubstantiveRemedyPermitted(false, false);

    return this.prisma.complaintCorrectiveAction.create({
      data: {
        investigationId: input.investigationId,
        actionSummary: input.actionSummary,
        isServiceRemedy: true,
      },
    });
  }

  async closeComplaint(input: CloseComplaintInput) {
    const investigation = await this.prisma.complaintInvestigation.findUnique({
      where: { id: input.investigationId },
    });

    if (!investigation) {
      throw new NotFoundException(`ComplaintInvestigation ${input.investigationId} not found`);
    }

    await this.prisma.complaintInvestigation.update({
      where: { id: input.investigationId },
      data: {
        status: ComplaintInvestigationStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    const closure = await this.prisma.complaintClosure.create({
      data: {
        investigationId: input.investigationId,
        reason: input.reason,
      },
    });

    await this.prisma.redressMatter.update({
      where: { id: investigation.matterId },
      data: { status: RedressMatterStatus.CLOSED, closedAt: new Date() },
    });

    return closure;
  }
}
