import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import {
  resolveAdministrativeRoutePermission,
  resolveInstitutionScopeId,
} from '../administrative-route-permissions';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TechnicalPermissionService } from '../technical-permission/technical-permission.service';

interface GuardRequest {
  session?: SessionContextDto;
  params?: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
  originalUrl?: string;
  url?: string;
}

@Injectable()
export class AdministrativeRouteGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly technicalPermissionService: TechnicalPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<GuardRequest>();
    const session = request.session;
    if (!session?.identityId) {
      return true;
    }

    const rawUrl = request.originalUrl ?? request.url ?? '/';
    const resolved = resolveAdministrativeRoutePermission(rawUrl);
    if (!resolved) {
      return true;
    }

    const institutionId = resolved.rule.institutionScoped
      ? resolveInstitutionScopeId({
          params: request.params,
          body: request.body,
          normalizedPath: resolved.normalizedPath,
        })
      : undefined;

    await this.technicalPermissionService.assertPermission({
      session,
      permissionCode: resolved.rule.permissionCode,
      endpoint: `${context.getClass().name}.${context.getHandler().name}`,
      institutionId,
    });

    return true;
  }
}
