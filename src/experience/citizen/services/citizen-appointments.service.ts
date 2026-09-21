import { Injectable } from '@nestjs/common';
import { ServiceAppointmentStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { ServiceAppointmentAccessService } from '../../../scheduling/access/service-appointment-access.service';
import { SCHEDULING_DISCLAIMER } from '../../../scheduling/scheduling.constants';
import { CancelServiceAppointmentDto } from '../../../scheduling/service-appointments/dto/cancel-service-appointment.dto';
import { RescheduleServiceAppointmentDto } from '../../../scheduling/service-appointments/dto/reschedule-service-appointment.dto';
import { ServiceAppointmentsService } from '../../../scheduling/service-appointments/service-appointments.service';
import { CitizenAccessService } from '../../common/citizen-access.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  CitizenAppointmentDetailDto,
  CitizenAppointmentsResponseDto,
} from '../dto/citizen-appointment.dto';

@Injectable()
export class CitizenAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CitizenAccessService,
    private readonly appointmentAccess: ServiceAppointmentAccessService,
    private readonly appointments: ServiceAppointmentsService,
  ) {}

  async listAppointments(
    identityId: string,
    query: PaginationQueryDto,
  ): Promise<CitizenAppointmentsResponseDto> {
    const where = this.appointmentAccess.buildCitizenWhere(identityId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [records, totalItems] = await Promise.all([
      this.prisma.serviceAppointment.findMany({
        where,
        include: {
          appointmentReason: true,
          institution: true,
          department: true,
          governmentService: true,
        },
        orderBy: [{ scheduledStartsAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.serviceAppointment.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toSummary(record)),
      pagination: this.access.buildPaginationMeta(page, pageSize, totalItems),
    };
  }

  async getAppointment(
    identityId: string,
    appointmentId: string,
  ): Promise<CitizenAppointmentDetailDto> {
    await this.appointmentAccess.assertCitizenAccess(appointmentId, identityId);

    const record = await this.prisma.serviceAppointment.findUniqueOrThrow({
      where: { id: appointmentId },
      include: {
        appointmentReason: true,
        appointmentLocation: true,
        institution: true,
        department: true,
        governmentService: true,
      },
    });

    const summary = this.toSummary(record);

    return {
      id: summary.id,
      appointmentReference: summary.appointmentReference,
      status: summary.status,
      scheduledStartsAt: summary.scheduledStartsAt,
      scheduledEndsAt: summary.scheduledEndsAt,
      reasonName: summary.reasonName,
      isVirtual: summary.isVirtual,
      attribution: summary.attribution,
      disclaimer: summary.disclaimer,
      virtualMeetingUrl: record.virtualMeetingUrl,
      locationName: record.appointmentLocation?.name ?? null,
      availableActions: this.resolveAvailableActions(record.status),
    };
  }

  async confirmAppointment(identityId: string, appointmentId: string) {
    const appointment = await this.appointmentAccess.assertCitizenAccess(appointmentId, identityId);
    this.appointmentAccess.assertAppointmentIsActionable(appointment);
    return this.appointments.confirm(appointmentId, identityId);
  }

  async requestReschedule(
    identityId: string,
    appointmentId: string,
    dto: RescheduleServiceAppointmentDto,
  ) {
    const appointment = await this.appointmentAccess.assertCitizenAccess(appointmentId, identityId);
    this.appointmentAccess.assertAppointmentIsActionable(appointment);
    return this.appointments.requestReschedule(appointmentId, dto, identityId);
  }

  async cancelAppointment(
    identityId: string,
    appointmentId: string,
    dto: CancelServiceAppointmentDto,
  ) {
    const appointment = await this.appointmentAccess.assertCitizenAccess(appointmentId, identityId);
    this.appointmentAccess.assertAppointmentIsActionable(appointment);
    return this.appointments.cancel(appointmentId, dto, identityId);
  }

  private toSummary(record: {
    id: string;
    appointmentReference: string;
    status: ServiceAppointmentStatus;
    scheduledStartsAt: Date | null;
    scheduledEndsAt: Date | null;
    isVirtual: boolean;
    appointmentReason: { name: string } | null;
    institution: { id: string; code: string; name: string };
    department: { id: string; name: string } | null;
    governmentService: { id: string; slug: string; publicName: string } | null;
  }) {
    return {
      id: record.id,
      appointmentReference: record.appointmentReference,
      status: record.status,
      scheduledStartsAt: record.scheduledStartsAt?.toISOString() ?? null,
      scheduledEndsAt: record.scheduledEndsAt?.toISOString() ?? null,
      reasonName: record.appointmentReason?.name ?? null,
      isVirtual: record.isVirtual,
      attribution: record.governmentService
        ? {
            institutionId: record.institution.id,
            institutionCode: record.institution.code,
            institutionName: record.institution.name,
            departmentId: record.department?.id ?? record.institution.id,
            departmentName: record.department?.name ?? record.institution.name,
            serviceId: record.governmentService.id,
            serviceSlug: record.governmentService.slug,
            serviceName: record.governmentService.publicName,
          }
        : undefined,
      disclaimer: {
        label: SCHEDULING_DISCLAIMER.schedulingDoesNotImplyApproval,
        labelKey: 'scheduling.disclaimer.no_implied_approval',
      },
    };
  }

  private resolveAvailableActions(status: ServiceAppointmentStatus): string[] {
    if (
      status === ServiceAppointmentStatus.CANCELLED ||
      status === ServiceAppointmentStatus.COMPLETED
    ) {
      return [];
    }

    const actions = ['VIEW'];
    if (
      status === ServiceAppointmentStatus.SCHEDULED ||
      status === ServiceAppointmentStatus.RESCHEDULED
    ) {
      actions.push('CONFIRM', 'RESCHEDULE_REQUEST', 'CANCEL');
    }
    if (status === ServiceAppointmentStatus.REQUESTED) {
      actions.push('CANCEL');
    }
    return actions;
  }
}
