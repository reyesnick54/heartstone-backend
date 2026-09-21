import { Injectable } from '@nestjs/common';
import {
  CredentialStatus,
  FormDefinitionStatus,
  GovernmentServiceMaturityStatus,
  IdentityType,
  IntegrationDefinitionStatus,
  IntegrationOutageStatus,
  LegalHoldStatus,
  ProductionReadinessStatus,
  WorkflowDefinitionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import {
  PlatformAdminCountSummaryDto,
  PlatformAdminHomeResponseDto,
} from '../dto/platform-admin-response.dto';
import {
  PLATFORM_ADMIN_AUTHORITY_DISCLAIMER,
  PLATFORM_ADMIN_CONFIGURATION_DISCLAIMER,
} from '../platform-admin.constants';
import { type ResolvedPlatformAdminContext } from '../types/platform-admin-context.types';

@Injectable()
export class PlatformAdminHomeService {
  constructor(private readonly prisma: PrismaService) {}

  async buildHome(context: ResolvedPlatformAdminContext): Promise<PlatformAdminHomeResponseDto> {
    const [
      institutionCount,
      departmentCount,
      serviceStatusGroups,
      unpublishedVersions,
      suspendedServices,
      formsRequiringActivation,
      workflowsRequiringValidation,
      degradedIntegrations,
      suspendedAiAgents,
      securityIssues,
      readinessIssues,
      systemDependencies,
      productionConditions,
    ] = await Promise.all([
      this.prisma.institution.count({ where: this.buildInstitutionScope(context) }),
      this.prisma.department.count({ where: this.buildDepartmentScope(context) }),
      this.prisma.governmentServiceVersion.groupBy({
        by: ['maturityStatus'],
        _count: { _all: true },
      }),
      this.prisma.governmentServiceVersion.count({
        where: {
          maturityStatus: {
            in: [
              GovernmentServiceMaturityStatus.DRAFT,
              GovernmentServiceMaturityStatus.RECOGNIZED,
              GovernmentServiceMaturityStatus.APPROVED,
              GovernmentServiceMaturityStatus.CONFIGURED,
            ],
          },
        },
      }),
      this.prisma.governmentServiceVersion.count({
        where: { maturityStatus: GovernmentServiceMaturityStatus.SUSPENDED },
      }),
      this.prisma.formDefinition.count({
        where: { status: FormDefinitionStatus.DRAFT },
      }),
      this.prisma.workflowDefinition.count({
        where: { status: WorkflowDefinitionStatus.DRAFT },
      }),
      this.prisma.integrationOutage.count({
        where: {
          status: {
            in: [IntegrationOutageStatus.DETECTED, IntegrationOutageStatus.CONFIRMED],
          },
        },
      }),
      this.countSuspendedAiAgents(),
      this.countSecurityIssues(),
      this.countReadinessIssues(),
      this.prisma.integrationDefinition.count({
        where: {
          status: {
            in: [
              IntegrationDefinitionStatus.DRAFT,
              IntegrationDefinitionStatus.PENDING_ACCEPTANCE,
              IntegrationDefinitionStatus.SUSPENDED,
            ],
          },
        },
      }),
      this.prisma.productionReadinessRequirement.count({
        where: {
          status: {
            in: [
              ProductionReadinessStatus.NOT_ASSESSED,
              ProductionReadinessStatus.NOT_READY,
              ProductionReadinessStatus.SAFE_HALTED,
            ],
          },
        },
      }),
    ]);

    const summaryCounts: PlatformAdminCountSummaryDto[] = [
      { label: 'Institutions configured', count: institutionCount },
      { label: 'Departments configured', count: departmentCount },
      ...serviceStatusGroups.map((group) => ({
        label: `Government services (${group.maturityStatus})`,
        count: group._count._all,
        status: group.maturityStatus,
      })),
      { label: 'Unpublished service versions', count: unpublishedVersions },
      { label: 'Suspended services', count: suspendedServices },
      { label: 'Forms requiring activation', count: formsRequiringActivation },
      { label: 'Workflows requiring validation', count: workflowsRequiringValidation },
    ];

    const operationalAlerts: PlatformAdminCountSummaryDto[] = [
      { label: 'Integrations degraded/offline', count: degradedIntegrations },
      { label: 'AI agents suspended', count: suspendedAiAgents },
      { label: 'Security/readiness issues', count: securityIssues + readinessIssues },
    ];

    return {
      identityId: context.identityId,
      displayName: context.displayName,
      hasSubstantiveGovernmentAuthority: false,
      authorityDisclaimer: PLATFORM_ADMIN_AUTHORITY_DISCLAIMER,
      configurationDisclaimer: PLATFORM_ADMIN_CONFIGURATION_DISCLAIMER,
      summaryCounts,
      operationalAlerts,
      systemDependencies: [
        { label: 'Integration dependencies requiring attention', count: systemDependencies },
      ],
      productionReadinessConditions: [
        { label: 'Production readiness blockers', count: productionConditions },
      ],
    };
  }

  private buildInstitutionScope(context: ResolvedPlatformAdminContext) {
    return context.policy.institutionIds.length > 0
      ? { id: { in: context.policy.institutionIds } }
      : {};
  }

  private buildDepartmentScope(context: ResolvedPlatformAdminContext) {
    if (context.policy.departmentIds.length > 0) {
      return { id: { in: context.policy.departmentIds } };
    }

    if (context.policy.institutionIds.length > 0) {
      return { institutionId: { in: context.policy.institutionIds } };
    }

    return {};
  }

  private async countSuspendedAiAgents(): Promise<number> {
    const serviceIdentities = await this.prisma.identity.findMany({
      where: { type: IdentityType.SERVICE },
      include: { credentials: true, authenticationMethods: true },
    });

    return serviceIdentities.filter((identity) => {
      const methodsDisabled =
        identity.authenticationMethods.length > 0 &&
        identity.authenticationMethods.every((method) => !method.isEnabled);
      const credentialsRevoked =
        identity.credentials.length > 0 &&
        identity.credentials.every((credential) => credential.status === CredentialStatus.REVOKED);
      return methodsDisabled || credentialsRevoked;
    }).length;
  }

  private async countSecurityIssues(): Promise<number> {
    const [activeLegalHolds, suspendedAccounts] = await Promise.all([
      this.prisma.legalHold.count({
        where: { status: LegalHoldStatus.ACTIVE },
      }),
      this.prisma.userAccount.count({ where: { status: 'SUSPENDED' } }),
    ]);

    return activeLegalHolds + suspendedAccounts;
  }

  private async countReadinessIssues(): Promise<number> {
    return this.prisma.productionReadinessAssessment.count({
      where: {
        overallStatus: {
          in: [
            ProductionReadinessStatus.NOT_ASSESSED,
            ProductionReadinessStatus.NOT_READY,
            ProductionReadinessStatus.SAFE_HALTED,
          ],
        },
      },
    });
  }
}
