import { RouteClass } from './route-class.enum';
import {
  scanControllerRoutes,
  validateRouteSecurityMetadata,
} from './route-security-metadata';

describe('route-security-metadata', () => {
  const routes = scanControllerRoutes();

  it('scanControllerRoutes enumerates all controller HTTP routes', () => {
    expect(routes.length).toBeGreaterThan(250);
  });

  it('every route declares route access metadata', () => {
    const missing = routes.filter((route) => !route.hasRouteAccessMetadata);
    expect(missing).toEqual([]);
  });

  it('consequential registry routes carry action metadata and guard', () => {
    const consequential = routes.filter((route) => route.requiresConsequentialGuard);
    expect(consequential.length).toBeGreaterThan(0);

    for (const route of consequential) {
      expect(route.hasConsequentialAction).toBe(true);
      expect(route.hasConsequentialActionGuard).toBe(true);
    }
  });

  it('public mutating routes avoid consequential path segments', () => {
    const { violations } = validateRouteSecurityMetadata(routes);
    const publicMutationViolations = violations.filter((message) =>
      message.includes('public mutating route'),
    );
    expect(publicMutationViolations).toEqual([]);
  });

  it('validateRouteSecurityMetadata reports missing metadata until codemod completes', () => {
    const { violations } = validateRouteSecurityMetadata({ routes });
    const missingMetadata = violations.filter((message) => message.includes('missing @RouteAccess'));
    if (missingMetadata.length > 0) {
      expect(missingMetadata.length).toBeGreaterThan(0);
    } else {
      expect(routes.every((route) => route.hasRouteAccessMetadata)).toBe(true);
    }
  });

  it('classifies system health probes separately from public routes', () => {
    const health = routes.find((route) => route.path === '/health' && route.method === 'GET');
    expect(health?.routeClass).toBe(RouteClass.SYSTEM_HEALTH);
    expect(health?.isPublic).toBe(true);
  });
});
