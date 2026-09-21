import { Injectable } from '@nestjs/common';
import { CaseReferralStatus, CaseStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { DepartmentDependenciesResponseDto } from '../dto/department-dependencies-response.dto';
import { DepartmentAccessService } from './department-access.service';
import { DepartmentMetricsFreshnessService } from './department-metrics-freshness.service';

@Injectable()
export class DepartmentDependenciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DepartmentAccessService,
    private readonly freshnessService: DepartmentMetricsFreshnessService,
  ) {}

  async buildDependenciesView(
    actor: ActorContext,
    departmentId: string,
  ): Promise<DepartmentDependenciesResponseDto> {
    const context = await this.accessService.resolveManagementContext(actor, departmentId);
    const calculatedAt = new Date();

    const [pendingReferrals, pendingExternalCases, externalDeterminations] = await Promise.all([
      this.prisma.caseReferral.findMany({
        where: {
          status: CaseReferralStatus.PENDING,
          case: { responsibleDepartmentId: departmentId },
        },
        include: {
          case: { select: { id: true, caseNumber: true, status: true } },
        },
        take: 100,
      }),
      this.prisma.case.findMany({
        where: {
          responsibleDepartmentId: departmentId,
          status: CaseStatus.PENDING_EXTERNAL,
        },
        select: {
          id: true,
          caseNumber: true,
          status: true,
        },
        take: 100,
      }),
      this.prisma.externalDependencyDetermination.findMany({
        where: {
          authorityDependency: {
            functionAuthorityRecord: {
              institutionId: context.institutionId,
            },
          },
        },
        select: {
          id: true,
          determinationStatus: true,
          receivedAt: true,
          authorityDependencyId: true,
        },
        orderBy: { receivedAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      generatedAt: calculatedAt.toISOString(),
      departmentId: context.departmentId,
      departmentName: context.departmentName,
      pendingReferrals: pendingReferrals.map((referral) => ({
        referralId: referral.id,
        caseId: referral.case.id,
        caseNumber: referral.case.caseNumber,
        caseStatus: referral.case.status,
        referralStatus: referral.status,
      })),
      pendingExternalCases,
      externalDeterminations: externalDeterminations.map((determination) => ({
        determinationId: determination.id,
        authorityDependencyId: determination.authorityDependencyId,
        determinationStatus: determination.determinationStatus,
        receivedAt: determination.receivedAt.toISOString(),
      })),
      unresolvedCount: pendingReferrals.length + pendingExternalCases.length,
      metricsFreshness: this.freshnessService.buildFreshness(calculatedAt),
      authorityDisclaimer: context.authorityDisclaimer,
    };
  }
}
