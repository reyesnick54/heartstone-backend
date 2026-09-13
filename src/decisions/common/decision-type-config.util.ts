import {
  DecisionNoticeRightType,
  type GovernmentServiceDecisionTypeDefinition,
  type GovernmentServiceRedressRoute,
} from '@prisma/client';

export interface ResolvedDecisionTypeConfig {
  definition: GovernmentServiceDecisionTypeDefinition;
  redressRoutes: GovernmentServiceRedressRoute[];
}

export function parsePermittedOutcomes(
  definition: GovernmentServiceDecisionTypeDefinition,
): string[] {
  const raw = definition.permittedOutcomes;
  return Array.isArray(raw) ? raw.map(String) : [];
}

export function parseSupportedNoticeRightCodes(
  definition: GovernmentServiceDecisionTypeDefinition,
): string[] {
  const raw = definition.supportedNoticeRightCodes;
  return Array.isArray(raw) ? raw.map(String) : [];
}

export function resolveConfiguredNoticeRights(
  definition: GovernmentServiceDecisionTypeDefinition,
  redressRoutes: GovernmentServiceRedressRoute[],
): {
  routeCode: string;
  rightType: DecisionNoticeRightType;
  label: string;
  description: string | null;
  contactReference: string | null;
}[] {
  const supportedCodes = new Set(parseSupportedNoticeRightCodes(definition));
  const configuredRoutes = redressRoutes.filter((route) => supportedCodes.has(route.routeCode));

  return configuredRoutes.map((route) => ({
    routeCode: route.routeCode,
    rightType: mapRouteCodeToRightType(route.routeCode),
    label: route.label,
    description: route.description,
    contactReference: route.contactReference,
  }));
}

function mapRouteCodeToRightType(routeCode: string): DecisionNoticeRightType {
  const normalized = routeCode.toUpperCase();

  if (normalized.includes('APPEAL')) {
    return DecisionNoticeRightType.STATUTORY_APPEAL;
  }
  if (normalized.includes('RECONSIDER')) {
    return DecisionNoticeRightType.RECONSIDERATION;
  }
  if (normalized.includes('OMBUD')) {
    return DecisionNoticeRightType.OMBUDSMAN_OR_OVERSIGHT;
  }
  if (normalized.includes('JUDICIAL')) {
    return DecisionNoticeRightType.JUDICIAL_REVIEW_INFORMATION;
  }
  if (normalized.includes('COMPLAINT')) {
    return DecisionNoticeRightType.COMPLAINT;
  }
  if (normalized.includes('CLARIF')) {
    return DecisionNoticeRightType.CLARIFICATION;
  }
  if (normalized.includes('CORRECT')) {
    return DecisionNoticeRightType.ADMINISTRATIVE_CORRECTION;
  }
  if (normalized.includes('INTERNAL')) {
    return DecisionNoticeRightType.INTERNAL_REVIEW;
  }
  if (normalized.includes('PROFESSIONAL')) {
    return DecisionNoticeRightType.PROFESSIONAL_CHALLENGE;
  }
  if (normalized.includes('REGULAT')) {
    return DecisionNoticeRightType.REGULATORY_REVIEW;
  }

  return DecisionNoticeRightType.OTHER_AUTHORIZED_ROUTE;
}
