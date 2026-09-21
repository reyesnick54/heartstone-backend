import { Injectable } from '@nestjs/common';
import { IdentityType, RepresentativeAuthorityStatus } from '@prisma/client';

import {
  InstitutionalOwnership,
  ScopeAccessIntent,
  ScopeAccessPath,
  ScopeDenialReason,
  ScopedResourceType,
  ScopeEvaluationRequest,
  ScopeEvaluationResult,
} from './institutional-scope.types';
import { OwnershipResolution, ResourceOwnershipResolver } from './resource-ownership.resolver';

@Injectable()
export class InstitutionalScopeService {
  constructor(private readonly ownershipResolver: ResourceOwnershipResolver) {}

  async evaluate(request: ScopeEvaluationRequest): Promise<ScopeEvaluationResult> {
    const resolution = await this.ownershipResolver.resolve(
      request.resourceType,
      request.resourceId,
    );

    if (!resolution.found) {
      return {
        allowed: false,
        reason: resolution.denialReason ?? ScopeDenialReason.RESOURCE_NOT_FOUND,
      };
    }

    if (
      resolution.denialReason &&
      resolution.denialReason !== ScopeDenialReason.RESOURCE_NOT_FOUND
    ) {
      return {
        allowed: false,
        reason: resolution.denialReason,
        ownership: resolution.ownership,
      };
    }

    const ownership = resolution.ownership;
    if (!ownership) {
      return { allowed: false, reason: ScopeDenialReason.UNRESOLVED_OWNERSHIP };
    }

    if (this.hasAmbiguousOwnership(ownership)) {
      return {
        allowed: false,
        reason: ScopeDenialReason.AMBIGUOUS_SCOPE,
        ownership,
      };
    }

    const serviceIdentityDenial = this.checkServiceIdentity(request, ownership);
    if (serviceIdentityDenial) {
      return { allowed: false, reason: serviceIdentityDenial, ownership };
    }

    const technicalAdminDenial = this.checkTechnicalAdministrator(request, ownership);
    if (technicalAdminDenial) {
      return { allowed: false, reason: technicalAdminDenial, ownership };
    }

    const selfAccess = this.evaluateSelfAccess(request, ownership);
    if (selfAccess) {
      return this.finalize(selfAccess, request.intent);
    }

    const applicantAccess = this.evaluateApplicantAccess(request, ownership);
    if (applicantAccess) {
      return this.finalize(applicantAccess, request.intent);
    }

    const representativeAccess = this.evaluateRepresentativeAccess(request, ownership);
    if (representativeAccess) {
      return this.finalize(representativeAccess, request.intent);
    }

    const organizationAccess = this.evaluateOrganizationAccess(request, ownership);
    if (organizationAccess) {
      return this.finalize(organizationAccess, request.intent);
    }

    const officialAccess = this.evaluateOfficialAccess(request, ownership);
    if (officialAccess) {
      return this.finalize(officialAccess, request.intent);
    }

    return {
      allowed: false,
      reason: ScopeDenialReason.RAW_UUID_INSUFFICIENT,
      ownership,
    };
  }

  private finalize(
    result: ScopeEvaluationResult,
    intent: ScopeAccessIntent,
  ): ScopeEvaluationResult {
    if (!result.allowed) {
      return result;
    }

    if (intent === ScopeAccessIntent.CONSEQUENTIAL_ACTION) {
      return {
        ...result,
        requiresAuthorityEvaluation: true,
      };
    }

    if (
      intent === ScopeAccessIntent.MODIFICATION &&
      result.accessPath === ScopeAccessPath.APPLICANT &&
      result.ownership?.isRestricted
    ) {
      // Applicants may modify only their own non-restricted application drafts; callers enforce draft state.
      return result;
    }

    return result;
  }

  private hasAmbiguousOwnership(ownership: InstitutionalOwnership): boolean {
    const institutionIds = new Set(
      [ownership.institutionId].filter((value): value is string => Boolean(value)),
    );

    if (institutionIds.size > 1) {
      return true;
    }

    return false;
  }

  private checkServiceIdentity(
    request: ScopeEvaluationRequest,
    ownership: InstitutionalOwnership,
  ): ScopeDenialReason | undefined {
    if (request.actor.identityType !== IdentityType.SERVICE) {
      return undefined;
    }

    if (ownership.isRestricted || request.resourceType !== ScopedResourceType.IDENTITY) {
      return ScopeDenialReason.SERVICE_IDENTITY_DENIED;
    }

    return undefined;
  }

  private checkTechnicalAdministrator(
    request: ScopeEvaluationRequest,
    ownership: InstitutionalOwnership,
  ): ScopeDenialReason | undefined {
    if (!request.actor.isTechnicalAdministrator) {
      return undefined;
    }

    if (ownership.isRestricted) {
      return ScopeDenialReason.TECHNICAL_ADMIN_SUBSTANTIVE_DENIED;
    }

    return undefined;
  }

  private evaluateSelfAccess(
    request: ScopeEvaluationRequest,
    ownership: InstitutionalOwnership,
  ): ScopeEvaluationResult | undefined {
    if (request.resourceType !== ScopedResourceType.IDENTITY) {
      return undefined;
    }

    if (request.resourceId === request.actor.identityId) {
      return {
        allowed: true,
        reason: 'granted',
        accessPath: ScopeAccessPath.SELF,
        ownership,
      };
    }

    return {
      allowed: false,
      reason: ScopeDenialReason.CROSS_APPLICANT,
      ownership,
    };
  }

