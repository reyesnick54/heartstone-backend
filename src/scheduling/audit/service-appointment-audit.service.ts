import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ServiceAppointmentAuditEvent,
  ServiceAppointmentAuditEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface RecordServiceAppointmentAuditInput {
  serviceAppointmentId: string;
  eventType: ServiceAppointmentAuditEventType;
  actorIdentityId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class ServiceAppointmentAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordServiceAppointmentAuditInput): Promise<ServiceAppointmentAuditEvent> {
    return this.prisma.serviceAppointmentAuditEvent.create({
      data: {
        serviceAppointmentId: input.serviceAppointmentId,
        eventType: input.eventType,
        actorIdentityId: input.actorIdentityId,
        metadata: input.metadata ?? {},
      },
    });
  }

  async findByAppointment(serviceAppointmentId: string): Promise<ServiceAppointmentAuditEvent[]> {
    return this.prisma.serviceAppointmentAuditEvent.findMany({
      where: { serviceAppointmentId },
      orderBy: { recordedAt: 'asc' },
    });
  }
}
