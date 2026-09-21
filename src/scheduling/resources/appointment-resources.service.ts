import { Injectable } from '@nestjs/common';

import { generateReferenceNumber } from '../../application-processing/common/reference-number.util';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AppointmentResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    name: string;
    resourceType: string;
    officeholderId?: string;
    identityId?: string;
    departmentId?: string;
  }) {
    return this.prisma.appointmentResource.create({
      data: {
        resourceReference: generateReferenceNumber('APPT-RES'),
        name: input.name,
        resourceType: input.resourceType,
        officeholderId: input.officeholderId,
        identityId: input.identityId,
        departmentId: input.departmentId,
      },
    });
  }

  list(filter: { departmentId?: string }) {
    return this.prisma.appointmentResource.findMany({
      where: {
        isActive: true,
        ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }
}
