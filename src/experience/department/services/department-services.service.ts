import { Injectable } from '@nestjs/common';
import {
  CaseReferralStatus,
  CaseSlaClockStatus,
  CaseStatus,
  GovernmentServiceMaturityStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { DepartmentServicesResponseDto } from '../dto/department-services-response.dto';
import { DepartmentAccessService } from './department-access.service';
import { DepartmentMetricsFreshnessService } from './department-metrics-freshness.service';

@Injectable()
export class DepartmentServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DepartmentAccessService,
    private readonly freshnessService: DepartmentMetricsFreshnessService,
  ) {}

  async buildServicesView(
    actor: ActorContext,
    departmentId: string,
  ): Promise<DepartmentServicesResponseDto> {
    const context = await this.accessService.resolveManagementContext(actor, departmentId);
    const calculatedAt = new Date();

    const services = await this.prisma.governmentService.findMany({
      where: { responsibleDepartmentId: departmentId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const items = await Promise.all(
      services.map(async (service) => {
        const latestVersion = service.versions[0] ?? null;
        const [applicationVolume, backlog, unresolvedDependencies, slaBreachedCases] =
          await Promise.all([
            this.prisma.application.count({
              where: { governmentServiceId: service.id },
            }),
            this.prisma.case.count({
              where: {
                governmentServiceId: service.id,
                status: {
                  notIn: [
                    CaseStatus.CLOSED,
                    CaseStatus.WITHDRAWN,
                    CaseStatus.ISSUED,
                    CaseStatus.DECIDED,
                  ],
                },
              },
            }),
            this.prisma.caseReferral.count({
              where: {
                status: CaseReferralStatus.PENDING,
                case: { governmentServiceId: service.id },
              },
            }),
            this.prisma.case.count({
              where: {
                governmentServiceId: service.id,
                slaClocks: { some: { status: CaseSlaClockStatus.BREACHED } },
              },
            }),
          ]);

        const isSuspended =
          latestVersion?.maturityStatus === GovernmentServiceMaturityStatus.SUSPENDED;

        return {
          serviceId: service.id,
          serviceCode: service.code,
          serviceName: service.publicName,
          status: latestVersion?.maturityStatus ?? GovernmentServiceMaturityStatus.DRAFT,
          publicAvailability: latestVersion?.publicAvailability ?? 'HIDDEN',
          applicationVolume,
          backlog,
          unresolvedDependencyCount: unresolvedDependencies,
          slaStatus: slaBreachedCases > 0 ? 'BREACHED' : 'WITHIN_TARGETS',
          serviceSuspended: isSuspended,
          version: latestVersion?.version ?? null,
          versionId: latestVersion?.id ?? null,
        };
      }),
    );

    return {
      generatedAt: calculatedAt.toISOString(),
      departmentId: context.departmentId,
      departmentName: context.departmentName,
      items,
      suspendedServiceCount: items.filter((item) => item.serviceSuspended).length,
      metricsFreshness: this.freshnessService.buildFreshness(calculatedAt),
      authorityDisclaimer: context.authorityDisclaimer,
    };
  }
}
