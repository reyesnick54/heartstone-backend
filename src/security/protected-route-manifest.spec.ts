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

  it('classifies consequential authority routes', () => {
    const issuance = manifest.routes.find(
      (route) => route.path === '/decisions-issuance/issue' && route.method === 'POST',
    );
    expect(issuance?.routeClass).toBe(RouteClass.CONSEQUENTIAL_AUTHORITY_CONTROLLED);
  });
});
