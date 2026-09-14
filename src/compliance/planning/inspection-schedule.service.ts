import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InspectionNoticeStatus, InspectionScheduleEventType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { NOTICE_DETAIL_FIELDS } from '../compliance.constants';
import { InspectionPlanningBoundaryService } from './inspection-planning-boundary.service';

export interface InspectionNoticeDetails {
  authority?: string;
  scope?: string;
  time?: string;
  place?: string;
  documentsRequested?: string[];
  accessRequested?: string[];
  recipient?: string;
  delivery?: string;
  rights?: string;
  obligations?: string;
  contact?: string;
  confidentiality?: string;
  strategyConfidential?: boolean;
}

export interface RecordScheduleEventInput {
  inspectionPlanId: string;
  eventType: InspectionScheduleEventType;
  scheduledAt?: Date;
  scopeAtEvent: string;
  noticeDetails?: InspectionNoticeDetails;
  isUnannounced?: boolean;
  recordedByIdentityId: string;
}

@Injectable()
export class InspectionScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: InspectionPlanningBoundaryService,
  ) {}

  async recordEvent(input: RecordScheduleEventInput) {
    const plan = await this.prisma.inspectionPlan.findUnique({
      where: { id: input.inspectionPlanId },
      include: { inspectionTypeDefinition: true },
    });

    if (!plan) {
      throw new NotFoundException('Inspection plan not found');
    }

    this.boundary.assertScopeNotSilentlyExpanded(plan.scope, input.scopeAtEvent);
    this.boundary.assertUnannouncedAllowed(
      plan.inspectionTypeDefinition.unannouncedAllowed,
      input.isUnannounced ?? false,
    );
    this.boundary.assertSchedulingDoesNotEstablishViolation();

    const sanitizedNotice = this.sanitizeNoticeDetails(input.noticeDetails);

    if (
      input.eventType === InspectionScheduleEventType.NOTICE_PREPARED ||
      input.eventType === InspectionScheduleEventType.NOTICE_DELIVERED
    ) {
      this.assertNoticeRequirementsMet(sanitizedNotice);
    }

    const event = await this.prisma.inspectionScheduleEvent.create({
      data: {
        inspectionPlanId: input.inspectionPlanId,
        eventType: input.eventType,
        scheduledAt: input.scheduledAt,
        scopeAtEvent: input.scopeAtEvent,
        noticeDetails: sanitizedNotice as unknown as Prisma.InputJsonValue,
        isUnannounced: input.isUnannounced ?? false,
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });

    if (input.eventType === InspectionScheduleEventType.NOTICE_DELIVERED) {
      await this.prisma.inspectionPlan.update({
        where: { id: input.inspectionPlanId },
        data: { noticeStatus: InspectionNoticeStatus.DELIVERED },
      });
    }

    return event;
  }

  sanitizeNoticeDetails(details?: InspectionNoticeDetails): InspectionNoticeDetails | undefined {
    if (!details) {
      return undefined;
    }

    if (details.strategyConfidential) {
      return {
        authority: details.authority,
        scope: details.scope,
        time: details.time,
        place: details.place,
        documentsRequested: details.documentsRequested,
        accessRequested: details.accessRequested,
        recipient: details.recipient,
        delivery: details.delivery,
        rights: details.rights,
        obligations: details.obligations,
        contact: details.contact,
        confidentiality: details.confidentiality,
      };
    }

    return details;
  }

  assertNoticeRequirementsMet(details?: InspectionNoticeDetails): void {
    if (!details) {
      throw new BadRequestException('Notice details are required');
    }

    const required = ['authority', 'scope', 'time', 'place', 'recipient'] as const;
    for (const field of required) {
      const value = details[field];
      if (value === undefined || (typeof value === 'string' && value.trim().length === 0)) {
        throw new BadRequestException(`Notice requirement missing: ${field}`);
      }
    }
  }

  getNoticeDetailFields(): readonly string[] {
    return NOTICE_DETAIL_FIELDS;
  }
}
