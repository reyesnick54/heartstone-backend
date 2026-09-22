import { Injectable } from '@nestjs/common';
import { PublicSafetyServiceRequestKind } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { PublicSafetyAccessService } from '../../common/public-safety-access.service';
import {
  PUBLIC_SAFETY_BOUNDARY_DISCLAIMER,
  PUBLIC_SAFETY_RULE_ENVIRONMENT,
} from '../../public-safety.constants';

const BUSINESS_PUBLIC_SAFETY_KINDS: PublicSafetyServiceRequestKind[] = [
  PublicSafetyServiceRequestKind.SUBMIT_INCIDENT_REPORT,
  PublicSafetyServiceRequestKind.PUBLIC_SAFETY_PERMIT_APPLICATION,
  PublicSafetyServiceRequestKind.FIRE_SAFETY_INSPECTION_REQUEST,
  PublicSafetyServiceRequestKind.INFRASTRUCTURE_DISRUPTION_REPORT,
  PublicSafetyServiceRequestKind.RECOVERY_ASSISTANCE_APPLICATION,
];

@Injectable()
export class BusinessPublicSafetyProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PublicSafetyAccessService,
  ) {}

  async buildHome(identityId: string, organizationId: string) {
    await this.access.assertOrganizationMembership(identityId, organizationId);

    const engagementFilter = { organizationId };

    const [incidentReports, permits, inspections, facilityImpact, recoveryApplications] =
      await Promise.all([
        this.prisma.publicSafetyIncidentReport.count({
          where: { engagement: engagementFilter },
        }),
        this.prisma.publicSafetyServiceRequest.count({
          where: {
            engagement: engagementFilter,
            requestKind: PublicSafetyServiceRequestKind.PUBLIC_SAFETY_PERMIT_APPLICATION,
          },
        }),
        this.prisma.publicSafetyInspectionRequest.count({
          where: { engagement: engagementFilter },
        }),
        this.prisma.publicSafetyServiceRequest.count({
          where: {
            engagement: engagementFilter,
            requestKind: PublicSafetyServiceRequestKind.INFRASTRUCTURE_DISRUPTION_REPORT,
          },
        }),
        this.prisma.publicSafetyRecoveryAssistanceApplication.count({
          where: { engagement: engagementFilter },
        }),
      ]);

    return {
      disclaimer: PUBLIC_SAFETY_BOUNDARY_DISCLAIMER,
      ruleEnvironment: PUBLIC_SAFETY_RULE_ENVIRONMENT,
      incidentReports,
      emergencyPermits: permits,
      fireSafetyInspections: inspections,
      facilityImpactReports: facilityImpact,
      recoveryApplications,
    };
  }

  async listScopedRecords(identityId: string, organizationId: string) {
    await this.access.assertOrganizationMembership(identityId, organizationId);

    const requests = await this.prisma.publicSafetyServiceRequest.findMany({
      where: {
        engagement: { organizationId },
        requestKind: { in: BUSINESS_PUBLIC_SAFETY_KINDS },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: requests.map((request) => ({
        requestReference: request.requestReference,
        requestKind: request.requestKind,
        status: request.status,
        serviceTemplateCode: request.serviceTemplateCode,
      })),
    };
  }
}
