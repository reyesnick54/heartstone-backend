import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DashboardAccessPurpose,
  DashboardQueryAuditResult,
  DashboardSensitivityLevel,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DashboardBoundaryService } from './dashboard-boundary.service';

export interface EvaluateDashboardAccessInput {
  identityId: string;
  dashboardDefinitionId: string;
  institutionId?: string;
  departmentId?: string;
  purpose: DashboardAccessPurpose;
  sensitivityScope: DashboardSensitivityLevel;
  technicalPermissionOnly?: boolean;
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
    const definition = await this.prisma.dashboardDefinition.findUnique({
      where: { id: input.dashboardDefinitionId },
      include: { accessPolicies: true },
    });

    if (!definition) {
      throw new NotFoundException(
        `Dashboard definition "${input.dashboardDefinitionId}" was not found`,
      );
    }

    let accessResult: DashboardQueryAuditResult =
      DashboardQueryAuditResult.DENIED_INSUFFICIENT_PURPOSE;
    let granted = false;

    if (input.technicalPermissionOnly) {
      accessResult = DashboardQueryAuditResult.DENIED_TECHNICAL_ONLY;
      this.boundaryService.assertTechnicalAdminNotSubstantiveUser(
        input.technicalPermissionOnly,
        false,
      );
    } else {
      const matchingPolicy = definition.accessPolicies.find((policy) => {
        if (policy.identityId && policy.identityId !== input.identityId) return false;
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
        if (policy.substantiveAccessRequired && input.technicalPermissionOnly) return false;
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
      } else {
        accessResult = DashboardQueryAuditResult.GRANTED;
        granted = true;
      }
    }

    await this.prisma.dashboardQueryAudit.create({
      data: {
        identityId: input.identityId,
        dashboardDefinitionId: input.dashboardDefinitionId,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
        purpose: input.purpose,
        sensitivityScope: input.sensitivityScope,
        technicalPermissionOnly: input.technicalPermissionOnly ?? false,
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
