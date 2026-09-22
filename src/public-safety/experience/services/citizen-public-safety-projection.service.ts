import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { PublicSafetyBoundaryService } from '../../common/public-safety-boundary.service';
import {
  PUBLIC_SAFETY_BOUNDARY_DISCLAIMER,
  PUBLIC_SAFETY_RULE_ENVIRONMENT,
} from '../../public-safety.constants';

@Injectable()
export class CitizenPublicSafetyProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PublicSafetyBoundaryService,
  ) {}

  async buildHome(identityId: string) {
    const [reports, assistance, events, openActions] = await Promise.all([
      this.prisma.publicSafetyIncidentReport.count({
        where: { reporterIdentityId: identityId },
      }),
      this.prisma.publicSafetyRecoveryAssistanceApplication.count({
        where: { engagement: { reporterIdentityId: identityId } },
      }),
      this.prisma.publicSafetyEmergencyEvent.count({
        where: { status: { not: 'CLOSED' } },
      }),
      this.prisma.publicSafetyServiceRequest.count({
        where: {
          engagement: { reporterIdentityId: identityId },
          status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
        },
      }),
    ]);

    return {
      disclaimer: PUBLIC_SAFETY_BOUNDARY_DISCLAIMER,
      ruleEnvironment: PUBLIC_SAFETY_RULE_ENVIRONMENT,
      incidentReportCount: reports,
      assistanceRequestCount: assistance,
      publicEmergencyEventCount: events,
      openActionCount: openActions,
    };
  }

  async listReports(identityId: string) {
    const reports = await this.prisma.publicSafetyIncidentReport.findMany({
      where: { reporterIdentityId: identityId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: reports.map((report) =>
        this.boundary.sanitizeIncidentReportForProjection({
          verificationStatus: report.verificationStatus,
          summaryLabel: report.summaryLabel,
          locationDescription: report.locationDescription,
          protectsReporterIdentity: report.protectsReporterIdentity,
          reporterIdentityId: report.reporterIdentityId,
          viewerIdentityId: identityId,
        }),
      ),
    };
  }

  async listEmergencyEvents() {
    const events = await this.prisma.publicSafetyEmergencyEvent.findMany({
      where: { status: { not: 'CLOSED' } },
      orderBy: { updatedAt: 'desc' },
      take: 25,
    });

    return {
      disclaimer: PUBLIC_SAFETY_BOUNDARY_DISCLAIMER,
      items: events.map((event) => ({
        eventReference: event.eventReference,
        title: event.title,
        status: event.status,
        publicSummary: event.publicSummary,
        isOfficialDeclaration: event.isOfficialDeclaration,
        informationalOnly: !event.isOfficialDeclaration,
      })),
    };
  }

  async listAssistance(identityId: string) {
    const applications = await this.prisma.publicSafetyRecoveryAssistanceApplication.findMany({
      where: { engagement: { reporterIdentityId: identityId } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: applications.map((application) => ({
        applicationReference: application.applicationReference,
        programCode: application.programCode,
        status: application.status,
        isRecoveryProgram: true,
        isIncidentReport: false,
      })),
    };
  }

  async listActions(identityId: string) {
    this.boundary.assertCitizenCannotIssuePublicEmergencyAlert('ISSUE_PUBLIC_EMERGENCY_ALERT');

    const requests = await this.prisma.publicSafetyServiceRequest.findMany({
      where: {
        engagement: { reporterIdentityId: identityId },
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return {
      disclaimer: PUBLIC_SAFETY_BOUNDARY_DISCLAIMER,
      availableActions: requests.map((request) => ({
        actionCode: `VIEW_${request.requestKind}`,
        requestReference: request.requestReference,
        serviceTemplateCode: request.serviceTemplateCode,
        blockedEmergencyAlertIssuance: true,
      })),
      forbiddenActions: ['ISSUE_PUBLIC_EMERGENCY_ALERT', 'PUBLISH_GOVERNMENT_NOTICE'],
    };
  }
}
