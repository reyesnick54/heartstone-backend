import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InspectionStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InspectionService } from '../../evidence/inspection/inspection.service';

const ORDERED_STATUSES: InspectionStatus[] = [
  InspectionStatus.PLANNED,
  InspectionStatus.SCHEDULED,
  InspectionStatus.ASSIGNED,
  InspectionStatus.IN_PROGRESS,
  InspectionStatus.COMPLETED,
  InspectionStatus.FINDINGS_RECORDED,
  InspectionStatus.FOLLOW_UP_REQUIRED,
  InspectionStatus.CLOSED,
];

@Injectable()
export class OperationalInspectionLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inspectionService: InspectionService,
  ) {}

  createPlanned(input: Parameters<InspectionService['create']>[0]) {
    return this.prisma.inspectionRecord.create({
      data: {
        caseId: input.caseId,
        inspectionType: input.inspectionType,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        locationSite: input.locationSite,
        inspectionDate: input.inspectionDate,
        scope: input.scope,
        method: input.method,
        status: InspectionStatus.PLANNED,
        scheduledFor: input.inspectionDate,
        inspectors: {
          create: {
            officeholderId: input.inspectorOfficeholderId,
            identityId: input.inspectorIdentityId,
          },
        },
      },
      include: { inspectors: true },
    });
  }

  async transitionStatus(input: {
    inspectionId: string;
    targetStatus: InspectionStatus;
    outcome?: string;
    followUpRequired?: boolean;
    serviceAppointmentId?: string;
  }) {
    const inspection = await this.prisma.inspectionRecord.findUnique({
      where: { id: input.inspectionId },
    });
    if (!inspection) {
      throw new NotFoundException('Inspection record not found');
    }

    this.assertValidTransition(inspection.status, input.targetStatus);

    return this.prisma.inspectionRecord.update({
      where: { id: input.inspectionId },
      data: {
        status: input.targetStatus,
        outcome: input.outcome ?? inspection.outcome,
        followUpRequired: input.followUpRequired ?? inspection.followUpRequired,
        serviceAppointmentId: input.serviceAppointmentId ?? inspection.serviceAppointmentId,
      },
      include: { inspectors: true, jointParticipants: true, evidenceItems: true },
    });
  }

  async recordFindings(input: Parameters<InspectionService['complete']>[0]) {
    await this.inspectionService.complete(input);
    return this.transitionStatus({
      inspectionId: input.inspectionId,
      targetStatus: InspectionStatus.FINDINGS_RECORDED,
      followUpRequired: input.followUpRequired,
    });
  }

  private assertValidTransition(from: InspectionStatus, to: InspectionStatus) {
    const fromIndex = ORDERED_STATUSES.indexOf(from);
    const toIndex = ORDERED_STATUSES.indexOf(to);
    if (fromIndex === -1 || toIndex === -1) {
      throw new BadRequestException(`Unsupported inspection status transition ${from} -> ${to}`);
    }
    if (toIndex < fromIndex) {
      throw new BadRequestException(`Inspection status may not regress from ${from} to ${to}`);
    }
  }
}
