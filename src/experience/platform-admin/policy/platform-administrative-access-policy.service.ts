import { Injectable } from '@nestjs/common';
import {
  AccountStatus,
  PlatformAdministrativeAccessAuditResult,
  PlatformAdministrativeAccessScope,
  type Prisma,
  SecurityAuditEventType,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { SecurityAuditService } from '../../../identity/audit/security-audit.service';
import { type SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { PlatformAdminAccessDeniedException } from '../exceptions/platform-admin-access-denied.exception';
import {
  PLATFORM_ADMIN_AUTHORITY_DISCLAIMER,
  PLATFORM_ADMIN_CONFIGURATION_DISCLAIMER,
  PLATFORM_ADMINISTRATIVE_PERMISSION_CODE,
} from '../platform-admin.constants';
import {
  type PlatformAdminPolicyCapabilities,
  type ResolvedPlatformAdminContext,
} from '../types/platform-admin-context.types';
import { PlatformAdminBoundaryService } from './platform-admin-boundary.service';

export interface CreatePlatformAdministrativeAccessPolicyInput {
  identityId?: string;
  institutionId?: string;
  departmentId?: string;
  permissionCode?: string;
  scope?: PlatformAdministrativeAccessScope;
  canConfigureServices?: boolean;
  canConfigureForms?: boolean;
  canConfigureWorkflows?: boolean;
  canConfigureIntegrations?: boolean;
  canConfigureCommunications?: boolean;
  canViewSecurity?: boolean;
  canViewReadiness?: boolean;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
}

export interface EvaluatePlatformAdminAccessInput {
  session: SessionContextDto;
  endpoint: string;
  resourceType?: string;
  resourceId?: string;
}

@Injectable()
export class PlatformAdministrativeAccessPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PlatformAdminBoundaryService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  async createPolicy(input: CreatePlatformAdministrativeAccessPolicyInput) {
    return this.prisma.platformAdministrativeAccessPolicy.create({
      data: {
        identityId: input.identityId,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
        permissionCode: input.permissionCode ?? PLATFORM_ADMINISTRATIVE_PERMISSION_CODE,
        scope: input.scope ?? PlatformAdministrativeAccessScope.PLATFORM_WIDE,
        canConfigureServices: input.canConfigureServices ?? true,
        canConfigureForms: input.canConfigureForms ?? true,
        canConfigureWorkflows: input.canConfigureWorkflows ?? true,
        canConfigureIntegrations: input.canConfigureIntegrations ?? true,
        canConfigureCommunications: input.canConfigureCommunications ?? true,
        canViewSecurity: input.canViewSecurity ?? true,
        canViewReadiness: input.canViewReadiness ?? true,
        substantiveAccessDenied: true,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
      },
    });
  }

  async evaluateAccess(
    input: EvaluatePlatformAdminAccessInput,
  ): Promise<ResolvedPlatformAdminContext> {
    this.boundary.assertAdministrativeAccessDoesNotGrantAuthority();
    this.boundary.assertVisibilityNotSubstantiveAccess();

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.session.identityId },
      include: { userAccount: true },
    });

    if (!identity) {
      await this.recordDenied(input, PlatformAdministrativeAccessAuditResult.DENIED_NO_POLICY);
      throw new PlatformAdminAccessDeniedException('Identity not found');
    }

    if (identity.userAccount?.status === AccountStatus.SUSPENDED) {
      await this.recordDenied(input, PlatformAdministrativeAccessAuditResult.DENIED_SUSPENDED);
      throw new PlatformAdminAccessDeniedException(
        'Suspended account cannot access platform administration',
      );
    }

    const now = new Date();
    const policies = await this.prisma.platformAdministrativeAccessPolicy.findMany({
      where: {
        OR: [{ identityId: identity.id }, { identityId: null }],
        AND: [
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
          { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }] },
        ],
      },
    });

    const matchingPolicy = policies.find(
      (policy) =>
        policy.permissionCode === PLATFORM_ADMINISTRATIVE_PERMISSION_CODE &&
        (!policy.identityId || policy.identityId === identity.id),
    );

    if (!matchingPolicy) {
      await this.recordDenied(input, PlatformAdministrativeAccessAuditResult.DENIED_NO_POLICY);
      throw new PlatformAdminAccessDeniedException(
        'No platform administrative access policy exists for this identity',
      );
    }

    if (!matchingPolicy.substantiveAccessDenied) {
      await this.recordDenied(
        input,
        PlatformAdministrativeAccessAuditResult.DENIED_SUBSTANTIVE_ONLY,
      );
      throw new PlatformAdminAccessDeniedException(
        'Platform administrative policies must deny substantive government access',
      );
    }

    const capabilities = this.toCapabilities(matchingPolicy);

    await this.recordGranted(input, capabilities);

    return {
      identityId: identity.id,
      displayName: identity.displayName,
      assuranceLevel: input.session.assuranceLevel,
      userAccountId: identity.userAccountId,
      policy: capabilities,
      hasSubstantiveGovernmentAuthority: false,
      authorityDisclaimer: PLATFORM_ADMIN_AUTHORITY_DISCLAIMER,
      configurationDisclaimer: PLATFORM_ADMIN_CONFIGURATION_DISCLAIMER,
    };
  }

  private toCapabilities(
    policy: Prisma.PlatformAdministrativeAccessPolicyGetPayload<object>,
  ): PlatformAdminPolicyCapabilities {
    const institutionIds = policy.institutionId ? [policy.institutionId] : [];
    const departmentIds = policy.departmentId ? [policy.departmentId] : [];

    return {
      permissionCode: policy.permissionCode,
      scope: policy.scope,
      canConfigureServices: policy.canConfigureServices,
      canConfigureForms: policy.canConfigureForms,
      canConfigureWorkflows: policy.canConfigureWorkflows,
      canConfigureIntegrations: policy.canConfigureIntegrations,
      canConfigureCommunications: policy.canConfigureCommunications,
      canViewSecurity: policy.canViewSecurity,
      canViewReadiness: policy.canViewReadiness,
      substantiveAccessDenied: policy.substantiveAccessDenied,
      institutionIds,
      departmentIds,
    };
  }

  private async recordGranted(
    input: EvaluatePlatformAdminAccessInput,
    capabilities: PlatformAdminPolicyCapabilities,
  ): Promise<void> {
    await this.prisma.platformAdministrativeAccessAudit.create({
      data: {
        identityId: input.session.identityId,
        sessionId: input.session.sessionId,
        endpoint: input.endpoint,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        accessResult: PlatformAdministrativeAccessAuditResult.GRANTED,
        metadata: {
          permissionCode: capabilities.permissionCode,
          scope: capabilities.scope,
        },
      },
    });

    await this.securityAudit.record({
      eventType: SecurityAuditEventType.PLATFORM_ADMIN_ACCESS_GRANTED,
      identityId: input.session.identityId,
      userAccountId: input.session.userAccountId ?? undefined,
      sessionId: input.session.sessionId,
      metadata: { endpoint: input.endpoint },
    });
  }

  private async recordDenied(
    input: EvaluatePlatformAdminAccessInput,
    result: PlatformAdministrativeAccessAuditResult,
  ): Promise<void> {
    await this.prisma.platformAdministrativeAccessAudit.create({
      data: {
        identityId: input.session.identityId,
        sessionId: input.session.sessionId,
        endpoint: input.endpoint,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        accessResult: result,
      },
    });

    await this.securityAudit.record({
      eventType: SecurityAuditEventType.PLATFORM_ADMIN_ACCESS_DENIED,
      identityId: input.session.identityId,
      userAccountId: input.session.userAccountId ?? undefined,
      sessionId: input.session.sessionId,
      metadata: { endpoint: input.endpoint, result },
    });
  }
}
