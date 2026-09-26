import {
  TECHNICAL_PERMISSION,
  type TechnicalPermissionCode,
} from './technical-permission/technical-permission.constants';

export interface AdministrativeRoutePermissionRule {
  /** Route path relative to the global `/api/v1` prefix (must start with `/`). */
  pathPrefix: string;
  permissionCode: TechnicalPermissionCode;
  /** When true, requires an institution-scoped grant matching the resolved institution id. */
  institutionScoped?: boolean;
}

/**
 * Longest-prefix wins. Only routes matching a rule require technical permission enforcement.
 */
export const ADMINISTRATIVE_ROUTE_PERMISSION_RULES: AdministrativeRoutePermissionRule[] = [
  {
    pathPrefix: '/identity/user-accounts',
    permissionCode: TECHNICAL_PERMISSION.IDENTITY_ADMIN,
  },
  {
    pathPrefix: '/identity/persons',
    permissionCode: TECHNICAL_PERMISSION.IDENTITY_ADMIN,
  },
  {
    pathPrefix: '/identity/credentials',
    permissionCode: TECHNICAL_PERMISSION.IDENTITY_ADMIN,
  },
  {
    pathPrefix: '/identity/authentication-methods',
    permissionCode: TECHNICAL_PERMISSION.IDENTITY_ADMIN,
  },
  {
    pathPrefix: '/identity/identities',
    permissionCode: TECHNICAL_PERMISSION.IDENTITY_ADMIN,
  },
  {
    pathPrefix: '/identity/memberships',
    permissionCode: TECHNICAL_PERMISSION.IDENTITY_ADMIN,
  },
  {
    pathPrefix: '/identity/organizations',
    permissionCode: TECHNICAL_PERMISSION.IDENTITY_ADMIN,
  },
  {
    pathPrefix: '/identity/representative-authorities',
    permissionCode: TECHNICAL_PERMISSION.IDENTITY_ADMIN,
  },
  {
    pathPrefix: '/identity/officeholder-links',
    permissionCode: TECHNICAL_PERMISSION.IDENTITY_ADMIN,
  },
  {
    pathPrefix: '/jurisdictions',
    permissionCode: TECHNICAL_PERMISSION.GOVERNMENT_STRUCTURE_ADMIN,
  },
  {
    pathPrefix: '/institutions',
    permissionCode: TECHNICAL_PERMISSION.GOVERNMENT_STRUCTURE_ADMIN,
    institutionScoped: true,
  },
  {
    pathPrefix: '/government-bodies',
    permissionCode: TECHNICAL_PERMISSION.GOVERNMENT_STRUCTURE_ADMIN,
  },
  {
    pathPrefix: '/departments',
    permissionCode: TECHNICAL_PERMISSION.GOVERNMENT_STRUCTURE_ADMIN,
  },
  {
    pathPrefix: '/offices',
    permissionCode: TECHNICAL_PERMISSION.GOVERNMENT_STRUCTURE_ADMIN,
  },
  {
    pathPrefix: '/officeholders',
    permissionCode: TECHNICAL_PERMISSION.GOVERNMENT_STRUCTURE_ADMIN,
  },
  {
    pathPrefix: '/appointments',
    permissionCode: TECHNICAL_PERMISSION.GOVERNMENT_STRUCTURE_ADMIN,
  },
  {
    pathPrefix: '/delegations',
    permissionCode: TECHNICAL_PERMISSION.GOVERNMENT_STRUCTURE_ADMIN,
  },
  {
    pathPrefix: '/external-authorities',
    permissionCode: TECHNICAL_PERMISSION.GOVERNMENT_STRUCTURE_ADMIN,
  },
  {
    pathPrefix: '/institution-external-authorities',
    permissionCode: TECHNICAL_PERMISSION.GOVERNMENT_STRUCTURE_ADMIN,
  },
  {
    pathPrefix: '/authority/functions',
    permissionCode: TECHNICAL_PERMISSION.AUTHORITY_CONFIGURATION_ADMIN,
  },
  {
    pathPrefix: '/authority/governing-sources',
    permissionCode: TECHNICAL_PERMISSION.AUTHORITY_CONFIGURATION_ADMIN,
  },
  {
    pathPrefix: '/authority-dependencies',
    permissionCode: TECHNICAL_PERMISSION.AUTHORITY_CONFIGURATION_ADMIN,
  },
  {
    pathPrefix: '/authority/evaluate',
    permissionCode: TECHNICAL_PERMISSION.AUTHORITY_CONFIGURATION_ADMIN,
  },
  {
    pathPrefix: '/forms',
    permissionCode: TECHNICAL_PERMISSION.SERVICE_CATALOG_ADMIN,
  },
  {
    pathPrefix: '/service-catalog',
    permissionCode: TECHNICAL_PERMISSION.SERVICE_CATALOG_ADMIN,
  },
  {
    pathPrefix: '/workflow-definitions',
    permissionCode: TECHNICAL_PERMISSION.WORKFLOW_ADMIN,
  },
  {
    pathPrefix: '/service-packs',
    permissionCode: TECHNICAL_PERMISSION.SERVICE_PACKS_ADMIN,
  },
  {
    pathPrefix: '/records/master-files',
    permissionCode: TECHNICAL_PERMISSION.RECORDS_ADMIN,
  },
  {
    pathPrefix: '/evidence-records',
    permissionCode: TECHNICAL_PERMISSION.EVIDENCE_RECORDS_ADMIN,
  },
  {
    pathPrefix: '/intelligence',
    permissionCode: TECHNICAL_PERMISSION.INTELLIGENCE_ADMIN,
  },
  {
    pathPrefix: '/operational-support',
    permissionCode: TECHNICAL_PERMISSION.OPERATIONAL_SUPPORT_ADMIN,
  },
  {
    pathPrefix: '/operational-readiness',
    permissionCode: TECHNICAL_PERMISSION.OPERATIONAL_READINESS_ADMIN,
  },
  {
    pathPrefix: '/redress',
    permissionCode: TECHNICAL_PERMISSION.REDRESS_ADMIN,
  },
  {
    pathPrefix: '/scheduling',
    permissionCode: TECHNICAL_PERMISSION.SCHEDULING_ADMIN,
  },
  {
    pathPrefix: '/compliance',
    permissionCode: TECHNICAL_PERMISSION.COMPLIANCE_ADMIN,
  },
].sort((a, b) => b.pathPrefix.length - a.pathPrefix.length);

