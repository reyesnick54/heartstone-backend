import { Injectable } from '@nestjs/common';
import { AppointmentLocationKind } from '@prisma/client';

import { generateReferenceNumber } from '../../application-processing/common/reference-number.util';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AppointmentLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    name: string;
    kind: AppointmentLocationKind;
    institutionId?: string;
    departmentId?: string;
    addressLine1?: string;
    virtualMeetingUrl?: string;
  }) {
    return this.prisma.appointmentLocation.create({
      data: {
        locationReference: generateReferenceNumber('APPT-LOC'),
        name: input.name,
        kind: input.kind,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
        addressLine1: input.addressLine1,
        virtualMeetingUrl: input.virtualMeetingUrl,
      },
    });
  }

  list(filter: { institutionId?: string; departmentId?: string }) {
    return this.prisma.appointmentLocation.findMany({
      where: {
        isActive: true,
        ...(filter.institutionId ? { institutionId: filter.institutionId } : {}),
        ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }
}
