import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { type ActorContextDto } from '../../identity/auth/dto/actor-context.dto';
import { type InstitutionalScopeEntry } from '../../identity/auth/types/institutional-scope.types';
import {
  AI_ACTOR_IDENTITY_PREFIX,
  AI_ACTOR_ROLE_MARKER,
  FORBIDDEN_CLIENT_ACTOR_IDENTITY_FIELDS,
  FORBIDDEN_CLIENT_AUTHORITY_INDICATORS,
} from '../intelligence.constants';

export interface InstitutionalScopeTarget {
  institutionId?: string | null;
  departmentId?: string | null;
  caseId?: string | null;
}

@Injectable()
export class IntelligenceInstitutionalScopeService {
  rejectForgedActorIdentityFields(payload: Record<string, unknown>, actor: ActorContextDto): void {
    for (const field of FORBIDDEN_CLIENT_ACTOR_IDENTITY_FIELDS) {
      if (!(field in payload) || payload[field] === undefined) {
        continue;
      }

      const supplied = payload[field];
      if (typeof supplied !== 'string') {
        throw new ForbiddenException(`Client may not supply acting identity field "${field}"`);
      }

      if (supplied !== actor.identityId) {
        throw new ForbiddenException(`Forged acting identity field "${field}" rejected`);
      }
    }
  }

  rejectClientAuthorityIndicators(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_AUTHORITY_INDICATORS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not supply authority indicator "${field}"`);
      }
    }
  }

  assertActorHasInstitutionalScope(actor: ActorContextDto): void {
    if (actor.institutionalScopes.length === 0) {
      throw new ForbiddenException(
        'Institutional intelligence operations require an active officeholder appointment scope',
      );
    }
  }

  assertInstitutionAccess(actor: ActorContextDto, institutionId?: string | null): void {
    if (!institutionId) {
      return;
    }

    this.assertActorHasInstitutionalScope(actor);

    const allowed = actor.institutionalScopes.some(
      (scope) => scope.institutionId === institutionId,
    );
    if (!allowed) {
      throw new ForbiddenException('Cross-institution intelligence access denied');
    }
  }

  assertDepartmentAccess(actor: ActorContextDto, departmentId?: string | null): void {
    if (!departmentId) {
      return;
    }

    this.assertActorHasInstitutionalScope(actor);

    const allowed = actor.institutionalScopes.some((scope) => scope.departmentId === departmentId);
    if (!allowed) {
      throw new ForbiddenException('Cross-department intelligence access denied');
    }
  }

  assertInstitutionalTarget(actor: ActorContextDto, target: InstitutionalScopeTarget): void {
    this.assertInstitutionAccess(actor, target.institutionId);
    this.assertDepartmentAccess(actor, target.departmentId);
  }

  assertCrossCaseRetrievalBlocked(
    actor: ActorContextDto,
    requestedCaseId?: string | null,
    allowedCaseId?: string | null,
  ): void {
    if (!requestedCaseId || !allowedCaseId) {
      return;
    }

    if (requestedCaseId !== allowedCaseId) {
      throw new ForbiddenException('Cross-case intelligence retrieval blocked');
    }
  }

  assertAiActorCannotBypassActorContext(actor: ActorContextDto, action: string): void {
    if (!actor.isAiActor) {
      return;
    }

    const blockedActions = [
      'reviewPerformanceClaim',
      'recordConsequentialUseReview',
      'proposeLiveTransition',
      'verifyAlert',
      'disposeAlert',
    ];

    if (blockedActions.includes(action)) {
      throw new ForbiddenException('AI actors cannot bypass actor-context enforcement');
    }
  }

  assertHumanActorForReview(actor: ActorContextDto): void {
    if (actor.isAiActor) {
      throw new ForbiddenException('AI actors cannot satisfy human review requirements');
    }

    if (actor.identityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI actors cannot satisfy human review requirements');
    }
  }

  assertTechnicalAccessNotSubstantiveAuthority(technicalPermissionOnly?: boolean): void {
    if (technicalPermissionOnly) {
      throw new ForbiddenException(
        'Technical access alone cannot authorize substantive institutional intelligence action',
      );
    }
  }

  assertRecordAccessible<T extends InstitutionalScopeTarget>(
    actor: ActorContextDto,
    record: T | null,
    label: string,
  ): T {
    if (!record) {
      throw new NotFoundException(`${label} not found`);
    }

    this.assertInstitutionalTarget(actor, record);
    return record;
  }

  resolvePrimaryScope(actor: ActorContextDto): InstitutionalScopeEntry {
    this.assertActorHasInstitutionalScope(actor);
    const primaryScope = actor.institutionalScopes[0];
    if (!primaryScope) {
      throw new ForbiddenException(
        'Institutional intelligence operations require an active officeholder appointment scope',
      );
    }
    return primaryScope;
  }

  assertActorRoleMarkerNotAi(actorRoleMarker?: string): void {
    if (actorRoleMarker === AI_ACTOR_ROLE_MARKER) {
      throw new ForbiddenException('AI assistance cannot impersonate human actor context');
    }
  }
}
