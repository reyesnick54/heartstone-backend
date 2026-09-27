import { SetMetadata } from '@nestjs/common';

import { type RouteAccessMetadata } from './route-access.decorator';

export const CONTROLLER_ROUTE_ACCESS_KEY = 'controllerRouteAccess';

/** Class-level default route security classification for all handlers in a controller. */
export const ControllerRouteAccess = (metadata: RouteAccessMetadata) =>
  SetMetadata(CONTROLLER_ROUTE_ACCESS_KEY, metadata);
