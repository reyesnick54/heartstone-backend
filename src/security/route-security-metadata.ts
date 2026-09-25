import * as fs from 'node:fs';
import * as path from 'node:path';

import { matchesConsequentialRouteRequirement } from './route-access/consequential-route-registry';
import {
  resolveControllerDomain,
  type RouteAccessDomainKey,
} from './route-access/resolve-controller-domain';
import {
  profileForDomain,
  type RouteAccessProfile,
} from './route-access/route-access-profiles';
import { RouteClass } from './route-class.enum';

const HTTP_METHODS = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Head', 'Options'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const PUBLIC_MUTATION_FORBIDDEN_SEGMENTS = [
  'benefit-awards',
  'issue',
  'approve',
  'enforce',
  'release',
  'tax-assessments',
] as const;

export interface RouteAccessOverride {
  routeClass?: RouteClass;
  authenticationRequired?: boolean;
  scopeRequirement?: string;
  authorityRequirement?: string;
  actorSource?: string;
  primarySecurityInvariant?: string;
}

export interface ScannedRoute {
  path: string;
  method: string;
  domain: RouteAccessDomainKey;
  controller: string;
  sourceFile: string;
  handler: string;
  routeClass: RouteClass;
  authenticationRequired: boolean;
  isPublic: boolean;
  scopeRequirement: string;
  authorityRequirement: string;
  actorSource: string;
  primarySecurityInvariant: string;
  hasRouteAccessMetadata: boolean;
  hasConsequentialAction: boolean;
  hasConsequentialActionGuard: boolean;
  requiresConsequentialGuard: boolean;
}

export interface RouteScanResult {
  routes: ScannedRoute[];
}

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

function joinRoutePaths(controllerPath: string, methodPath: string): string {
  const segments = [controllerPath, methodPath]
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

function hasConsequentialActionDecorator(decoratorBlock: string): boolean {
  return /@ConsequentialAction\s*\(/.test(decoratorBlock);
}

function hasConsequentialActionGuardDecorator(decoratorBlock: string): boolean {
  return (
    decoratorBlock.includes('ConsequentialActionGuard') &&
    (/@UseGuards\s*\(/.test(decoratorBlock) || decoratorBlock.includes('UseGuards'))
  );
}

function hasControllerRouteAccessDecorator(decoratorBlock: string): boolean {
  return /@ControllerRouteAccess\s*\(/.test(decoratorBlock);
}

function hasRouteAccessDecorator(decoratorBlock: string): boolean {
  return /@RouteAccess\s*\(/.test(decoratorBlock);
}

function parseRouteAccessMetadataBlock(decoratorBlock: string): RouteAccessOverride | undefined {
  const match = /@(?:RouteAccess|ControllerRouteAccess)\s*\(\s*(\{[\s\S]*\})\s*\)/.exec(decoratorBlock);
  if (!match?.[1]) {
    return undefined;
  }

  const body = match[1];
  const override: RouteAccessOverride = {};

  const routeClassMatch = /routeClass:\s*RouteClass\.(\w+)/.exec(body);
  if (routeClassMatch?.[1]) {
    override.routeClass = RouteClass[routeClassMatch[1] as keyof typeof RouteClass];
  }

  const authMatch = /authenticationRequired:\s*(true|false)/.exec(body);
  if (authMatch?.[1]) {
    override.authenticationRequired = authMatch[1] === 'true';
  }

  for (const field of [
    'scopeRequirement',
    'authorityRequirement',
    'actorSource',
    'primarySecurityInvariant',
  ] as const) {
    const fieldMatch = new RegExp(`${field}:\\s*['"]([^'"]+)['"]`).exec(body);
    if (fieldMatch?.[1]) {
      override[field] = fieldMatch[1];
    }
  }

  return override;
}

function extractMethodPath(decoratorLine: string): string {
  const quoted = /@\w+\(\s*['"]([^'"]*)['"]\s*\)/.exec(decoratorLine);
  if (quoted) {
    return quoted[1] ?? '';
  }
  if (/@\w+\(\s*\)/.test(decoratorLine)) {
    return '';
  }
  return '';
}

function isDecoratorLine(trimmed: string): boolean {
  if (trimmed.startsWith('@')) {
    return true;
  }
  if (/^[})]/.test(trimmed)) {
    return true;
  }
  if (trimmed.endsWith('{') || trimmed.includes('({')) {
    return true;
  }
  if (
    /^(routeClass|authenticationRequired|scopeRequirement|authorityRequirement|actorSource|primarySecurityInvariant):/.test(
      trimmed,
    )
  ) {
    return true;
  }
  return false;
}

function collectDecoratorLinesBeforeIndex(content: string, endIndex: number): string {
  const lines = content.slice(0, endIndex).split('\n');
  let index = lines.length - 1;

  while (index >= 0 && !(lines[index]?.trim())) {
    index -= 1;
  }

  const collected: string[] = [];

  while (index >= 0) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      let look = index - 1;
      while (look >= 0 && !(lines[look]?.trim())) {
        look -= 1;
      }
      if (look >= 0 && isDecoratorLine(lines[look]?.trim() ?? '')) {
        index = look;
        continue;
      }
      break;
    }

    if (!isDecoratorLine(trimmed)) {
      break;
    }

    collected.unshift(line);
    index -= 1;
  }

  return collected.length > 0 ? `${collected.join('\n')}\n` : '';
}

function collectLeadingDecorators(content: string, controllerIndex: number): string {
  return collectDecoratorLinesBeforeIndex(content, controllerIndex);
}

function collectTrailingDecorators(classBody: string, startIndex: number): string {
  const lines = classBody.slice(startIndex).split('\n');
  const decoratorLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (decoratorLines.length > 0) {
        break;
      }
      continue;
    }
    if (trimmed.startsWith('@')) {
      decoratorLines.push(line);
      continue;
    }
    break;
  }

  return decoratorLines.length > 0 ? `${decoratorLines.join('\n')}\n` : '';
}