export interface ResolvedAdministrativeRoutePermission {
  rule: AdministrativeRoutePermissionRule;
  normalizedPath: string;
}

export function normalizeApiPath(rawUrl: string): string {
  const pathOnly = rawUrl.split('?')[0] ?? rawUrl;
  const withoutGlobalPrefix = pathOnly.replace(/^\/api\/v1(?=\/|$)/, '');
  if (!withoutGlobalPrefix || withoutGlobalPrefix === '/') {
    return '/';
  }
  return withoutGlobalPrefix.startsWith('/') ? withoutGlobalPrefix : `/${withoutGlobalPrefix}`;
}

export function resolveAdministrativeRoutePermission(
  rawUrl: string,
): ResolvedAdministrativeRoutePermission | undefined {
  const normalizedPath = normalizeApiPath(rawUrl);
  const rule = ADMINISTRATIVE_ROUTE_PERMISSION_RULES.find(
    (candidate) =>
      normalizedPath === candidate.pathPrefix ||
      normalizedPath.startsWith(`${candidate.pathPrefix}/`),
  );

  if (!rule) {
    return undefined;
  }

  return { rule, normalizedPath };
}

export function resolveInstitutionScopeId(input: {
  params?: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
  normalizedPath: string;
}): string | undefined {
  const paramInstitution = input.params?.institutionId;
  if (typeof paramInstitution === 'string') {
    return paramInstitution;
  }

  const bodyInstitution = input.body?.institutionId;
  if (typeof bodyInstitution === 'string') {
    return bodyInstitution;
  }

  const responsibleInstitution = input.body?.responsibleInstitutionId;
  if (typeof responsibleInstitution === 'string') {
    return responsibleInstitution;
  }

  const institutionsPathMatch = /^\/institutions\/([^/]+)/.exec(input.normalizedPath);
  if (institutionsPathMatch?.[1] && institutionsPathMatch[1] !== 'structure') {
    return institutionsPathMatch[1];
  }

  return undefined;
}
