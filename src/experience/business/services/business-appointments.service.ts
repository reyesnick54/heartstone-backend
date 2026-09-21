import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { ServiceAppointmentAccessService } from '../../../scheduling/access/service-appointment-access.service';
import { SCHEDULING_DISCLAIMER } from '../../../scheduling/scheduling.constants';
import { CitizenAppointmentsResponseDto } from '../../citizen/dto/citizen-appointment.dto';
import { BusinessAccessService } from '../../common/business-access.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class BusinessAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessAccess: BusinessAccessService,
    private readonly appointmentAccess: ServiceAppointmentAccessService,
  ) {}

  async listOrganizationAppointments(
    identityId: string,
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<CitizenAppointmentsResponseDto> {
    await this.businessAccess.assertOrganizationAccess(organizationId, identityId);

    const accessibleOrganizations =
      await this.businessAccess.listAccessibleOrganizations(identityId);
    const representedOrganizationIds = accessibleOrganizations.map((org) => org.organizationId);

    const where = this.appointmentAccess.buildBusinessWhere(
      organizationId,
      representedOrganizationIds,
    );
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
      items: records.map((record) => ({
        id: record.id,
        appointmentReference: record.appointmentReference,
        status: record.status,
        scheduledStartsAt: record.scheduledStartsAt?.toISOString() ?? null,
        scheduledEndsAt: record.scheduledEndsAt?.toISOString() ?? null,
        reasonName: record.appointmentReason?.name ?? null,
        isVirtual: record.isVirtual,
        virtualMeetingUrl: null,
        locationName: null,
        availableActions: ['VIEW'],
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
      })),
      pagination: this.businessAccess.buildPaginationMeta(page, pageSize, totalItems),
    };
  }
}
