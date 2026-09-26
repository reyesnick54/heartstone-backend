#!/usr/bin/env ts-node
/**
 * Scans NestJS controller files and emits security/protected-route-manifest.json.
 *
 * Run: npm run security:manifest
 *      ./node_modules/.bin/ts-node scripts/generate-protected-route-manifest.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { PermissionCodes } from '../src/technical-access/constants/permission-codes.constants';
import { RouteClass } from '../src/security/route-class.enum';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONTROLLER_GLOB_ROOT = path.join(PROJECT_ROOT, 'src');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'security', 'protected-route-manifest.json');

const HTTP_METHODS = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Head', 'Options'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

interface DomainSecurityProfile {
  routeClass: RouteClass;
  authenticationRequired: boolean;
  scopeRequirement: string;
  authorityRequirement: string;
  actorSource: string;
  primarySecurityInvariant: string;
}

interface RouteAccessOverride {
  routeClass?: RouteClass;
  authenticationRequired?: boolean;
  scopeRequirement?: string;
  authorityRequirement?: string;
  actorSource?: string;
  primarySecurityInvariant?: string;
}

interface ScannedRoute {
  path: string;
  method: string;
  domain: string;
  controller: string;
  sourceFile: string;
  handler: string;
  routeClass: RouteClass;
  authenticationRequired: boolean;
  isPublic: boolean;
  technicalPermissionRequired: boolean;
  permissionCode: string | null;
  guardCoverage: string[];
  scopeRequirement: string;
  authorityRequirement: string;
  actorSource: string;
  primarySecurityInvariant: string;
}

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

const DOMAIN_PROFILES: Record<string, DomainSecurityProfile> = {
  identity: {
    routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
    authenticationRequired: true,
    scopeRequirement: 'Identity administration or authenticated self-service session',
    authorityRequirement: 'No government authority inferred from identity alone',
    actorSource: 'Session identity or institutional administrator',
    primarySecurityInvariant: 'User != Officeholder != Role != Permission != Authority',
  },
  authority: {
    routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
    authenticationRequired: true,
    scopeRequirement: 'Authority configuration or evaluated institutional action scope',
    authorityRequirement: 'Explicit function authority evaluation for consequential actions',
    actorSource: 'Session identity with officeholder linkage when evaluating authority',
    primarySecurityInvariant: 'Technical permission does not create legal authority',
  },
  government: {
    routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
    authenticationRequired: true,
    scopeRequirement: 'Government structure administration',
    authorityRequirement: 'Institutional configuration authority (not self-granted)',
    actorSource: 'Authenticated institutional administrator',
    primarySecurityInvariant: 'Government structure facts remain separate from identity privilege',
  },
  'service-catalog': {
    routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
    authenticationRequired: true,
    scopeRequirement: 'Service catalog administration or public discovery opt-out',
    authorityRequirement: 'Catalog configuration authority for protected routes',
    actorSource: 'Administrator or anonymous reader for explicitly public catalog routes',
    primarySecurityInvariant: 'Published catalog visibility does not grant case or decision access',
  },
  'application-processing': {
    routeClass: RouteClass.AUTHENTICATED_SELF_SERVICE,
    authenticationRequired: true,
    scopeRequirement: 'Applicant-owned case/application scope or official institutional case scope',
    authorityRequirement: 'Case access guard; official routes require institutional actor context',
    actorSource: 'Session identity with applicant or official case access resolution',
    primarySecurityInvariant: 'Access to a case does not confer decision authority',
  },
  records: {
    routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
    authenticationRequired: true,
    scopeRequirement: 'Master administrative file institutional read scope',
    authorityRequirement: 'Institutional records access; service identities excluded',
    actorSource: 'Authenticated human institutional actor',
    primarySecurityInvariant: 'Records access is institutional and attributable',
  },
  evidence: {
    routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
    authenticationRequired: true,
    scopeRequirement: 'Evidence governance, document custody, or applicant document scope',
    authorityRequirement: 'Document/evidence access guard or institutional evidence role',
    actorSource: 'Session identity with applicant or official actor context',
    primarySecurityInvariant: 'Evidence quality and verification cannot be client-asserted',
  },
  decisions: {
    routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
    authenticationRequired: true,
    scopeRequirement: 'Case-bound decision preparation and execution scope',
    authorityRequirement: 'Explicit decision-maker identity match and institutional authority for execution',
    actorSource: 'Session identity; decisionMakerIdentityId must match session',
    primarySecurityInvariant: 'Recommendations and preparation do not equal official decisions',
  },
  'decisions-issuance': {
    routeClass: RouteClass.CONSEQUENTIAL_AUTHORITY_CONTROLLED,
    authenticationRequired: true,
    scopeRequirement: 'Issuance readiness and official instrument issuance scope',
    authorityRequirement: 'Function authority ISSUE evaluation via AuthorityPolicyGuard',
    actorSource: 'Session identity with evaluated issuer authority context',
    primarySecurityInvariant: 'Issuance requires explicit authority evaluation, not authentication alone',
  },
  compliance: {
    routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
    authenticationRequired: true,
    scopeRequirement: 'Compliance oversight dashboards and obligation administration',
    authorityRequirement: 'Institutional compliance role or holder-scoped dashboard access',
    actorSource: 'Session identity with compliance or holder context',
    primarySecurityInvariant: 'Compliance status is derived from authoritative records',
  },
  redress: {
    routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
    authenticationRequired: true,
    scopeRequirement: 'Redress and appeals administration',
    authorityRequirement: 'Institutional redress handling authority',
    actorSource: 'Authenticated institutional actor',
    primarySecurityInvariant: 'Redress access does not bypass original decision authority chain',
  },
  'operational-support': {
    routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
    authenticationRequired: true,
    scopeRequirement: 'Operational support and platform administration',
    authorityRequirement: 'Restricted platform operations authority',
    actorSource: 'Authenticated platform administrator',
    primarySecurityInvariant: 'Operational tooling cannot mutate authoritative government decisions',
  },
  intelligence: {
    routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
    authenticationRequired: true,
    scopeRequirement: 'Analytics, metrics, and command-console institutional scope',
    authorityRequirement: 'Intelligence module access; analytics do not create authority',
    actorSource: 'Authenticated institutional analyst or administrator',
    primarySecurityInvariant: 'Analytics and AI outputs are advisory, not official decisions',
  },
  'operational-readiness': {
    routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
    authenticationRequired: true,
    scopeRequirement: 'Operational readiness assessment administration',
    authorityRequirement: 'Institutional readiness configuration authority',
    actorSource: 'Authenticated institutional administrator',
    primarySecurityInvariant: 'Readiness metadata does not confer production authority',
  },
  healthcare: {
    routeClass: RouteClass.AUTHENTICATED_SELF_SERVICE,
    authenticationRequired: true,
    scopeRequirement: 'Patient-owned healthcare profile or provider policy-scoped access',
    authorityRequirement: 'HealthcareDataAccessPolicy for provider routes; no autonomous clinical authority',
    actorSource: 'Session identity with patient or governed provider context',
    primarySecurityInvariant:
      'Program discovery != medical recommendation; application != clinical authorization',
  },
  'production-readiness': {
    routeClass: RouteClass.PUBLIC,
    authenticationRequired: false,
    scopeRequirement: 'Public boundary disclaimer consumption',
    authorityRequirement: 'None',
    actorSource: 'Anonymous reader',
    primarySecurityInvariant: 'Boundary disclaimers are informational only',
  },
  'service-packs': {
    routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
    authenticationRequired: true,
    scopeRequirement: 'Service pack authoring, validation, and deployment administration',
    authorityRequirement: 'Technical permission; consequential governance routes require authority evaluation',
    actorSource: 'Authenticated platform administrator',
    primarySecurityInvariant: 'Pack compilation != production deployment authority',
  },
  scheduling: {
    routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
    authenticationRequired: true,
    scopeRequirement: 'Government scheduling configuration and appointment administration',
    authorityRequirement: 'Institutional scheduling administration permission',
    actorSource: 'Authenticated institutional administrator',
    primarySecurityInvariant: 'Scheduling configuration does not confer appointment decision authority',
  },
  system: {
    routeClass: RouteClass.SYSTEM_HEALTH,
    authenticationRequired: false,
    scopeRequirement: 'Process and dependency health probes',
    authorityRequirement: 'None',
    actorSource: 'Anonymous monitor',
    primarySecurityInvariant: 'Health endpoints expose no protected domain data',
  },
};

const DEFAULT_DOMAIN_PROFILE: DomainSecurityProfile = {
  routeClass: RouteClass.SYSTEM_HEALTH,
  authenticationRequired: false,
  scopeRequirement: 'Process and dependency health probes',
  authorityRequirement: 'None',
  actorSource: 'Anonymous monitor',
  primarySecurityInvariant: 'Health endpoints expose no protected domain data',
};

function findControllerFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findControllerFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

function resolveDomain(sourceFile: string): string {
  const relative = path.relative(CONTROLLER_GLOB_ROOT, sourceFile).replace(/\\/g, '/');

  if (relative.startsWith('identity/')) return 'identity';
  if (relative.startsWith('authority/')) return 'authority';
  if (relative.startsWith('government/')) return 'government';
  if (relative.startsWith('service-catalog/')) return 'service-catalog';
  if (relative.startsWith('application-processing/')) return 'application-processing';
  if (relative.startsWith('records/')) return 'records';
  if (relative.startsWith('evidence-records/') || relative.startsWith('evidence/')) return 'evidence';
  if (relative.startsWith('decisions-issuance/')) return 'decisions-issuance';
  if (relative.startsWith('decisions/')) return 'decisions';
  if (relative.startsWith('compliance/')) return 'compliance';
  if (relative.startsWith('redress/')) return 'redress';
  if (relative.startsWith('operational-support/')) return 'operational-support';
  if (relative.startsWith('intelligence/')) return 'intelligence';
  if (relative.startsWith('operational-readiness/')) return 'operational-readiness';
  if (relative.startsWith('production-readiness/')) return 'production-readiness';
  if (relative.startsWith('healthcare/')) return 'healthcare';
  if (relative.startsWith('service-packs/')) return 'service-packs';
  if (relative.startsWith('scheduling/')) return 'scheduling';
  if (relative.startsWith('evidence-records/')) return 'evidence-records';
  if (relative === 'app.controller.ts' || relative.startsWith('system/')) return 'system';

  return 'system';
}

function normalizeControllerPath(controllerPath: string): string {
  return controllerPath.replace(/^api\/v1\/?/, '').trim();
}

function joinRoutePaths(controllerPath: string, methodPath: string): string {
  const segments = [normalizeControllerPath(controllerPath), methodPath]
    .map((segment) => segment.trim().replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);
  return `/${segments.join('/')}`;
}

function isPublicDecoratorPresent(decoratorBlock: string): boolean {
  return /@Public\s*\(\s*\)/.test(decoratorBlock);
}

function hasRequiresAuthority(decoratorBlock: string): boolean {
  return /@RequiresAuthority\s*\(/.test(decoratorBlock);
}

function hasAuthorityPolicyGuard(decoratorBlock: string): boolean {
  return /@UseGuards\s*\([^)]*AuthorityPolicyGuard/.test(decoratorBlock);
}

function hasDenyByDefaultAdministrative(decoratorBlock: string): boolean {
  return /@DenyByDefaultAdministrative\s*\(\s*\)/.test(decoratorBlock);
}

function extractRequirePermissionsCode(decoratorBlock: string): string | null {
  const match = decoratorBlock.match(
    /@RequirePermissions\s*\(\s*PermissionCodes\.(\w+)\s*\)/,
  );
  if (!match?.[1]) {
    return null;
  }
  const key = match[1] as keyof typeof PermissionCodes;
  return PermissionCodes[key] ?? null;
}

function resolveTechnicalAccessMetadata(input: {
  classHeader: string;
  decoratorBlock: string;
}): {
  technicalPermissionRequired: boolean;
  permissionCode: string | null;
} {
  const denyByDefault =
    hasDenyByDefaultAdministrative(input.classHeader) ||
    hasDenyByDefaultAdministrative(input.decoratorBlock);
  const permissionCode =
    extractRequirePermissionsCode(input.decoratorBlock) ??
    extractRequirePermissionsCode(input.classHeader);

  return {
    technicalPermissionRequired: denyByDefault || permissionCode !== null,
    permissionCode,
  };
}

function parseRouteAccessOverride(decoratorBlock: string): RouteAccessOverride | undefined {
  const match = decoratorBlock.match(/@RouteAccess\s*\(\s*(\{[\s\S]*?\})\s*\)/);
  if (!match?.[1]) {
    return undefined;
  }

  const body = match[1];
  const override: RouteAccessOverride = {};

  const routeClassMatch = body.match(/routeClass:\s*RouteClass\.(\w+)/);
  if (routeClassMatch?.[1]) {
    override.routeClass = RouteClass[routeClassMatch[1] as keyof typeof RouteClass];
  }

  const authMatch = body.match(/authenticationRequired:\s*(true|false)/);
  if (authMatch?.[1]) {
    override.authenticationRequired = authMatch[1] === 'true';
  }

  for (const field of [
    'scopeRequirement',
    'authorityRequirement',
    'actorSource',
    'primarySecurityInvariant',
  ] as const) {
    const fieldMatch = body.match(new RegExp(`${field}:\\s*['"]([^'"]+)['"]`));
    if (fieldMatch?.[1]) {
      override[field] = fieldMatch[1];
    }
  }

  return override;
}

function extractMethodPath(decoratorLine: string): string {
  const quoted = decoratorLine.match(/@\w+\(\s*['"]([^'"]*)['"]\s*\)/);
  if (quoted) {
    return quoted[1] ?? '';
  }
  if (/@\w+\(\s*\)/.test(decoratorLine)) {
    return '';
  }
  return '';
}

function collectLeadingDecorators(content: string, controllerIndex: number): string {
  const prefix = content.slice(0, controllerIndex);
  const lines = prefix.split('\n');
  const decoratorLines: string[] = [];

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const trimmed = lines[index]?.trim() ?? '';
    if (!trimmed) {
      if (decoratorLines.length > 0) {
        break;
      }
      continue;
    }
    if (trimmed.startsWith('@')) {
      decoratorLines.unshift(lines[index] ?? '');
      continue;
    }
    break;
  }

  return decoratorLines.length > 0 ? `${decoratorLines.join('\n')}\n` : '';
}

function collectDecoratorBlock(classBody: string, methodMatchIndex: number, methodDecoratorLine: string): string {
  const blockEnd = methodMatchIndex + methodDecoratorLine.length;
  const beforeLines = classBody.slice(0, blockEnd).split('\n');
  const decoratorLines: string[] = [];

  for (let index = beforeLines.length - 1; index >= 0; index -= 1) {
    const trimmed = beforeLines[index]?.trim() ?? '';
    if (!trimmed) {
      if (decoratorLines.length > 0) {
        break;
      }
      continue;
    }
    if (trimmed.startsWith('@')) {
      decoratorLines.unshift(beforeLines[index] ?? '');
      continue;
    }
    if (decoratorLines.length > 0) {
      break;
    }
  }

  const afterSlice = classBody.slice(blockEnd);
  const afterLines = afterSlice.split('\n');
  for (const line of afterLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed.startsWith('@')) {
      decoratorLines.push(line);
      continue;
    }
    break;
  }

  return decoratorLines.join('\n');
}

function extractHandlerName(blockAfterDecorators: string): string {
  const withoutLeadingDecorators = blockAfterDecorators.replace(
    /^(\s*@[\w(][^\n]*\n)+/,
    '',
  );
  const match = withoutLeadingDecorators.match(
    /(?:async\s+)?([A-Za-z_$][\w$]*)\s*(?:<[^>]+>)?\s*\(/,
  );
  return match?.[1] ?? 'unknown';
}

function classifyRoute(input: {
  fullPath: string;
  method: HttpMethod;
  domain: string;
  isPublic: boolean;
  requiresAuthority: boolean;
  routeAccess?: RouteAccessOverride;
}): Pick<
  ScannedRoute,
  | 'routeClass'
  | 'authenticationRequired'
  | 'isPublic'
  | 'scopeRequirement'
  | 'authorityRequirement'
  | 'actorSource'
  | 'primarySecurityInvariant'
> {
  const profile: DomainSecurityProfile =
    DOMAIN_PROFILES[input.domain] ?? DEFAULT_DOMAIN_PROFILE;
  const pathLower = input.fullPath.toLowerCase();

  let routeClass = input.routeAccess?.routeClass ?? profile.routeClass;
  let authenticationRequired =
    input.routeAccess?.authenticationRequired ?? profile.authenticationRequired;
  let isPublic = input.isPublic;

  if (input.isPublic) {
    if (/^\/(health|ready|version)$/.test(input.fullPath)) {
      routeClass = RouteClass.SYSTEM_HEALTH;
    } else {
      routeClass = RouteClass.PUBLIC;
    }
    authenticationRequired = false;
    isPublic = true;
  } else if (input.requiresAuthority) {
    routeClass = RouteClass.CONSEQUENTIAL_AUTHORITY_CONTROLLED;
    authenticationRequired = true;
    isPublic = false;
  } else {
    routeClass = classifyProtectedRoute(input.fullPath, input.method, input.domain, routeClass);
    authenticationRequired = true;
    isPublic = false;
  }

  return {
    routeClass,
    authenticationRequired,
    isPublic,
    scopeRequirement: input.routeAccess?.scopeRequirement ?? profile.scopeRequirement,
    authorityRequirement: input.routeAccess?.authorityRequirement ?? profile.authorityRequirement,
    actorSource: input.routeAccess?.actorSource ?? profile.actorSource,
    primarySecurityInvariant:
      input.routeAccess?.primarySecurityInvariant ?? profile.primarySecurityInvariant,
  };
}

function classifyProtectedRoute(
  fullPath: string,
  method: HttpMethod,
  domain: string,
  defaultClass: RouteClass,
): RouteClass {
  if (isConsequentialAuthorityRoute(fullPath, method)) {
    return RouteClass.CONSEQUENTIAL_AUTHORITY_CONTROLLED;
  }

  if (domain === 'identity') {
    if (fullPath === '/identity/me' || fullPath === '/identity/auth/logout') {
      return RouteClass.AUTHENTICATED_SELF_SERVICE;
    }
    return RouteClass.RESTRICTED_ADMINISTRATIVE;
  }

  if (domain === 'service-catalog') {
    if (fullPath.startsWith('/public/')) {
      return RouteClass.PUBLIC;
    }
    return RouteClass.RESTRICTED_ADMINISTRATIVE;
  }

  if (domain === 'application-processing') {
    if (fullPath.startsWith('/workflow-definitions')) {
      return RouteClass.RESTRICTED_ADMINISTRATIVE;
    }
    if (isApplicantSelfServicePath(fullPath)) {
      return RouteClass.AUTHENTICATED_SELF_SERVICE;
    }
    if (isInstitutionalCasePath(fullPath)) {
      return RouteClass.AUTHENTICATED_INSTITUTIONAL;
    }
    if (fullPath.startsWith('/applications')) {
      return RouteClass.AUTHENTICATED_SELF_SERVICE;
    }
    return RouteClass.AUTHENTICATED_INSTITUTIONAL;
  }

  if (domain === 'decisions') {
    return RouteClass.AUTHENTICATED_INSTITUTIONAL;
  }

  if (domain === 'decisions-issuance') {
    if (fullPath.startsWith('/public/instruments')) {
      return RouteClass.PUBLIC;
    }
    if (fullPath.startsWith('/instruments/') && method === 'Get') {
      return RouteClass.AUTHENTICATED_SELF_SERVICE;
    }
    return RouteClass.CONSEQUENTIAL_AUTHORITY_CONTROLLED;
  }

  if (domain === 'evidence') {
    if (fullPath.startsWith('/documents') && !fullPath.includes('classifications')) {
      return RouteClass.AUTHENTICATED_SELF_SERVICE;
    }
    return RouteClass.AUTHENTICATED_INSTITUTIONAL;
  }

  if (domain === 'compliance') {
    if (fullPath.includes('/dashboards/holder/')) {
      return RouteClass.AUTHENTICATED_SELF_SERVICE;
    }
    return RouteClass.AUTHENTICATED_INSTITUTIONAL;
  }

  if (domain === 'healthcare') {
    if (fullPath.startsWith('/experience/citizen/healthcare')) {
      return RouteClass.AUTHENTICATED_SELF_SERVICE;
    }
    if (fullPath.startsWith('/experience/provider/healthcare')) {
      return RouteClass.AUTHENTICATED_INSTITUTIONAL;
    }
    return RouteClass.AUTHENTICATED_INSTITUTIONAL;
  }

  if (
    domain === 'government' ||
    domain === 'authority' ||
    domain === 'records' ||
    domain === 'redress' ||
    domain === 'operational-support' ||
    domain === 'intelligence' ||
    domain === 'operational-readiness'
  ) {
    return RouteClass.RESTRICTED_ADMINISTRATIVE;
  }

  return defaultClass;
}

function isConsequentialAuthorityRoute(fullPath: string, method: HttpMethod): boolean {
  if (method === 'Post' && fullPath === '/decisions/execute') {
    return true;
  }
  if (method === 'Post' && /^\/decisions-issuance\/(issue|readiness\/assess)$/.test(fullPath)) {
    return true;
  }
  return false;
}

function isApplicantSelfServicePath(fullPath: string): boolean {
  return (
    /\/applicant(?:\/|$)/.test(fullPath) ||
    fullPath.endsWith('/applicant-status') ||
    fullPath.endsWith('/public-status') ||
    (fullPath.includes('/cases/') &&
      (fullPath.endsWith('/timeline/applicant') || fullPath.endsWith('/communications/applicant')))
  );
}

function isInstitutionalCasePath(fullPath: string): boolean {
  return (
    fullPath.endsWith('/dashboard') ||
    fullPath.endsWith('/timeline') ||
    fullPath.endsWith('/communications') ||
    fullPath.endsWith('/milestones') ||
    fullPath.includes('/completeness-reviews') ||
    fullPath.includes('/referrals')
  );
}

function parseControllerFile(sourceFile: string): ScannedRoute[] {
  const content = fs.readFileSync(sourceFile, 'utf8');
  const domain = resolveDomain(sourceFile);
  const relativeSource = path.relative(PROJECT_ROOT, sourceFile).replace(/\\/g, '/');
  const routes: ScannedRoute[] = [];

  const classPattern = /@Controller\s*\(\s*(?:['"]([^'"]*)['"]\s*)?\)[\s\S]*?export class (\w+)/g;
  let classMatch: RegExpExecArray | null;

  while ((classMatch = classPattern.exec(content)) !== null) {
    const controllerPath = classMatch[1] ?? '';
    const controllerName = classMatch[2] ?? 'UnknownController';
    const classStart = classMatch.index;
    const nextClass = content.indexOf('@Controller', classStart + 1);
    const classBody = content.slice(
      classStart,
      nextClass === -1 ? content.length : nextClass,
    );

    const leadingDecorators = collectLeadingDecorators(content, classStart);
    const classHeader = `${leadingDecorators}${classBody.slice(0, classBody.indexOf('{'))}`;
    const classIsPublic = isPublicDecoratorPresent(classHeader);
    const classHasAuthorityGuard = hasAuthorityPolicyGuard(classHeader);

    const methodPattern = new RegExp(
      `@(${HTTP_METHODS.join('|')})\\(([^)]*)\\)`,
      'g',
    );
    let methodMatch: RegExpExecArray | null;

    while ((methodMatch = methodPattern.exec(classBody)) !== null) {
      const httpMethod = methodMatch[1] as HttpMethod;
      const methodDecoratorLine = methodMatch[0];
      const methodPath = extractMethodPath(methodDecoratorLine);
      const fullPath = joinRoutePaths(controllerPath, methodPath);

      const decoratorBlock = collectDecoratorBlock(
        classBody,
        methodMatch.index,
        methodDecoratorLine,
      );

      const methodIsPublic = classIsPublic || isPublicDecoratorPresent(decoratorBlock);
      const requiresAuthority =
        hasRequiresAuthority(decoratorBlock) ||
        classHasAuthorityGuard ||
        hasAuthorityPolicyGuard(decoratorBlock);

      const routeAccess = parseRouteAccessOverride(decoratorBlock);
      const handlerBlock = classBody.slice(methodMatch.index + methodDecoratorLine.length);
      const handler = extractHandlerName(handlerBlock);

      const classification = classifyRoute({
        fullPath,
        method: httpMethod,
        domain,
        isPublic: methodIsPublic,
        requiresAuthority,
        routeAccess,
      });

      const technicalAccess = resolveTechnicalAccessMetadata({
        classHeader,
        decoratorBlock,
      });
      const guardCoverage = ['SessionAuthGuard'];
      if (!classification.isPublic) {
        guardCoverage.push('ClientIdentitySubstitutionGuard');
      }
      if (technicalAccess.technicalPermissionRequired) {
        guardCoverage.push('PermissionsGuard');
      }
      if (requiresAuthority) {
        guardCoverage.push('AuthorityPolicyGuard');
      }

      routes.push({
        path: fullPath,
        method: httpMethod.toUpperCase(),
        domain,
        controller: controllerName,
        sourceFile: relativeSource,
        handler,
        technicalPermissionRequired: technicalAccess.technicalPermissionRequired,
        permissionCode: technicalAccess.permissionCode,
        guardCoverage,
        ...classification,
      });
    }
  }

  return routes;
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
  const controllerFiles = findControllerFiles(CONTROLLER_GLOB_ROOT);
  const routes = controllerFiles
    .flatMap(parseControllerFile)
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

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
