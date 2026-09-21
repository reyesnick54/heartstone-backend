import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AppointmentReasonsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    code: string;
    name: string;
    description?: string;
    institutionId?: string;
    departmentId?: string;
    governmentServiceId?: string;
  }) {
    return this.prisma.appointmentReason.create({ data: input });
  }

  list(filter: { institutionId?: string; departmentId?: string; governmentServiceId?: string }) {
    return this.prisma.appointmentReason.findMany({
      where: {
        isActive: true,
        ...(filter.institutionId ? { institutionId: filter.institutionId } : {}),
        ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
        ...(filter.governmentServiceId ? { governmentServiceId: filter.governmentServiceId } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }
}
