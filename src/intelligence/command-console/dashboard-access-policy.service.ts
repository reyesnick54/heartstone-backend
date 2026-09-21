import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AccountStatus,
  DashboardAccessPurpose,
  DashboardQueryAuditResult,
  DashboardSensitivityLevel,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type AuthenticatedPrincipal } from '../../identity/auth/domain/authenticated-principal';
import {
  ScopeAccessIntent,
  ScopedResourceType,
} from '../../institutional-scope/institutional-scope.types';
import { ResourceAccessService } from '../../institutional-scope/resource-access.service';
import { DashboardBoundaryService } from './dashboard-boundary.service';

export interface EvaluateDashboardAccessInput {
  actor: AuthenticatedPrincipal;
  dashboardDefinitionId: string;
  institutionId?: string;
  departmentId?: string;
  purpose: DashboardAccessPurpose;
  sensitivityScope: DashboardSensitivityLevel;
  securityClearanceLevel?: string;
  caseAssignmentId?: string;
  queryFilters?: Record<string, unknown>;
}

export interface CreateAccessPolicyInput {
  dashboardDefinitionId: string;
  identityId?: string;
  institutionId?: string;
  departmentId?: string;
  caseAssignmentRequired?: boolean;
  purpose: DashboardAccessPurpose;
  sensitivityLevel: DashboardSensitivityLevel;
  securityClearanceLevel?: string;
  technicalPermissionCode?: string;
  requiresInstitutionalBoundary?: boolean;
  substantiveAccessRequired?: boolean;
}

