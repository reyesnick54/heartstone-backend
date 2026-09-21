import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { mapInstitutionAttribution } from '../../citizen/mappers/citizen-attribution.mapper';
import { BusinessAccessService } from '../../common/business-access.service';
import { type PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { type BusinessApplicationsResponseDto } from '../dto/business-application.dto';

@Injectable()
export class BusinessApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async listApplications(
    identityId: string,
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<BusinessApplicationsResponseDto> {
    const orgAccess = await this.access.assertOrganizationAccess(organizationId, identityId);
    const applicationWhere = this.access.buildApplicationWhere(orgAccess);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [totalItems, applications] = await Promise.all([
      this.prisma.application.count({ where: applicationWhere }),
      this.prisma.application.findMany({
        where: applicationWhere,
        include: {
          case: { select: { id: true } },
          governmentService: {
            include: { responsibleInstitution: true, responsibleDepartment: true },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: applications.map((application) => ({
        applicationId: application.id,
        applicationNumber: application.applicationNumber,
        status: application.status,
        applicantCategory: application.applicantCategory,
        updatedAt: application.updatedAt.toISOString(),
        caseId: application.case?.id ?? null,
        attribution: mapInstitutionAttribution(application),
      })),
      pagination: this.access.buildPaginationMeta(page, pageSize, totalItems),
      disclaimer: {
        label: 'Application listings exclude internal officer notes and restricted evidence.',
        labelKey: 'business.applications.disclaimer',
      },
    };
  }
}
