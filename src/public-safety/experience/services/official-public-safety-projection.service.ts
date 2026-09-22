import { Injectable } from '@nestjs/common';
import {
  PublicSafetyExternalDependencyStatus,
  PublicSafetyInspectionRequestStatus,
  PublicSafetyServiceRequestStatus,
  PublicSafetyVerificationStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import {
  PUBLIC_SAFETY_BOUNDARY_DISCLAIMER,
  PUBLIC_SAFETY_RULE_ENVIRONMENT,
} from '../../public-safety.constants';

@Injectable()
export class OfficialPublicSafetyProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async buildWorkspace(context: ResolvedOfficialContext) {
    if (!context.technicalCapabilities.substantiveAccessAllowed) {
      return this.emptyWorkspace();
    }

    const jurisdictionFilter = context.institutionalContext.jurisdictionIds.length
      ? {
          jurisdictionId: { in: context.institutionalContext.jurisdictionIds },
        }
      : {};

    const engagementScope = { engagement: jurisdictionFilter };

    const [
      incomingReports,
      pendingVerification,
      verifiedIncidents,
      referrals,
      emergencyAssistance,
      inspections,
      recoveryAssistance,
      governmentCommunications,
      externalAuthorityCoordination,
      slaPriorityEscalation,
    ] = await Promise.all([
      this.prisma.publicSafetyServiceRequest.count({
        where: {
          ...engagementScope,
          requestKind: 'SUBMIT_INCIDENT_REPORT',
          status: PublicSafetyServiceRequestStatus.SUBMITTED,
        },
      }),
      this.prisma.publicSafetyIncidentReport.count({
        where: {
          ...engagementScope,
          verificationStatus: PublicSafetyVerificationStatus.PENDING_VERIFICATION,
        },
      }),
      this.prisma.publicSafetyIncidentReport.count({
        where: {
          ...engagementScope,
          verificationStatus: PublicSafetyVerificationStatus.VERIFIED,
        },
      }),
      this.prisma.publicSafetyExternalDependency.count({
        where: {
          ...engagementScope,
          status: PublicSafetyExternalDependencyStatus.REFERRED,
        },
      }),
      this.prisma.publicSafetyServiceRequest.count({
        where: {
          ...engagementScope,
          requestKind: 'REQUEST_EMERGENCY_ASSISTANCE',
          status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
        },
      }),
      this.prisma.publicSafetyInspectionRequest.count({
        where: {
          ...engagementScope,
          status: {
            in: [
              PublicSafetyInspectionRequestStatus.REQUESTED,
              PublicSafetyInspectionRequestStatus.SCHEDULED,
            ],
          },
        },
      }),
      this.prisma.publicSafetyRecoveryAssistanceApplication.count({
        where: {
          ...engagementScope,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
        },
      }),
      this.prisma.publicSafetyCommunicationDelivery.count({
        where: { ...engagementScope, status: 'PENDING' },
      }),
      this.prisma.publicSafetyExternalDependency.count({
        where: {
          ...engagementScope,
          status: { in: ['PENDING', 'BLOCKED'] },
        },
      }),
      this.prisma.publicSafetyServiceRequest.count({
        where: {
          ...engagementScope,
          status: PublicSafetyServiceRequestStatus.UNDER_REVIEW,
          submittedAt: { lte: new Date(Date.now() - 48 * 3600000) },
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      disclaimer: PUBLIC_SAFETY_BOUNDARY_DISCLAIMER,
      ruleEnvironment: PUBLIC_SAFETY_RULE_ENVIRONMENT,
      queues: {
        incomingReports,
        verification: pendingVerification,
        verifiedIncidents,
        referrals,
        emergencyAssistance,
        inspections,
        recoveryAssistance,
        governmentCommunications,
        externalAuthorityCoordination,
        slaPriorityEscalation,
      },
      informationalOnly: true,
    };
  }

  private emptyWorkspace() {
    return {
      generatedAt: new Date().toISOString(),
      disclaimer: PUBLIC_SAFETY_BOUNDARY_DISCLAIMER,
      ruleEnvironment: PUBLIC_SAFETY_RULE_ENVIRONMENT,
      queues: {
        incomingReports: 0,
        verification: 0,
        verifiedIncidents: 0,
        referrals: 0,
        emergencyAssistance: 0,
        inspections: 0,
        recoveryAssistance: 0,
        governmentCommunications: 0,
        externalAuthorityCoordination: 0,
        slaPriorityEscalation: 0,
      },
      informationalOnly: true,
    };
  }
}
