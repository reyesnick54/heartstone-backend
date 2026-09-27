#!/usr/bin/env ts-node
/**
 * Scans NestJS controller files and emits security/protected-route-manifest.json.
 *
 * Run: npm run security:manifest
 *      ./node_modules/.bin/ts-node scripts/generate-protected-route-manifest.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { RouteClass } from '../src/security/route-class.enum';
import {
  scanControllerRoutes,
  type ScannedRoute,
} from '../src/security/route-security-metadata';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'security', 'protected-route-manifest.json');

interface ManifestSummary {
  public: number;
  authenticatedSelfService: number;
  authenticatedInstitutional: number;
  restrictedAdministrative: number;
  consequentialAuthorityControlled: number;
  systemHealth: number;
}

interface Manifest {
  generatedAt: string;
  routeCount: number;
  summary: ManifestSummary;
  routes: ScannedRoute[];
}

function buildSummary(routes: ScannedRoute[]): ManifestSummary {
  const summary: ManifestSummary = {
    public: 0,
    authenticatedSelfService: 0,
    authenticatedInstitutional: 0,
    restrictedAdministrative: 0,
    consequentialAuthorityControlled: 0,
    systemHealth: 0,
  };

  for (const route of routes) {
    switch (route.routeClass) {
      case RouteClass.PUBLIC:
        summary.public += 1;
        break;
      case RouteClass.AUTHENTICATED_SELF_SERVICE:
        summary.authenticatedSelfService += 1;
        break;
      case RouteClass.AUTHENTICATED_INSTITUTIONAL:
        summary.authenticatedInstitutional += 1;
        break;
      case RouteClass.RESTRICTED_ADMINISTRATIVE:
        summary.restrictedAdministrative += 1;
        break;
      case RouteClass.CONSEQUENTIAL_AUTHORITY_CONTROLLED:
        summary.consequentialAuthorityControlled += 1;
        break;
      case RouteClass.SYSTEM_HEALTH:
        summary.systemHealth += 1;
        break;
      default:
        break;
    }
  }

  return summary;
}

function main(): void {
  const routes = scanControllerRoutes(PROJECT_ROOT);

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    routeCount: routes.length,
    summary: buildSummary(routes),
    routes,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(
    `Generated ${manifest.routeCount} routes -> ${path.relative(PROJECT_ROOT, OUTPUT_PATH)}`,
  );
  console.log(JSON.stringify(manifest.summary, null, 2));
}

main();
