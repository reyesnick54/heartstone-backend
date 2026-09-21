import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AppointmentParticipantRole,
  AppointmentRescheduleStatus,
  OperationalSuspensionScope,
  Prisma,
  ServiceAppointment,
  ServiceAppointmentAuditEventType,
  ServiceAppointmentStatus,
} from '@prisma/client';

import { generateReferenceNumber } from '../../application-processing/common/reference-number.util';
import { PrismaService } from '../../database/prisma.service';
import { OperationalSuspensionService } from '../../production-readiness/suspension/operational-suspension.service';
import { ServiceAppointmentAuditService } from '../audit/service-appointment-audit.service';
import { SchedulingBoundaryService } from '../common/scheduling-boundary.service';
import { AppointmentReminderService } from '../reminders/appointment-reminder.service';
import { SERVICE_APPOINTMENT_REFERENCE_PREFIX } from '../scheduling.constants';
import { CancelServiceAppointmentDto } from './dto/cancel-service-appointment.dto';
import { CompleteServiceAppointmentDto } from './dto/complete-service-appointment.dto';
import { CreateServiceAppointmentDto } from './dto/create-service-appointment.dto';
import { RescheduleServiceAppointmentDto } from './dto/reschedule-service-appointment.dto';

const ACTIVE_APPOINTMENT_INCLUDE = {
  participants: true,
  appointmentReason: true,
  appointmentLocation: true,
  appointmentSlot: true,
  assignedResource: true,
  institution: true,
  department: true,
  governmentService: true,
} satisfies Prisma.ServiceAppointmentInclude;