  private evaluateApplicantAccess(
    request: ScopeEvaluationRequest,
    ownership: InstitutionalOwnership,
  ): ScopeEvaluationResult | undefined {
    const applicantId = ownership.applicantIdentityId ?? ownership.holderIdentityId;
    if (!applicantId || applicantId !== request.actor.identityId) {
      return undefined;
    }

    if (request.intent === ScopeAccessIntent.MODIFICATION && ownership.isRestricted) {
      return {
        allowed: false,
        reason: ScopeDenialReason.MODIFICATION_NOT_PERMITTED,
        ownership,
        accessPath: ScopeAccessPath.APPLICANT,
      };
    }

    return {
      allowed: true,
      reason: 'granted',
      accessPath: ScopeAccessPath.APPLICANT,
      ownership,
    };
  }

  private evaluateRepresentativeAccess(
    request: ScopeEvaluationRequest,
    ownership: InstitutionalOwnership,
  ): ScopeEvaluationResult | undefined {
    if (!ownership.organizationId) {
      return undefined;
    }

    const authorityId = request.representativeAuthorityId ?? ownership.representativeAuthorityId;
    if (!authorityId) {
      return undefined;
    }

    const authority = request.actor.representativeAuthorities.find(
      (candidate) => candidate.id === authorityId,
    );

    if (!authority) {
      return {
        allowed: false,
        reason: ScopeDenialReason.REPRESENTATION_OUT_OF_SCOPE,
        ownership,
      };
    }

    if (authority.organizationId !== ownership.organizationId) {
      return {
        allowed: false,
        reason: ScopeDenialReason.CROSS_ORGANIZATION,
        ownership,
      };
    }

    if (authority.identityId !== request.actor.identityId) {
      return {
        allowed: false,
        reason: ScopeDenialReason.REPRESENTATION_OUT_OF_SCOPE,
        ownership,
      };
    }

    const now = new Date();
    if (
      authority.status !== RepresentativeAuthorityStatus.ACTIVE ||
      authority.effectiveFrom > now ||
      (authority.effectiveUntil && authority.effectiveUntil <= now)
    ) {
      return {
        allowed: false,
        reason: ScopeDenialReason.INACTIVE_REPRESENTATIVE,
        ownership,
      };
    }

    if (request.intent === ScopeAccessIntent.CONSEQUENTIAL_ACTION) {
      return {
        allowed: false,
        reason: ScopeDenialReason.REPRESENTATION_OUT_OF_SCOPE,
        ownership,
      };
    }

    return {
      allowed: true,
      reason: 'granted',
      accessPath: ScopeAccessPath.REPRESENTATIVE,
      ownership,
    };
  }

  private evaluateOrganizationAccess(
    request: ScopeEvaluationRequest,
    ownership: InstitutionalOwnership,
  ): ScopeEvaluationResult | undefined {
    if (!ownership.organizationId) {
      return undefined;
    }

    if (!request.actor.organizationMembershipIds.includes(ownership.organizationId)) {
      return undefined;
    }

    if (request.intent === ScopeAccessIntent.CONSEQUENTIAL_ACTION) {
      return {
        allowed: false,
        reason: ScopeDenialReason.CROSS_ORGANIZATION,
        ownership,
      };
    }

    return {
      allowed: true,
      reason: 'granted',
      accessPath: ScopeAccessPath.ORGANIZATION_MEMBER,
      ownership,
    };
  }

  private evaluateOfficialAccess(
    request: ScopeEvaluationRequest,
    ownership: InstitutionalOwnership,
  ): ScopeEvaluationResult | undefined {
    if (request.actor.officialContext.length === 0) {
      return undefined;
    }

    if (!ownership.institutionId) {
      if (ownership.isRestricted) {
        return {
          allowed: false,
          reason: ScopeDenialReason.MISSING_INSTITUTIONAL_LINKAGE,
          ownership,
        };
      }

      return undefined;
    }

    const institutionId = ownership.institutionId;
    if (!institutionId) {
      return {
        allowed: false,
        reason: ScopeDenialReason.MISSING_INSTITUTIONAL_LINKAGE,
        ownership,
      };
    }

    const institutionMatch = request.actor.officialContext.some((context) =>
      context.institutionIds.includes(institutionId),
    );

    if (!institutionMatch) {
      return {
        allowed: false,
        reason: ScopeDenialReason.CROSS_INSTITUTION,
        ownership,
      };
    }

    if (ownership.departmentId) {
      const departmentId = ownership.departmentId;
      const departmentMatch = request.actor.officialContext.some((context) =>
        context.departmentIds.includes(departmentId),
      );

      if (!departmentMatch) {
        return {
          allowed: false,
          reason: ScopeDenialReason.CROSS_DEPARTMENT,
          ownership,
        };
      }
    }

    return {
      allowed: true,
      reason: 'granted',
      accessPath: ScopeAccessPath.OFFICIAL,
      ownership,
    };
  }

  async resolveOwnership(
    resourceType: ScopedResourceType,
    resourceId: string,
  ): Promise<OwnershipResolution> {
    return this.ownershipResolver.resolve(resourceType, resourceId);
  }
}