function collectDecoratorBlock(classBody: string, methodMatchIndex: number, methodDecoratorLine: string): string {
  const endIndex = methodMatchIndex + methodDecoratorLine.length;
  const before = collectDecoratorLinesBeforeIndex(classBody, endIndex);
  const after = collectTrailingDecorators(classBody, endIndex);
  return `${before}${after}`.trimEnd();
}

function extractHandlerName(blockAfterDecorators: string): string {
  let remainder = blockAfterDecorators;
  while (/^\s*@/.test(remainder)) {
    remainder = remainder.replace(/^\s*@\w+(?:\([^)]*\)|\(\s*\{[\s\S]*?\}\s*\))[\s\S]*?\n/m, '');
  }
  const match = /(?:async\s+)?([A-Za-z_$][\w$]*)\s*(?:<[^>]+>)?\s*\(/.exec(remainder);
  return match?.[1] ?? 'unknown';
}

export function classifyProtectedRoute(
  fullPath: string,
  method: HttpMethod,
  domain: RouteAccessDomainKey,
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

  if (domain === 'decisions-issuance' || domain === 'instruments') {
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
    domain === 'operational-readiness' ||
    domain === 'service-packs'
  ) {
    return RouteClass.RESTRICTED_ADMINISTRATIVE;
  }

  if (domain === 'citizen-experience') {
    return RouteClass.AUTHENTICATED_SELF_SERVICE;
  }

  if (domain === 'experience') {
    if (fullPath.startsWith('/experience/citizen/')) {
      return RouteClass.AUTHENTICATED_SELF_SERVICE;
    }
    return RouteClass.AUTHENTICATED_INSTITUTIONAL;
  }

  if (domain === 'production-readiness') {
    return RouteClass.PUBLIC;
  }

  if (domain === 'system') {
    if (/^\/(health|ready|version)$/.test(fullPath)) {
      return RouteClass.SYSTEM_HEALTH;
    }
    if (fullPath === '/') {
      return RouteClass.PUBLIC;
    }
    return defaultClass;
  }

  return defaultClass;
}

export function isConsequentialAuthorityRoute(fullPath: string, method: HttpMethod): boolean {
  return Boolean(matchesConsequentialRouteRequirement(method.toUpperCase(), fullPath));
}

export function isApplicantSelfServicePath(fullPath: string): boolean {
  return (
    /\/applicant(?:\/|$)/.test(fullPath) ||
    fullPath.endsWith('/applicant-status') ||
    fullPath.endsWith('/public-status') ||
    (fullPath.includes('/cases/') &&
      (fullPath.endsWith('/timeline/applicant') || fullPath.endsWith('/communications/applicant')))
  );
}