@Injectable()
export class ServiceAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: ServiceAppointmentAuditService,
    private readonly boundary: SchedulingBoundaryService,
    private readonly operationalSuspension: OperationalSuspensionService,
    private readonly reminders: AppointmentReminderService,
  ) {}

  async create(
    dto: CreateServiceAppointmentDto,
    actorIdentityId?: string,
  ): Promise<ServiceAppointment> {
    this.boundary.rejectClientParticipantIdentityOverride(
      dto as unknown as Record<string, unknown>,
    );

    if (dto.governmentServiceId) {
      await this.assertServiceBookingAllowed(dto.governmentServiceId);
    }

    let scheduledStartsAt = dto.scheduledStartsAt ? new Date(dto.scheduledStartsAt) : undefined;
    let scheduledEndsAt = dto.scheduledEndsAt ? new Date(dto.scheduledEndsAt) : undefined;
    let appointmentSlotId = dto.appointmentSlotId;

    if (dto.appointmentSlotId) {
      const slot = await this.prisma.appointmentSlot.findUnique({
        where: { id: dto.appointmentSlotId },
      });
      if (!slot || !slot.isAvailable || slot.bookedCount >= slot.capacity) {
        throw new BadRequestException('Selected appointment slot is unavailable');
      }
      scheduledStartsAt = slot.startsAt;
      scheduledEndsAt = slot.endsAt;
      appointmentSlotId = slot.id;
    }

    const participantRole = dto.representativeOrganizationId
      ? AppointmentParticipantRole.REPRESENTATIVE
      : AppointmentParticipantRole.APPLICANT;

    const appointment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.serviceAppointment.create({
        data: {
          appointmentReference: generateReferenceNumber(SERVICE_APPOINTMENT_REFERENCE_PREFIX),
          status: scheduledStartsAt
            ? ServiceAppointmentStatus.SCHEDULED
            : ServiceAppointmentStatus.REQUESTED,
          institutionId: dto.institutionId,
          departmentId: dto.departmentId,
          governmentServiceId: dto.governmentServiceId,
          applicationId: dto.applicationId,
          caseId: dto.caseId,
          organizationId: dto.organizationId ?? dto.representativeOrganizationId,
          appointmentReasonId: dto.appointmentReasonId,
          appointmentSlotId,
          appointmentLocationId: dto.appointmentLocationId,
          assignedResourceId: dto.assignedResourceId,
          assignedOfficialIdentityId: dto.assignedOfficialIdentityId,
          assignedOfficialOfficeholderId: dto.assignedOfficialOfficeholderId,
          scheduledStartsAt,
          scheduledEndsAt,
          isVirtual: dto.isVirtual ?? false,
          virtualMeetingUrl: dto.virtualMeetingUrl,
          operationalNotes: dto.operationalNotes,
          createdByIdentityId: actorIdentityId,
          participants: {
            create: {
              identityId: dto.primaryParticipantIdentityId,
              role: participantRole,
              organizationId: dto.representativeOrganizationId,
              isPrimary: true,
            },
          },
        },
        include: ACTIVE_APPOINTMENT_INCLUDE,
      });

      if (appointmentSlotId) {
        await tx.appointmentSlot.update({
          where: { id: appointmentSlotId },
          data: { bookedCount: { increment: 1 } },
        });
      }

      return created;
    });

    await this.audit.record({
      serviceAppointmentId: appointment.id,
      eventType: ServiceAppointmentAuditEventType.CREATED,
      actorIdentityId,
      metadata: { status: appointment.status },
    });

    if (appointment.scheduledStartsAt) {
      const reminderTime = new Date(appointment.scheduledStartsAt.getTime() - 24 * 60 * 60 * 1000);
      if (reminderTime > new Date()) {
        await this.reminders.scheduleReminder({
          serviceAppointmentId: appointment.id,
          recipientIdentityId: dto.primaryParticipantIdentityId,
          scheduledFor: reminderTime,
          actorIdentityId,
        });
      }
    }

    return appointment;
  }

  async findById(id: string): Promise<ServiceAppointment> {
    const appointment = await this.prisma.serviceAppointment.findUnique({
      where: { id },
      include: ACTIVE_APPOINTMENT_INCLUDE,
    });
    if (!appointment) {
      throw new NotFoundException('Service appointment not found');
    }
    return appointment;
  }

  async list(filter: Prisma.ServiceAppointmentWhereInput) {
    return this.prisma.serviceAppointment.findMany({
      where: filter,
      include: ACTIVE_APPOINTMENT_INCLUDE,
      orderBy: [{ scheduledStartsAt: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async confirm(appointmentId: string, actorIdentityId: string): Promise<ServiceAppointment> {
    const appointment = await this.updateStatus(
      appointmentId,
      ServiceAppointmentStatus.CONFIRMED,
      ServiceAppointmentAuditEventType.CONFIRMED,
      actorIdentityId,
      { confirmedAt: new Date() },
    );
    return appointment;
  }

  async requestReschedule(
    appointmentId: string,
    dto: RescheduleServiceAppointmentDto,
    actorIdentityId: string,
  ): Promise<ServiceAppointment> {
    const existing = await this.findById(appointmentId);

    await this.prisma.appointmentReschedule.create({
      data: {
        serviceAppointmentId: appointmentId,
        requestedByIdentityId: actorIdentityId,
        previousStartsAt: existing.scheduledStartsAt,
        previousEndsAt: existing.scheduledEndsAt,
        requestedStartsAt: dto.requestedStartsAt ? new Date(dto.requestedStartsAt) : undefined,
        requestedEndsAt: dto.requestedEndsAt ? new Date(dto.requestedEndsAt) : undefined,
        reason: dto.reason,
        status: AppointmentRescheduleStatus.PENDING,
      },
    });

    await this.audit.record({
      serviceAppointmentId: appointmentId,
      eventType: ServiceAppointmentAuditEventType.RESCHEDULE_REQUESTED,
      actorIdentityId,
      metadata: {
        requestedStartsAt: dto.requestedStartsAt,
        requestedEndsAt: dto.requestedEndsAt,
        reason: dto.reason,
      },
    });

    return this.findById(appointmentId);
  }

  async approveReschedule(
    appointmentId: string,
    actorIdentityId: string,
  ): Promise<ServiceAppointment> {
    const pending = await this.prisma.appointmentReschedule.findFirst({
      where: {
        serviceAppointmentId: appointmentId,
        status: AppointmentRescheduleStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!pending) {
      throw new NotFoundException('No pending reschedule request');
    }

    const appointment = await this.prisma.serviceAppointment.update({
      where: { id: appointmentId },
      data: {
        status: ServiceAppointmentStatus.RESCHEDULED,
        scheduledStartsAt: pending.requestedStartsAt ?? undefined,
        scheduledEndsAt: pending.requestedEndsAt ?? undefined,
      },
      include: ACTIVE_APPOINTMENT_INCLUDE,
    });

    await this.prisma.appointmentReschedule.update({
      where: { id: pending.id },
      data: {
        status: AppointmentRescheduleStatus.APPROVED,
        approvedByIdentityId: actorIdentityId,
      },
    });

    await this.audit.record({
      serviceAppointmentId: appointmentId,
      eventType: ServiceAppointmentAuditEventType.RESCHEDULED,
      actorIdentityId,
      metadata: {
        previousStartsAt: pending.previousStartsAt?.toISOString(),
        newStartsAt: pending.requestedStartsAt?.toISOString(),
      },
    });

    return appointment;
  }

  async cancel(
    appointmentId: string,
    dto: CancelServiceAppointmentDto,
    actorIdentityId: string,
  ): Promise<ServiceAppointment> {
    const existing = await this.findById(appointmentId);

    await this.prisma.$transaction(async (tx) => {
      await tx.appointmentCancellation.create({
        data: {
          serviceAppointmentId: appointmentId,
          cancelledByIdentityId: actorIdentityId,
          reason: dto.reason,
        },
      });

      await tx.serviceAppointment.update({
        where: { id: appointmentId },
        data: {
          status: ServiceAppointmentStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      if (existing.appointmentSlotId) {
        await tx.appointmentSlot.update({
          where: { id: existing.appointmentSlotId },
          data: { bookedCount: { decrement: 1 } },
        });
      }
    });

    await this.audit.record({
      serviceAppointmentId: appointmentId,
      eventType: ServiceAppointmentAuditEventType.CANCELLED,
      actorIdentityId,
      metadata: { reason: dto.reason },
    });

    return this.findById(appointmentId);
  }

  async complete(
    appointmentId: string,
    dto: CompleteServiceAppointmentDto,
    actorIdentityId: string,
  ): Promise<ServiceAppointment> {
    const appointment = await this.prisma.serviceAppointment.update({
      where: { id: appointmentId },
      data: {
        status: ServiceAppointmentStatus.COMPLETED,
        completedAt: new Date(),
        operationalNotes: dto.outcomeNotes,
      },
      include: ACTIVE_APPOINTMENT_INCLUDE,
    });

    await this.audit.record({
      serviceAppointmentId: appointmentId,
      eventType: ServiceAppointmentAuditEventType.COMPLETED,
      actorIdentityId,
      metadata: {
        outcomeNotes: dto.outcomeNotes,
        doesNotChangeCaseApproval: true,
      },
    });

    return appointment;
  }

  private async updateStatus(
    appointmentId: string,
    status: ServiceAppointmentStatus,
    auditEvent: ServiceAppointmentAuditEventType,
    actorIdentityId: string,
    extra: Prisma.ServiceAppointmentUpdateInput,
  ): Promise<ServiceAppointment> {
    const appointment = await this.prisma.serviceAppointment.update({
      where: { id: appointmentId },
      data: { status, ...extra },
      include: ACTIVE_APPOINTMENT_INCLUDE,
    });

    await this.audit.record({
      serviceAppointmentId: appointmentId,
      eventType: auditEvent,
      actorIdentityId,
    });

    return appointment;
  }

  private async assertServiceBookingAllowed(governmentServiceId: string): Promise<void> {
    const suspensions = await this.operationalSuspension.getActiveSuspensionsForTarget(
      OperationalSuspensionScope.SERVICE,
      governmentServiceId,
    );

    if (
      this.operationalSuspension.isTargetSuspended(
        OperationalSuspensionScope.SERVICE,
        governmentServiceId,
        suspensions,
      )
    ) {
      throw new BadRequestException(
        'New appointment booking is unavailable while this service is operationally suspended',
      );
    }
  }
}
