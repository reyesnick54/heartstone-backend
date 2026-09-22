import { Injectable } from '@nestjs/common';
import {
  PublicSafetyExternalDependencyStatus,
  PublicSafetyInspectionRequestStatus,
  PublicSafetyServiceRequestStatus,
  PublicSafetyVerificationStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { DepartmentAccessService } from '../../../experience/department/services/department-access.service';
import { DepartmentMetricsFreshnessService } from '../../../experience/department/services/department-metrics-freshness.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import {
  PUBLIC_SAFETY_METRICS_DISCLAIMER,
  PUBLIC_SAFETY_RULE_ENVIRONMENT,
} from '../../public-safety.constants';

@Injectable()
export class DepartmentPublicSafetyMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DepartmentAccessService,
    private readonly freshnessService: DepartmentMetricsFreshnessService,
  ) {}

  async buildMetrics(actor: ActorContext, departmentId: string) {
    await this.accessService.resolveManagementContext(actor, departmentId);
    const calculatedAt = new Date();
    const engagementFilter = { responsibleDepartmentId: departmentId };

    const [
      openIncidents,
      verifiedIncidents,
      pendingVerification,
      assistanceRequests,
      inspectionBacklog,
      communicationPending,
      externalBlocked,
      responseStateOpen,
    ] = await Promise.all([
      this.prisma.publicSafetyIncidentReport.count({
        where: {
          engagement: engagementFilter,
          verificationStatus: {
            in: [
              PublicSafetyVerificationStatus.UNVERIFIED,
              PublicSafetyVerificationStatus.PENDING_VERIFICATION,
            ],
          },
        },
      }),
      this.prisma.publicSafetyIncidentReport.count({
        where: {
          engagement: engagementFilter,
          verificationStatus: PublicSafetyVerificationStatus.VERIFIED,
        },
      }),
      this.prisma.publicSafetyIncidentReport.count({
        where: {
          engagement: engagementFilter,
          verificationStatus: PublicSafetyVerificationStatus.PENDING_VERIFICATION,
        },
      }),
      this.prisma.publicSafetyServiceRequest.count({
        where: {
          engagement: engagementFilter,
          requestKind: 'REQUEST_EMERGENCY_ASSISTANCE',
          status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
        },
      }),
      this.prisma.publicSafetyInspectionRequest.count({
        where: {
          engagement: engagementFilter,
          status: {
            in: [
              PublicSafetyInspectionRequestStatus.REQUESTED,
              PublicSafetyInspectionRequestStatus.SCHEDULED,
            ],
          },
        },
      }),
      this.prisma.publicSafetyCommunicationDelivery.count({
        where: { engagement: engagementFilter, status: 'PENDING' },
      }),
      this.prisma.publicSafetyExternalDependency.count({
        where: {
          engagement: engagementFilter,
          status: {
            in: [
              PublicSafetyExternalDependencyStatus.PENDING,
              PublicSafetyExternalDependencyStatus.BLOCKED,
            ],
          },
        },
      }),
      this.prisma.publicSafetyServiceRequest.count({
        where: {
          engagement: engagementFilter,
          status: PublicSafetyServiceRequestStatus.UNDER_REVIEW,
        },
      }),
    ]);

    return {
      disclaimer: PUBLIC_SAFETY_METRICS_DISCLAIMER,
      ruleEnvironment: PUBLIC_SAFETY_RULE_ENVIRONMENT,
      departmentId,
      calculatedAt: calculatedAt.toISOString(),
      freshness: this.freshnessService.buildFreshness(calculatedAt),
      metrics: {
        openIncidents,
        verifiedIncidents,
        pendingVerification,
        assistanceRequests,
        inspectionBacklog,
        responseStateOpenRequests: responseStateOpen,
        communicationDeliveryPending: communicationPending,
        externalDependencyBlocked: externalBlocked,
      },
      informationalOnly: true,
    };
  }
}
