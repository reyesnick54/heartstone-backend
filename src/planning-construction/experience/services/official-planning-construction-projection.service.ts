import { Injectable } from '@nestjs/common';
import {
  DevelopmentApplicationStatus,
  DevelopmentExternalDependencyStatus,
  DevelopmentInspectionOutcome,
  DevelopmentInspectionStatus,
  DevelopmentOccupancyCertificateStatus,
  DevelopmentPermitStatus,
  DevelopmentPlanningAppealStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import {
  PLANNING_BOUNDARY_DISCLAIMER,
  PLANNING_CONSTRUCTION_RULE_ENVIRONMENT,
} from '../../planning-construction.constants';

@Injectable()
export class OfficialPlanningConstructionProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async buildWorkspace(context: ResolvedOfficialContext) {
    if (!context.technicalCapabilities.substantiveAccessAllowed) {
      return this.emptyWorkspace();
    }

    const jurisdictionFilter = context.institutionalContext.jurisdictionIds.length
      ? { jurisdictionId: { in: context.institutionalContext.jurisdictionIds } }
      : {};

    const [
      planningIntake,
      zoningReviews,
      technicalReviews,
      professionalDocumentReviews,
      externalAuthorityReferrals,
      inspections,
      reinspection,
      permitDecisionReady,
      occupancyCertificateQueue,
      appeals,
      slaRisk,
    ] = await Promise.all([
      this.prisma.developmentApplication.count({
        where: {
          status: DevelopmentApplicationStatus.SUBMITTED,
          developmentProject: jurisdictionFilter,
        },
      }),
      this.prisma.developmentApplication.count({
        where: {
          serviceCode: { contains: 'ZONING' },
          status: DevelopmentApplicationStatus.UNDER_REVIEW,
          developmentProject: jurisdictionFilter,
        },
      }),
      this.prisma.developmentApplication.count({
        where: {
          status: DevelopmentApplicationStatus.UNDER_REVIEW,
          developmentProject: jurisdictionFilter,
        },
      }),
      this.prisma.developmentApplication.count({
        where: {
          serviceCode: { contains: 'PROFESSIONAL' },
          status: DevelopmentApplicationStatus.UNDER_REVIEW,
          developmentProject: jurisdictionFilter,
        },
      }),
      this.prisma.developmentExternalDependency.count({
        where: {
          status: DevelopmentExternalDependencyStatus.REFERRED,
          developmentProject: jurisdictionFilter,
        },
      }),
      this.prisma.developmentInspection.count({
        where: {
          status: DevelopmentInspectionStatus.SCHEDULED,
          developmentProject: jurisdictionFilter,
        },
      }),
      this.prisma.developmentInspection.count({
        where: {
          status: DevelopmentInspectionStatus.COMPLETED,
          outcome: DevelopmentInspectionOutcome.FAIL,
          developmentProject: jurisdictionFilter,
        },
      }),
      this.prisma.developmentPermit.count({
        where: {
          status: DevelopmentPermitStatus.UNDER_REVIEW,
          developmentProject: jurisdictionFilter,
        },
      }),
      this.prisma.developmentOccupancyCertificate.count({
        where: {
          status: {
            in: [
              DevelopmentOccupancyCertificateStatus.REQUESTED,
              DevelopmentOccupancyCertificateStatus.UNDER_REVIEW,
            ],
          },
          developmentProject: jurisdictionFilter,
        },
      }),
      this.prisma.developmentPlanningAppeal.count({
        where: {
          status: {
            in: [
              DevelopmentPlanningAppealStatus.FILED,
              DevelopmentPlanningAppealStatus.UNDER_REVIEW,
            ],
          },
          developmentProject: jurisdictionFilter,
        },
      }),
      this.prisma.developmentApplication.count({
        where: {
          status: DevelopmentApplicationStatus.UNDER_REVIEW,
          submittedAt: { lte: new Date(Date.now() - 25 * 86400000) },
          developmentProject: jurisdictionFilter,
        },
      }),
    ]);

    return {
      ruleEnvironment: PLANNING_CONSTRUCTION_RULE_ENVIRONMENT,
      disclaimer: PLANNING_BOUNDARY_DISCLAIMER,
      workspaceDisclaimer:
        'Queue counts are operational indicators. Analytics and AI assistance cannot issue permits or occupancy certificates.',
      queues: {
        planningIntake,
        zoningReviews,
        technicalReviews,
        professionalDocumentReviews,
        externalAuthorityReferrals,
        inspections,
        reinspection,
        permitDecisionReadyCases: permitDecisionReady,
        occupancyCertificateQueue,
        appeals,
        slaRisk,
      },
    };
  }

  private emptyWorkspace() {
    return {
      ruleEnvironment: PLANNING_CONSTRUCTION_RULE_ENVIRONMENT,
      disclaimer: PLANNING_BOUNDARY_DISCLAIMER,
      workspaceDisclaimer:
        'Queue counts are operational indicators. Analytics and AI assistance cannot issue permits or occupancy certificates.',
      queues: {
        planningIntake: 0,
        zoningReviews: 0,
        technicalReviews: 0,
        professionalDocumentReviews: 0,
        externalAuthorityReferrals: 0,
        inspections: 0,
        reinspection: 0,
        permitDecisionReadyCases: 0,
        occupancyCertificateQueue: 0,
        appeals: 0,
        slaRisk: 0,
      },
    };
  }
}