export function isInstitutionalCasePath(fullPath: string): boolean {
  return (
    fullPath.endsWith('/dashboard') ||
    fullPath.endsWith('/timeline') ||
    fullPath.endsWith('/communications') ||
    fullPath.endsWith('/milestones') ||
    fullPath.includes('/completeness-reviews') ||
    fullPath.includes('/referrals')
  );
}

function classifyRoute(input: {
  fullPath: string;
  method: HttpMethod;
  domain: RouteAccessDomainKey;
  isPublic: boolean;
  requiresAuthority: boolean;
  routeAccess?: RouteAccessOverride;
  controllerRouteAccess?: RouteAccessOverride;
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
  const profile: RouteAccessProfile = profileForDomain(input.domain);
  const mergedAccess: RouteAccessOverride = {
    ...input.controllerRouteAccess,
    ...input.routeAccess,
  };

  let routeClass = mergedAccess.routeClass ?? profile.routeClass;
  let authenticationRequired =
    mergedAccess.authenticationRequired ?? profile.authenticationRequired;
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
    scopeRequirement: mergedAccess.scopeRequirement ?? profile.scopeRequirement,
    authorityRequirement: mergedAccess.authorityRequirement ?? profile.authorityRequirement,
    actorSource: mergedAccess.actorSource ?? profile.actorSource,
    primarySecurityInvariant:
      mergedAccess.primarySecurityInvariant ?? profile.primarySecurityInvariant,
  };
}

function parseControllerFile(sourceFile: string, projectRoot: string): ScannedRoute[] {
  const content = fs.readFileSync(sourceFile, 'utf8');
  const relativeFromSrc = path.relative(path.join(projectRoot, 'src'), sourceFile).replace(/\\/g, '/');
  const domain = resolveControllerDomain(relativeFromSrc);
  const relativeSource = path.relative(projectRoot, sourceFile).replace(/\\/g, '/');
  const routes: ScannedRoute[] = [];

  const classPattern =
    /@Controller(?!RouteAccess)\s*\(\s*(?:['"]([^'"]*)['"]\s*)?\)[\s\S]*?export class (\w+)/g;
  let classMatch: RegExpExecArray | null;

  while ((classMatch = classPattern.exec(content)) !== null) {
    const controllerPath = classMatch[1] ?? '';
    const controllerName = classMatch[2] ?? 'UnknownController';
    const classStart = classMatch.index;
    const nextClass = content.indexOf('@Controller(', classStart + 1);
    const nextClassAlt = content.indexOf('@Controller()', classStart + 1);
    const nextClassWithQuote = content.indexOf("@Controller('", classStart + 1);
    const nextClassWithDoubleQuote = content.indexOf('@Controller("', classStart + 1);
    const nextCandidates = [nextClass, nextClassAlt, nextClassWithQuote, nextClassWithDoubleQuote].filter(
      (candidate) => candidate !== -1,
    );
    const nextClassIndex = nextCandidates.length > 0 ? Math.min(...nextCandidates) : -1;
    const classBody = content.slice(
      classStart,
      nextClassIndex === -1 ? content.length : nextClassIndex,
    );

    const leadingDecorators = collectLeadingDecorators(content, classStart);
    const classHeader = `${leadingDecorators}${classBody.slice(0, classBody.indexOf('{'))}`;
    const classIsPublic = isPublicDecoratorPresent(classHeader);
    const classHasAuthorityGuard = hasAuthorityPolicyGuard(classHeader);
    const classHasConsequentialGuard = hasConsequentialActionGuardDecorator(classHeader);
    const classHasConsequentialAction = hasConsequentialActionDecorator(classHeader);
    const classHasRouteAccessMetadata = hasControllerRouteAccessDecorator(classHeader);
    const controllerRouteAccess = parseRouteAccessMetadataBlock(classHeader);

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
      const normalizedMethod = httpMethod.toUpperCase();

      const decoratorBlock = collectDecoratorBlock(
        classBody,
        methodMatch.index,
        methodDecoratorLine,
      );
      const combinedGuardContext = `${classHeader}\n${decoratorBlock}`;

      const methodIsPublic = classIsPublic || isPublicDecoratorPresent(decoratorBlock);
      const hasConsequentialAction =
        classHasConsequentialAction || hasConsequentialActionDecorator(decoratorBlock);
      const hasConsequentialActionGuard =
        classHasConsequentialGuard ||
        hasConsequentialActionGuardDecorator(decoratorBlock) ||
        hasConsequentialActionGuardDecorator(combinedGuardContext);
      const requiresConsequentialGuard = Boolean(
        matchesConsequentialRouteRequirement(normalizedMethod, fullPath),
      );

      const requiresAuthority =
        hasConsequentialAction ||
        hasConsequentialActionGuard ||
        requiresConsequentialGuard ||
        hasRequiresAuthority(decoratorBlock) ||
        classHasAuthorityGuard ||
        hasAuthorityPolicyGuard(decoratorBlock);

      const routeAccess = parseRouteAccessMetadataBlock(decoratorBlock);
      const hasRouteAccessMetadata =
        classHasRouteAccessMetadata ||
        hasRouteAccessDecorator(decoratorBlock) ||
        hasControllerRouteAccessDecorator(decoratorBlock);

      const handlerBlock = classBody.slice(methodMatch.index + methodDecoratorLine.length);
      const handler = extractHandlerName(handlerBlock);

      const classification = classifyRoute({
        fullPath,
        method: httpMethod,
        domain,
        isPublic: methodIsPublic,
        requiresAuthority,
        routeAccess,
        controllerRouteAccess,
      });

      routes.push({
        path: fullPath,
        method: normalizedMethod,
        domain,
        controller: controllerName,
        sourceFile: relativeSource,
        handler,
        ...classification,
        hasRouteAccessMetadata,
        hasConsequentialAction,
        hasConsequentialActionGuard,
        requiresConsequentialGuard,
      });
    }
  }

  return routes;
}

