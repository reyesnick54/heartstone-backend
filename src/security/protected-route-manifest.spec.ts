import * as fs from 'node:fs';
import * as path from 'node:path';

import { RouteClass } from './route-class.enum';

describe('protected-route-manifest', () => {
  const manifestPath = path.join(process.cwd(), 'security', 'protected-route-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    routeCount: number;
    routes: {
      path: string;
      method: string;
      routeClass: RouteClass;
      authenticationRequired: boolean;
      isPublic: boolean;
      technicalPermissionRequired?: boolean;
      permissionCode?: string | null;
      guardCoverage?: string[];
    }[];
  };

  it('exists and enumerates all controller routes', () => {
    expect(manifest.routeCount).toBe(manifest.routes.length);
    expect(manifest.routeCount).toBeGreaterThan(250);
  });

  it('marks only designated routes as public', () => {
    const publicPaths = manifest.routes
      .filter((route) => route.isPublic)
      .map((route) => route.path);

    expect(publicPaths).toEqual(
      expect.arrayContaining([
        '/',
        '/health',
        '/ready',
        '/version',
        '/identity/auth/login',
        '/public/services',
        '/public/service-families',
        '/public/instruments/verify/:verificationCode',
        '/production-readiness/boundary-disclaimer',
      ]),
    );

    expect(publicPaths).not.toEqual(expect.arrayContaining(['/identity/persons', '/institutions']));
  });

  it('requires authentication on administrative and institutional routes', () => {
    const adminSample = manifest.routes.filter((route) =>
      ['/institutions', '/identity/persons', '/forms/definitions', '/authority/functions'].some(
        (prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`),
      ),
    );

    for (const route of adminSample) {
      expect(route.authenticationRequired).toBe(true);
      expect(route.isPublic).toBe(false);
    }
  });

  it('documents technical permission metadata on deny-by-default administrative routes', () => {
    const lockedRoutes = manifest.routes.filter((route) => route.technicalPermissionRequired);

    expect(lockedRoutes.length).toBeGreaterThan(30);

    for (const route of lockedRoutes) {
      expect(route.guardCoverage).toEqual(
        expect.arrayContaining(['SessionAuthGuard', 'PermissionsGuard']),
      );
      if (route.permissionCode) {
        expect(route.permissionCode).toMatch(/^[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+$/);
      }
    }

    const createPerson = manifest.routes.find(
      (route) => route.path === '/identity/persons' && route.method === 'POST',
    );
    expect(createPerson?.technicalPermissionRequired).toBe(true);
    expect(createPerson?.permissionCode).toBe('identity:person:create');
  });

  it('classifies consequential authority routes', () => {
    const issuance = manifest.routes.find(
      (route) => route.path === '/decisions-issuance/issue' && route.method === 'POST',
    );
    expect(issuance?.routeClass).toBe(RouteClass.CONSEQUENTIAL_AUTHORITY_CONTROLLED);
  });
});
