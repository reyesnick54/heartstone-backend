import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AppointmentParticipantRole,
  Prisma,
  ServiceAppointment,
  ServiceAppointmentStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CitizenAccessService } from '../../experience/common/citizen-access.service';
import { type ResolvedOfficialContext } from '../../experience/official/types/official-context.types';

export type ServiceAppointmentAccessKind = 'CITIZEN' | 'BUSINESS' | 'OFFICIAL' | 'ADMIN';

@Injectable()
export class ServiceAppointmentAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly citizenAccess: CitizenAccessService,
  ) {}

  buildCitizenWhere(identityId: string): Prisma.ServiceAppointmentWhereInput {
    return {
      participants: {
        some: {
          identityId,
          role: {
            in: [AppointmentParticipantRole.APPLICANT, AppointmentParticipantRole.REPRESENTATIVE],
          },
        },
      },
    };
  }

  buildBusinessWhere(
    organizationId: string,
    representedOrganizationIds: string[],
  ): Prisma.ServiceAppointmentWhereInput {
    if (!representedOrganizationIds.includes(organizationId)) {
      return { id: { in: [] } };
    }

    return {
      organizationId,
      participants: {
        some: {
          role: AppointmentParticipantRole.REPRESENTATIVE,
          organizationId,
        },
      },
    };
  }

  buildOfficialWhere(context: ResolvedOfficialContext): Prisma.ServiceAppointmentWhereInput {
    if (!context.technicalCapabilities.substantiveAccessAllowed) {
      return { id: { in: [] } };
    }

    return {
      departmentId: { in: context.scope.departmentIds },
    };
  }

  async assertCitizenAccess(
    appointmentId: string,
    identityId: string,
  ): Promise<ServiceAppointment> {
    const appointment = await this.prisma.serviceAppointment.findFirst({
      where: {
        id: appointmentId,
        ...this.buildCitizenWhere(identityId),
      },
    });

    if (!appointment) {
      throw new NotFoundException('Service appointment not found');
    }

    return appointment;
  }

  async assertBusinessAccess(
    appointmentId: string,
    organizationId: string,
    identityId: string,
  ): Promise<ServiceAppointment> {
    const scope = await this.citizenAccess.resolveAccessibleScope(identityId);
    const appointment = await this.prisma.serviceAppointment.findFirst({
      where: {
        id: appointmentId,
        ...this.buildBusinessWhere(organizationId, scope.representedOrganizationIds),
      },
    });

    if (!appointment) {
      throw new NotFoundException('Service appointment not found');
    }

    return appointment;
  }

  async assertOfficialAccess(
    appointmentId: string,
    context: ResolvedOfficialContext,
  ): Promise<ServiceAppointment> {
    const appointment = await this.prisma.serviceAppointment.findFirst({
      where: {
        id: appointmentId,
        ...this.buildOfficialWhere(context),
      },
    });

    if (!appointment) {
      throw new NotFoundException('Service appointment not found');
    }

    return appointment;
  }

  assertAppointmentIsActionable(appointment: ServiceAppointment): void {
    if (
      appointment.status === ServiceAppointmentStatus.CANCELLED ||
      appointment.status === ServiceAppointmentStatus.COMPLETED
    ) {
      throw new ForbiddenException('Appointment is no longer actionable');
    }
  }
}
