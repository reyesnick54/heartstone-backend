import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IdentityType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CONTROLLER_ROUTE_ACCESS_KEY,
} from '../decorators/controller-route-access.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROUTE_ACCESS_KEY, type RouteAccessMetadata } from '../decorators/route-access.decorator';
import { isNonHumanMutationAllowed } from '../route-access/non-human-actor-allowlist';
import { RouteClass } from '../route-class.enum';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class RouteAccessEnforcementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const routeAccess = this.reflector.getAllAndOverride<RouteAccessMetadata | undefined>(
      ROUTE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const controllerRouteAccess = this.reflector.getAllAndOverride<
      RouteAccessMetadata | undefined
    >(CONTROLLER_ROUTE_ACCESS_KEY, [context.getHandler(), context.getClass()]);

    const metadata = routeAccess ?? controllerRouteAccess;
    if (!metadata) {
      throw new ForbiddenException(
        'Route access classification metadata is required but missing (safe halt).',
      );
    }

    const request = context.switchToHttp().getRequest<{
      method?: string;
      route?: { path?: string };
      session?: { identityId?: string };
    }>();

    const method = (request.method ?? 'GET').toUpperCase();
    const path = request.route?.path ?? '';
    if (isNonHumanMutationAllowed(method, path)) {
      return true;
    }

    if (
      metadata.routeClass === RouteClass.PUBLIC &&
      MUTATING_METHODS.has(method)
    ) {
      throw new ForbiddenException(
        'Public routes must not perform sensitive mutating government operations.',
      );
    }

    const requiresHumanInstitutionalActor =
      metadata.routeClass === RouteClass.RESTRICTED_ADMINISTRATIVE ||
      metadata.routeClass === RouteClass.CONSEQUENTIAL_AUTHORITY_CONTROLLED;

    if (!requiresHumanInstitutionalActor || !MUTATING_METHODS.has(method)) {
      return true;
    }

    const identityId = request.session?.identityId;
    if (!identityId) {
      return true;
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: { type: true },
    });

    if (identity?.type === IdentityType.INDIVIDUAL) {
      return true;
    }

    throw new ForbiddenException(
      'Non-human identities are not allowlisted for this privileged or consequential route (safe halt).',
    );
  }
}
