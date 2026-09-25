import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TechnicalAccessAuditResult } from '@prisma/client';

import { type AuthenticatedRequest } from '../../identity/auth/guards/session-auth.guard';
import { IS_PUBLIC_KEY } from '../../security/decorators/public.decorator';
import { TechnicalAccessAuditService } from '../services/technical-access-audit.service';
import { TechnicalPermissionEvaluationService } from '../services/technical-permission-evaluation.service';
import { resolveRequestPermissionScope } from '../utils/resolve-request-scope.util';
import { DENY_BY_DEFAULT_ADMINISTRATIVE_KEY } from './deny-by-default-administrative.decorator';
import {
  REQUIRE_PERMISSIONS_KEY,
  type RequirePermissionsMetadata,
} from './require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly evaluation: TechnicalPermissionEvaluationService,
    private readonly audit: TechnicalAccessAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const permissionMetadata = this.reflector.getAllAndOverride<
      RequirePermissionsMetadata | undefined
    >(REQUIRE_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    const denyByDefault = this.reflector.getAllAndOverride<boolean>(
      DENY_BY_DEFAULT_ADMINISTRATIVE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissionMetadata && !denyByDefault) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = request.session;
    if (!session?.identityId) {
      throw new UnauthorizedException('Authenticated session required');
    }

    const handler = context.getHandler();
    const controller = context.getClass();
    const endpoint = `${controller.name}.${handler.name}`;

    if (!permissionMetadata) {
      await this.audit.record({
        identityId: session.identityId,
        sessionId: session.sessionId,
        userAccountId: session.userAccountId ?? undefined,
        endpoint,
        accessResult: TechnicalAccessAuditResult.DENIED_ADMINISTRATIVE_DEFAULT,
        metadata: { reason: 'Administrative route without explicit permission metadata' },
      });
      throw new ForbiddenException(
        'Administrative capability denied by default — explicit technical permission required',
      );
    }

    const requestScope = resolveRequestPermissionScope(
      permissionMetadata.scope,
      request.params,
    );

    const result = await this.evaluation.evaluate({
      session,
      requiredPermissions: permissionMetadata.permissions,
      requireAll: permissionMetadata.requireAll,
      requestScope,
    });

    if (!result.allowed) {
      const accessResult = result.reason.includes('scope')
        ? TechnicalAccessAuditResult.DENIED_SCOPE
        : TechnicalAccessAuditResult.DENIED_NO_PERMISSION;

      await this.audit.record({
        identityId: session.identityId,
        sessionId: session.sessionId,
        userAccountId: session.userAccountId ?? undefined,
        permissionCode: permissionMetadata.permissions.join(','),
        endpoint,
        accessResult,
        scopeType: requestScope.scopeType,
        scopeInstitutionId: requestScope.institutionId,
        metadata: { reason: result.reason, grantedPermissions: result.grantedPermissions },
      });

      throw new ForbiddenException(result.reason);
    }

    this.evaluation.assertNotGovernmentAuthority();

    await this.audit.record({
      identityId: session.identityId,
      sessionId: session.sessionId,
      userAccountId: session.userAccountId ?? undefined,
      permissionCode: result.matchedPermission ?? permissionMetadata.permissions[0],
      endpoint,
      accessResult: TechnicalAccessAuditResult.GRANTED,
      scopeType: requestScope.scopeType,
      scopeInstitutionId: requestScope.institutionId,
      metadata: { grantedPermissions: result.grantedPermissions },
    });

    return true;
  }
}
