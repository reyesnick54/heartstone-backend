import { Injectable } from '@nestjs/common';
import {
  PropertyRegistryApplicationStatus,
  PropertyRegistryApplicationType,
  PropertySurveySubmissionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PROPERTY_OFFICIAL_ACTION_CODES, PROPERTY_REGISTRY_BOUNDARY_DISCLAIMER } from '../property-registry.constants';

@Injectable()
export class PropertyRegistryOfficialWorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async buildRegistryOfficerWorkspace() {
    const openStatuses = [
      PropertyRegistryApplicationStatus.SUBMITTED,
      PropertyRegistryApplicationStatus.UNDER_REVIEW,
      PropertyRegistryApplicationStatus.PENDING_DECISION,
    ];

    const [
      transfers,
      surveys,
      corrections,
      encumbranceRegistrations,
      releaseRequests,
      subdivisions,
      consolidations,
      titleIssuance,
      verificationDiscrepancies,
      externalDependencyChecks,
      slaRisk,
    ] = await Promise.all([
      this.countByType(PropertyRegistryApplicationType.TRANSFER, openStatuses),
      this.prisma.propertySurveySubmission.count({
        where: { status: PropertySurveySubmissionStatus.UNDER_REVIEW },
      }),
      this.countByType(PropertyRegistryApplicationType.CORRECTION, openStatuses),
      this.countByType(PropertyRegistryApplicationType.ENCUMBRANCE, openStatuses),
      this.countByType(PropertyRegistryApplicationType.ENCUMBRANCE_RELEASE, openStatuses),
      this.countByType(PropertyRegistryApplicationType.SUBDIVISION, openStatuses),
      this.countByType(PropertyRegistryApplicationType.CONSOLIDATION, openStatuses),
      this.countByType(PropertyRegistryApplicationType.EXTRACT_REQUEST, openStatuses),
      this.countByType(PropertyRegistryApplicationType.APPEAL, openStatuses),
      this.countByType(PropertyRegistryApplicationType.VALUATION, openStatuses),
      this.prisma.propertyRegistryApplication.count({
        where: {
          status: PropertyRegistryApplicationStatus.UNDER_REVIEW,
          submittedAt: { lte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      disclaimer: PROPERTY_REGISTRY_BOUNDARY_DISCLAIMER,
      queues: {
        transfers,
        surveys,
        corrections,
        encumbranceRegistrations,
        releaseRequests,
        subdivisions,
        consolidations,
        titleIssuance,
        verificationDiscrepancies,
        externalDependencyChecks,
        slaRisk,
      },
      availableActions: PROPERTY_OFFICIAL_ACTION_CODES,
    };
  }

  private countByType(
    applicationType: PropertyRegistryApplicationType,
    statuses: PropertyRegistryApplicationStatus[],
  ) {
    return this.prisma.propertyRegistryApplication.count({
      where: { applicationType, status: { in: statuses } },
    });
  }
}
