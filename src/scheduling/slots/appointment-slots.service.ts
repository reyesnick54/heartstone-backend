import { BadRequestException, Injectable } from '@nestjs/common';

import { generateReferenceNumber } from '../../application-processing/common/reference-number.util';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AppointmentSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    institutionId: string;
    departmentId?: string;
    governmentServiceId?: string;
    locationId?: string;
    resourceId?: string;
    startsAt: Date;
    endsAt: Date;
    capacity?: number;
  }) {
    if (input.endsAt <= input.startsAt) {
      throw new BadRequestException('Slot end must be after start');
    }

    return this.prisma.appointmentSlot.create({
      data: {
        slotReference: generateReferenceNumber('APPT-SLOT'),
        institutionId: input.institutionId,
        departmentId: input.departmentId,
        governmentServiceId: input.governmentServiceId,
        locationId: input.locationId,
        resourceId: input.resourceId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        capacity: input.capacity ?? 1,
      },
    });
  }

  listAvailable(filter: {
    institutionId?: string;
    departmentId?: string;
    governmentServiceId?: string;
  }) {
    return this.prisma.appointmentSlot.findMany({
      where: {
        isAvailable: true,
        ...(filter.institutionId ? { institutionId: filter.institutionId } : {}),
        ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
        ...(filter.governmentServiceId ? { governmentServiceId: filter.governmentServiceId } : {}),
      },
      orderBy: { startsAt: 'asc' },
    });
  }
}
