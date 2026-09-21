import { Injectable } from '@nestjs/common';
import { CommunicationChannelType, ServiceAppointmentAuditEventType } from '@prisma/client';

import { generateReferenceNumber } from '../../application-processing/common/reference-number.util';
import { PrismaService } from '../../database/prisma.service';
import { CommunicationMessageService } from '../../operational-support/communications/communication-message.service';
import { ServiceAppointmentAuditService } from '../audit/service-appointment-audit.service';
import { SCHEDULING_DISCLAIMER } from '../scheduling.constants';

@Injectable()
export class AppointmentReminderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationMessages: CommunicationMessageService,
    private readonly audit: ServiceAppointmentAuditService,
  ) {}

  async scheduleReminder(input: {
    serviceAppointmentId: string;
    recipientIdentityId: string;
    scheduledFor: Date;
    actorIdentityId?: string;
  }) {
    const appointment = await this.prisma.serviceAppointment.findUniqueOrThrow({
      where: { id: input.serviceAppointmentId },
      include: { appointmentReason: true },
    });

    const message = await this.communicationMessages.createMessage({
      messageReference: generateReferenceNumber('APPT-REM'),
      channelType: CommunicationChannelType.EMAIL,
      subject: 'Appointment reminder',
      body: `Reminder: you have an upcoming government service appointment (${appointment.appointmentReference}). ${SCHEDULING_DISCLAIMER.reminderIsNotLegalNotice}`,
      caseId: appointment.caseId ?? undefined,
      scheduledAt: input.scheduledFor,
      recipients: [
        {
          recipientType: 'IDENTITY',
          recipientReference: input.recipientIdentityId,
          recipientIdentityId: input.recipientIdentityId,
        },
      ],
    });

    const reminder = await this.prisma.serviceAppointmentReminder.create({
      data: {
        serviceAppointmentId: input.serviceAppointmentId,
        communicationMessageId: message.id,
        scheduledFor: input.scheduledFor,
        isOperationalReminder: true,
      },
    });

    await this.audit.record({
      serviceAppointmentId: input.serviceAppointmentId,
      eventType: ServiceAppointmentAuditEventType.REMINDER_SCHEDULED,
      actorIdentityId: input.actorIdentityId,
      metadata: {
        communicationMessageId: message.id,
        isOperationalReminder: true,
        isLegalNotice: false,
        disclaimer: SCHEDULING_DISCLAIMER.reminderIsNotLegalNotice,
      },
    });

    return { reminder, message };
  }
}
