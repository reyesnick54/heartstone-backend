import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { type ResolvedExecutiveContext } from '../../../experience/executive/types/executive-context.types';
import { PublicSafetyBoundaryService } from '../../common/public-safety-boundary.service';
import {
  PUBLIC_SAFETY_METRICS_DISCLAIMER,
  PUBLIC_SAFETY_RULE_ENVIRONMENT,
} from '../../public-safety.constants';

@Injectable()
export class ExecutivePublicSafetyProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PublicSafetyBoundaryService,
  ) {}

  async buildBriefing(
    _context: ResolvedExecutiveContext,
    options?: { requestedMutation?: boolean },
  ) {
    this.boundary.assertExecutiveDashboardIsReadOnly(options?.requestedMutation ?? false);

    const [
      activeEmergencyEvents,
      serviceInterruptions,
      verifiedImpactSummaries,
      assistanceDemand,
      externalDependenciesBlocked,
      communicationsPending,
      recoveryProgramApplications,
    ] = await Promise.all([
      this.prisma.publicSafetyEmergencyEvent.count({
        where: {
          status: { in: ['ACTIVE_MONITORING', 'RESPONSE_COORDINATION', 'RECOVERY'] },
        },
      }),
      this.prisma.publicSafetyEmergencyEvent.count({
        where: {
          serviceInterruptionNote: { not: null },
        },
      }),
      this.prisma.publicSafetyEmergencyEvent.count({
        where: {
          verifiedImpactSummary: { not: null },
        },
      }),
      this.prisma.publicSafetyServiceRequest.count({
        where: {
          requestKind: { in: ['REQUEST_EMERGENCY_ASSISTANCE', 'RECOVERY_ASSISTANCE_APPLICATION'] },
          status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
        },
      }),
      this.prisma.publicSafetyExternalDependency.count({
        where: {
          status: { in: ['PENDING', 'BLOCKED'] },
        },
      }),
      this.prisma.publicSafetyCommunicationDelivery.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.publicSafetyRecoveryAssistanceApplication.count({
        where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      }),
    ]);

    return {
      disclaimer: PUBLIC_SAFETY_METRICS_DISCLAIMER,
      ruleEnvironment: PUBLIC_SAFETY_RULE_ENVIRONMENT,
      institutionIds: _context.institutionIds,
      aggregates: {
        activeEmergencyEvents,
        governmentServiceInterruptions: serviceInterruptions,
        verifiedImpactSummaries,
        assistanceDemand,
        operationalDependencyBlocked: externalDependenciesBlocked,
        communicationsPending,
        recoveryProgramMetrics: {
          openApplications: recoveryProgramApplications,
        },
      },
      exposesRawSensitiveIncidentData: false,
      informationalOnly: true,
      mutatesIncidentState: false,
    };
  }
}