@Injectable()
export class DashboardAccessPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundaryService: DashboardBoundaryService,
    private readonly resourceAccess: ResourceAccessService,
  ) {}

  async createPolicy(input: CreateAccessPolicyInput) {
    return this.prisma.dashboardAccessPolicy.create({
      data: {
        dashboardDefinitionId: input.dashboardDefinitionId,
        identityId: input.identityId,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
        caseAssignmentRequired: input.caseAssignmentRequired ?? false,
        purpose: input.purpose,
        sensitivityLevel: input.sensitivityLevel,
        securityClearanceLevel: input.securityClearanceLevel,
        technicalPermissionCode: input.technicalPermissionCode,
        requiresInstitutionalBoundary: input.requiresInstitutionalBoundary ?? true,
        substantiveAccessRequired: input.substantiveAccessRequired ?? true,
      },
    });
  }

  async evaluateAccess(input: EvaluateDashboardAccessInput) {
    this.boundaryService.assertDashboardAccessDoesNotGrantAuthority();

    await this.resourceAccess.assertAccess({
      session: {
        sessionId: input.actor.sessionId,
        identityId: input.actor.identityId,
        userAccountId: input.actor.userAccountId,
        assuranceLevel: input.actor.assuranceLevel,
      },
      resourceType: ScopedResourceType.DASHBOARD,
      resourceId: input.dashboardDefinitionId,
      intent: ScopeAccessIntent.VISIBILITY,
    });

    const definition = await this.prisma.dashboardDefinition.findUnique({
      where: { id: input.dashboardDefinitionId },
      include: { accessPolicies: true },
    });

    if (!definition) {
      throw new NotFoundException(
        `Dashboard definition "${input.dashboardDefinitionId}" was not found`,
      );
    }

    const identityId = input.actor.identityId;
    let accessResult: DashboardQueryAuditResult =
      DashboardQueryAuditResult.DENIED_INSUFFICIENT_PURPOSE;
    let granted = false;

    const accountStatusFailure = await this.assertActorAccountActive(input.actor);
    if (accountStatusFailure) {
      accessResult = accountStatusFailure;
    } else {
      const scopeFailure = this.assertActorEntitledToRequestedScope(
        definition.accessPolicies,
        identityId,
        input.institutionId,
        input.departmentId,
      );
      if (scopeFailure) {
        accessResult = scopeFailure;
      } else {
        const actorPolicies = definition.accessPolicies.filter(
          (policy) => !policy.identityId || policy.identityId === identityId,
        );

        const substantivePolicies = actorPolicies.filter(
          (policy) => policy.substantiveAccessRequired && !policy.technicalPermissionCode,
        );
        const technicalOnlyPolicies = actorPolicies.filter(
          (policy) => policy.technicalPermissionCode && !policy.substantiveAccessRequired,
        );

        const candidatePolicies =
          substantivePolicies.length > 0 ? substantivePolicies : actorPolicies;

        if (
          substantivePolicies.length === 0 &&
          technicalOnlyPolicies.length > 0 &&
          technicalOnlyPolicies.some((policy) => policy.purpose === input.purpose)
        ) {
          accessResult = DashboardQueryAuditResult.DENIED_TECHNICAL_ONLY;
          this.boundaryService.assertTechnicalAdminNotSubstantiveUser(true, false);
        } else {
          const matchingPolicy = candidatePolicies.find((policy) => {
            if (policy.identityId && policy.identityId !== identityId) return false;
            if (policy.institutionId && policy.institutionId !== input.institutionId) return false;
            if (policy.departmentId && policy.departmentId !== input.departmentId) return false;
            if (policy.purpose !== input.purpose) return false;
            if (
              this.sensitivityRank(policy.sensitivityLevel) <
              this.sensitivityRank(input.sensitivityScope)
            ) {
              return false;
            }
            if (
              policy.securityClearanceLevel &&
              policy.securityClearanceLevel !== input.securityClearanceLevel
            ) {
              return false;
            }
            if (policy.substantiveAccessRequired && policy.technicalPermissionCode) return false;
            return true;
          });

          if (!matchingPolicy) {
            accessResult = DashboardQueryAuditResult.DENIED_INSUFFICIENT_PURPOSE;
          } else if (
            matchingPolicy.departmentId &&
            input.departmentId &&
            matchingPolicy.departmentId !== input.departmentId &&
            input.purpose !== DashboardAccessPurpose.AUDIT_REVIEW
          ) {
            accessResult = DashboardQueryAuditResult.DENIED_DEPARTMENT_SCOPE;
          } else if (matchingPolicy.caseAssignmentRequired && !input.caseAssignmentId) {
            accessResult = DashboardQueryAuditResult.DENIED_INSTITUTIONAL_BOUNDARY;
          } else if (
            matchingPolicy.requiresInstitutionalBoundary &&
            input.sensitivityScope === DashboardSensitivityLevel.HIGHLY_RESTRICTED &&
            !input.caseAssignmentId
          ) {
            accessResult = DashboardQueryAuditResult.DENIED_SENSITIVITY;
          } else if (
            matchingPolicy.technicalPermissionCode &&
            matchingPolicy.substantiveAccessRequired
          ) {
            accessResult = DashboardQueryAuditResult.DENIED_TECHNICAL_ONLY;
          } else {
            accessResult = DashboardQueryAuditResult.GRANTED;
            granted = true;
          }
        }
      }
    }

    await this.prisma.dashboardQueryAudit.create({
      data: {
        identityId,
        dashboardDefinitionId: input.dashboardDefinitionId,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
        purpose: input.purpose,
        sensitivityScope: input.sensitivityScope,
        technicalPermissionOnly: accessResult === DashboardQueryAuditResult.DENIED_TECHNICAL_ONLY,
        queryFilters: (input.queryFilters ?? {}) as Prisma.InputJsonValue,
        accessResult,
        resultSummary: granted
          ? 'Access granted under matching policy'
          : `Access denied: ${accessResult}`,
      },
    });

    if (!granted) {
      throw new ForbiddenException(`Dashboard access denied: ${accessResult}`);
    }

    return { granted: true, accessResult };
  }

  private async assertActorAccountActive(
    actor: AuthenticatedPrincipal,
  ): Promise<DashboardQueryAuditResult | null> {
    if (!actor.userAccountId) {
      return null;
    }

    const account = await this.prisma.userAccount.findUnique({
      where: { id: actor.userAccountId },
      select: { status: true },
    });

    if (!account) {
      return DashboardQueryAuditResult.DENIED_INSUFFICIENT_PURPOSE;
    }

    if (account.status === AccountStatus.SUSPENDED || account.status === AccountStatus.REVOKED) {
      return DashboardQueryAuditResult.DENIED_INSUFFICIENT_PURPOSE;
    }

    return null;
  }

  private assertActorEntitledToRequestedScope(
    policies: {
      identityId: string | null;
      institutionId: string | null;
      departmentId: string | null;
    }[],
    identityId: string,
    institutionId?: string,
    departmentId?: string,
  ): DashboardQueryAuditResult | null {
    const actorPolicies = policies.filter(
      (policy) => !policy.identityId || policy.identityId === identityId,
    );

    if (actorPolicies.length === 0) {
      return DashboardQueryAuditResult.DENIED_INSUFFICIENT_PURPOSE;
    }

    if (institutionId) {
      const institutionEntitled = actorPolicies.some(
        (policy) => !policy.institutionId || policy.institutionId === institutionId,
      );
      if (!institutionEntitled) {
        return DashboardQueryAuditResult.DENIED_INSTITUTIONAL_BOUNDARY;
      }
    }

    if (departmentId) {
      const departmentEntitled = actorPolicies.some(
        (policy) => !policy.departmentId || policy.departmentId === departmentId,
      );
      if (!departmentEntitled) {
        return DashboardQueryAuditResult.DENIED_DEPARTMENT_SCOPE;
      }
    }

    return null;
  }

  private sensitivityRank(level: DashboardSensitivityLevel): number {
    const ranks: Record<DashboardSensitivityLevel, number> = {
      PUBLIC_SUMMARY: 0,
      OFFICIAL: 1,
      RESTRICTED: 2,
      HIGHLY_RESTRICTED: 3,
    };
    return ranks[level];
  }
}
