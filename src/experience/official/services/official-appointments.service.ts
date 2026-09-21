import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { ServiceAppointmentAccessService } from '../../../scheduling/access/service-appointment-access.service';
import { SCHEDULING_DISCLAIMER } from '../../../scheduling/scheduling.constants';
import {
  OfficialAppointmentDetailResponseDto,
  OfficialAppointmentsListResponseDto,
} from '../dto/official-appointments-response.dto';
import { type ResolvedOfficialContext } from '../types/official-context.types';

@Injectable()
export class OfficialAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentAccess: ServiceAppointmentAccessService,
  ) {}

  async listAppointments(
    context: ResolvedOfficialContext,
  ): Promise<OfficialAppointmentsListResponseDto> {
    const where = this.appointmentAccess.buildOfficialWhere(context);
    const records = await this.prisma.serviceAppointment.findMany({
      where,
      include: {
        appointmentReason: true,
        department: true,
        governmentService: true,
      },
      orderBy: [{ scheduledStartsAt: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return {
      items: records.map((record) => ({
        id: record.id,
        appointmentReference: record.appointmentReference,
        status: record.status,
        scheduledStartsAt: record.scheduledStartsAt?.toISOString() ?? null,
        scheduledEndsAt: record.scheduledEndsAt?.toISOString() ?? null,
        reasonName: record.appointmentReason?.name ?? null,
        departmentName: record.department?.name ?? 'Unassigned department',
        serviceName: record.governmentService?.publicName ?? null,
        isVirtual: record.isVirtual,
      })),
      disclaimer: {
        label: SCHEDULING_DISCLAIMER.schedulingDoesNotImplyApproval,
        labelKey: 'scheduling.disclaimer.no_implied_approval',
      },
    };
  }

  async getAppointment(
    context: ResolvedOfficialContext,
    appointmentId: string,
  ): Promise<OfficialAppointmentDetailResponseDto> {
    await this.appointmentAccess.assertOfficialAccess(appointmentId, context);

    const record = await this.prisma.serviceAppointment.findUniqueOrThrow({
      where: { id: appointmentId },
      include: {
        appointmentReason: true,
        appointmentLocation: true,
        department: true,
        governmentService: true,
      },
    });

    return {
      id: record.id,
      appointmentReference: record.appointmentReference,
      status: record.status,
      scheduledStartsAt: record.scheduledStartsAt?.toISOString() ?? null,
      scheduledEndsAt: record.scheduledEndsAt?.toISOString() ?? null,
      reasonName: record.appointmentReason?.name ?? null,
      departmentName: record.department?.name ?? 'Unassigned department',
      serviceName: record.governmentService?.publicName ?? null,
      isVirtual: record.isVirtual,
      operationalNotes: record.operationalNotes,
      locationName: record.appointmentLocation?.name ?? null,
      completionDisclaimer: {
        label: SCHEDULING_DISCLAIMER.completionDoesNotImplySatisfaction,
        labelKey: 'scheduling.disclaimer.completion_no_approval',
      },
    };
  }
}
