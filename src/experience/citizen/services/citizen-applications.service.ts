import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { CitizenAccessService } from '../../common/citizen-access.service';
import { type PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  type CitizenApplicationDetailDto,
  type CitizenApplicationsResponseDto,
} from '../dto/citizen-application.dto';
import { mapInstitutionAttribution } from '../mappers/citizen-attribution.mapper';

const applicationInclude = {
  governmentService: {
    include: {
      responsibleInstitution: true,
      responsibleDepartment: true,
    },
  },
  organization: true,
  case: {
    include: {
      publicStatusProjection: true,
    },
  },
} satisfies Prisma.ApplicationInclude;

@Injectable()
export class CitizenApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CitizenAccessService,
  ) {}

  async listApplications(
    identityId: string,
    query: PaginationQueryDto,
  ): Promise<CitizenApplicationsResponseDto> {
    const scope = await this.access.resolveAccessibleScope(identityId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.access.buildApplicationWhere(scope);

    const [totalItems, applications] = await Promise.all([
      this.prisma.application.count({ where }),
      this.prisma.application.findMany({
        where,
        include: applicationInclude,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: applications.map((application) => this.mapSummary(application)),
      pagination: this.access.buildPaginationMeta(page, pageSize, totalItems),
    };
  }

  async getApplication(
    identityId: string,
    applicationId: string,
  ): Promise<CitizenApplicationDetailDto> {
    await this.access.assertApplicationAccess(applicationId, identityId);

    const application = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: applicationInclude,
    });

    return {
      ...this.mapSummary(application),
      organizationId: application.organizationId ?? undefined,
      organizationName: application.organization?.name,
      representativeAuthorityId: application.representativeAuthorityId ?? undefined,
      formDefinitionId: application.formDefinitionId,
      formVersionId: application.formVersionId,
      governmentServiceVersionId: application.governmentServiceVersionId,
      disclaimer: {
        label:
          'Application details are informational only and do not constitute a government decision.',
        labelKey: 'citizen.application.disclaimer',
      },
    };
  }

  private mapSummary(
    application: Prisma.ApplicationGetPayload<{ include: typeof applicationInclude }>,
  ) {
    return {
      applicationId: application.id,
      applicationNumber: application.applicationNumber ?? undefined,
      status: application.status,
      applicantCategory: application.applicantCategory,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      attribution: mapInstitutionAttribution(application),
      caseId: application.case?.id,
      caseNumber: application.case?.caseNumber,
      publicStatusLabel: application.case?.publicStatusProjection?.publicStatusLabel ?? undefined,
      deepLink: {
        route: 'citizen.application.detail',
        params: { applicationId: application.id },
      },
    };
  }
}
