import { SetMetadata } from '@nestjs/common';

import { type RouteClass } from '../route-class.enum';

export const ROUTE_ACCESS_KEY = 'routeAccess';

export interface RouteAccessMetadata {
  routeClass: RouteClass;
  authenticationRequired: boolean;
  scopeRequirement: string;
  authorityRequirement: string;
  actorSource: string;
  primarySecurityInvariant: string;
}

export const RouteAccess = (metadata: RouteAccessMetadata) =>
  SetMetadata(ROUTE_ACCESS_KEY, metadata);
