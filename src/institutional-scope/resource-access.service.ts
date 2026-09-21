import { Injectable } from '@nestjs/common';
import { Prisma, SecurityAuditEventType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { SecurityAuditService } from '../identity/audit/security-audit.service';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { ActorContextService } from './actor-context.service';
import {
  InstitutionalScopeDeniedException,
  maskDeniedAsNotFound,
  ScopedResourceNotFoundException,
} from './institutional-scope.exceptions';
import { InstitutionalScopeService } from './institutional-scope.service';
import {
  ScopeAccessIntent,
  ScopeDenialReason,
  ScopedResourceType,
  ScopeEvaluationResult,
} from './institutional-scope.types';

export interface AssertResourceAccessInput {
  session: SessionContextDto;
  resourceType: ScopedResourceType;
  resourceId: string;
  intent: ScopeAccessIntent;
  representativeAuthorityId?: string;
  isTechnicalAdministrator?: boolean;
  /** When true, cross-applicant denials return 404 to prevent enumeration. */
  maskEnumeration?: boolean;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ResourceAccessService {
  constructor(
    private readonly actorContext: ActorContextService,
    private readonly scopeService: InstitutionalScopeService,
    private readonly securityAudit: SecurityAuditService,
    private readonly prisma: PrismaService,
  ) {}

  async assertAccess(input: AssertResourceAccessInput): Promise<ScopeEvaluationResult> {
    const actor = await this.actorContext.buildFromSession({
      session: input.session,
      isTechnicalAdministrator: input.isTechnicalAdministrator,
    });

    const result = await this.scopeService.evaluate({
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      intent: input.intent,
      actor,
      representativeAuthorityId: input.representativeAuthorityId,
    });

    if (!result.allowed) {
      await this.recordDeniedAttempt(input, result);
      throw this.buildAccessException(input, result);
    }

    return result;
  }

  async assertVisibility(
    session: SessionContextDto,
    resourceType: ScopedResourceType,
    resourceId: string,
    options?: Pick<
      AssertResourceAccessInput,
      'maskEnumeration' | 'representativeAuthorityId' | 'isTechnicalAdministrator'
    >,
  ): Promise<ScopeEvaluationResult> {
    return this.assertAccess({
      session,
      resourceType,
      resourceId,
      intent: ScopeAccessIntent.VISIBILITY,
      ...options,
    });
  }

  async assertModification(
    session: SessionContextDto,
    resourceType: ScopedResourceType,
    resourceId: string,
    options?: Pick<AssertResourceAccessInput, 'maskEnumeration' | 'representativeAuthorityId'>,
  ): Promise<ScopeEvaluationResult> {
    return this.assertAccess({
      session,
      resourceType,
      resourceId,
      intent: ScopeAccessIntent.MODIFICATION,
      ...options,
    });
  }

  async assertInstitutionalBoundary(
    session: SessionContextDto,
    resourceType: ScopedResourceType,
    resourceId: string,
  ): Promise<ScopeEvaluationResult> {
    return this.assertAccess({
      session,
      resourceType,
      resourceId,
      intent: ScopeAccessIntent.CONSEQUENTIAL_ACTION,
    });
  }

  async evaluateWithoutThrow(input: AssertResourceAccessInput): Promise<ScopeEvaluationResult> {
    const actor = await this.actorContext.buildFromSession({
      session: input.session,
      isTechnicalAdministrator: input.isTechnicalAdministrator,
    });

    return this.scopeService.evaluate({
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      intent: input.intent,
      actor,
      representativeAuthorityId: input.representativeAuthorityId,
    });
  }

  private buildAccessException(
    input: AssertResourceAccessInput,
    result: ScopeEvaluationResult,
  ): Error {
    const reason = result.reason as ScopeDenialReason;

    if (reason === ScopeDenialReason.RESOURCE_NOT_FOUND) {
      return new ScopedResourceNotFoundException(input.resourceType, input.resourceId);
    }

    if (input.maskEnumeration) {
      return maskDeniedAsNotFound(input.resourceType, input.resourceId, reason);
    }

    return new InstitutionalScopeDeniedException(reason);
  }

  private async recordDeniedAttempt(
    input: AssertResourceAccessInput,
    result: ScopeEvaluationResult,
  ): Promise<void> {
    if (result.reason === ScopeDenialReason.RESOURCE_NOT_FOUND) {
      return;
    }

    await this.securityAudit.record({
      eventType: SecurityAuditEventType.SCOPE_ACCESS_DENIED,
      identityId: input.session.identityId,
      userAccountId: input.session.userAccountId ?? undefined,
      sessionId: UUID_PATTERN.test(input.session.sessionId) ? input.session.sessionId : undefined,
      actorIdentityId: input.session.identityId,
      metadata: {
        domain: 'institutional-scope',
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        intent: input.intent,
        denialReason: result.reason,
        accessPathAttempted: result.accessPath,
        ownership: (result.ownership ?? null) as Prisma.InputJsonValue,
        idorAttempt: true,
      },
    });
  }

  async buildActorContextFromSession(
    session: SessionContextDto,
    isTechnicalAdministrator?: boolean,
  ) {
    return this.actorContext.buildFromSession({ session, isTechnicalAdministrator });
  }

  async resolveOwnership(resourceType: ScopedResourceType, resourceId: string) {
    return this.scopeService.resolveOwnership(resourceType, resourceId);
  }
}