export function scanControllerRoutes(projectRoot?: string): ScannedRoute[] {
  const root = projectRoot ?? path.resolve(__dirname, '..', '..');
  const controllerRoot = path.join(root, 'src');
  const controllerFiles = findControllerFiles(controllerRoot);
  return controllerFiles
    .flatMap((file) => parseControllerFile(file, root))
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

export function validateRouteSecurityMetadata(
  scan: ScannedRoute[] | RouteScanResult,
): { violations: string[] } {
  const routes = Array.isArray(scan) ? scan : scan.routes;
  const violations: string[] = [];

  for (const route of routes) {
    if (!route.hasRouteAccessMetadata) {
      violations.push(
        `${route.method} ${route.path} (${route.sourceFile}#${route.handler}): missing @RouteAccess or @ControllerRouteAccess metadata`,
      );
    }

    if (route.requiresConsequentialGuard) {
      if (!route.hasConsequentialAction) {
        violations.push(
          `${route.method} ${route.path}: requires @ConsequentialAction but decorator is missing`,
        );
      }
      if (!route.hasConsequentialActionGuard) {
        violations.push(
          `${route.method} ${route.path}: requires ConsequentialActionGuard but guard is missing`,
        );
      }
    }

    if (route.isPublic && MUTATING_METHODS.has(route.method)) {
      const pathLower = route.path.toLowerCase();
      for (const segment of PUBLIC_MUTATION_FORBIDDEN_SEGMENTS) {
        if (pathLower.includes(segment)) {
          violations.push(
            `${route.method} ${route.path}: public mutating route must not expose segment "${segment}"`,
          );
        }
      }
    }
  }

  return { violations };
}

export function routeClassEnumKey(routeClass: RouteClass): string {
  const entry = Object.entries(RouteClass).find(([, value]) => value === routeClass);
  return entry?.[0] ?? 'RESTRICTED_ADMINISTRATIVE';
}

export function controllerRouteAccessDecoratorLiteral(domain: RouteAccessDomainKey): string {
  const profile = profileForDomain(domain);
  return `@ControllerRouteAccess({
  routeClass: RouteClass.${routeClassEnumKey(profile.routeClass)},
  authenticationRequired: ${String(profile.authenticationRequired)},
  scopeRequirement: ${JSON.stringify(profile.scopeRequirement)},
  authorityRequirement: ${JSON.stringify(profile.authorityRequirement)},
  actorSource: ${JSON.stringify(profile.actorSource)},
  primarySecurityInvariant: ${JSON.stringify(profile.primarySecurityInvariant)},
})`;
}
