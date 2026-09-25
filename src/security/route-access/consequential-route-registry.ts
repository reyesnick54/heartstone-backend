import { AuthorityActionType } from '@prisma/client';

/** HTTP method + normalized path patterns that must carry @ConsequentialAction metadata. */
export interface ConsequentialRouteRequirement {
  method: string;
  pathPattern: RegExp;
  action: AuthorityActionType;
  description: string;
}

export const CONSEQUENTIAL_ROUTE_REQUIREMENTS: ConsequentialRouteRequirement[] = [
  {
    method: 'POST',
    pathPattern: /^\/decisions\/execute$/,
    action: AuthorityActionType.DECIDE,
    description: 'Government decision execution',
  },
  {
    method: 'POST',
    pathPattern: /^\/decisions\/readiness\/assess$/,
    action: AuthorityActionType.DECIDE,
    description: 'Decision readiness assessment',
  },
  {
    method: 'POST',
    pathPattern: /^\/decisions-issuance\/issue$/,
    action: AuthorityActionType.ISSUE,
    description: 'Official instrument issuance',
  },
  {
    method: 'POST',
    pathPattern: /^\/decisions-issuance\/readiness\/assess$/,
    action: AuthorityActionType.ISSUE,
    description: 'Issuance readiness assessment',
  },
  {
    method: 'POST',
    pathPattern: /^\/redress\/decisions$/,
    action: AuthorityActionType.DECIDE,
    description: 'Redress decision',
  },
  {
    method: 'POST',
    pathPattern: /^\/redress\/interim-relief\/decisions$/,
    action: AuthorityActionType.DECIDE,
    description: 'Interim relief decision',
  },
  {
    method: 'POST',
    pathPattern: /^\/compliance\/reviews\/finalize$/,
    action: AuthorityActionType.ENFORCE,
    description: 'Compliance review finalization',
  },
  {
    method: 'PATCH',
    pathPattern: /^\/authority\/functions\/[^/]+\/suspend$/,
    action: AuthorityActionType.SUSPEND,
    description: 'Function authority suspension',
  },
  {
    method: 'POST',
    pathPattern: /^\/social-protection\/benefit-awards$/,
    action: AuthorityActionType.APPROVE,
    description: 'Authoritative benefit award',
  },
  {
    method: 'POST',
    pathPattern: /^\/clinical-research\/ethics-approvals\/versions$/,
    action: AuthorityActionType.APPROVE,
    description: 'Clinical research ethics approval',
  },
  {
    method: 'POST',
    pathPattern: /^\/labour\/work-permits\/[^/]+\/approve$/,
    action: AuthorityActionType.APPROVE,
    description: 'Work permit approval',
  },
  {
    method: 'POST',
    pathPattern: /^\/revenue\/tax-assessments\/issue$/,
    action: AuthorityActionType.ISSUE,
    description: 'Tax assessment issuance',
  },
  {
    method: 'POST',
    pathPattern: /^\/customs-trade\/shipments\/[^/]+\/release$/,
    action: AuthorityActionType.APPROVE,
    description: 'Customs cargo release authorization',
  },
  {
    method: 'POST',
    pathPattern: /^\/property-registry\/transfers\/[^/]+\/register-title$/,
    action: AuthorityActionType.APPROVE,
    description: 'Property title registration',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/v1\/civil-registry\/records\/[^/]+\/corrections\/approve$/,
    action: AuthorityActionType.APPROVE,
    description: 'Civil record correction approval',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/v1\/civil-registry\/certificates\/[^/]+\/issue$/,
    action: AuthorityActionType.ISSUE,
    description: 'Civil certificate issuance',
  },
  {
    method: 'POST',
    pathPattern: /^\/evidence\/quality-assessments\/[^/]+\/finalize$/,
    action: AuthorityActionType.APPROVE,
    description: 'Evidence quality assessment finalization',
  },
  {
    method: 'POST',
    pathPattern: /^\/operational-readiness\/capabilities\/maturity-assessments\/[^/]+\/decision$/,
    action: AuthorityActionType.DECIDE,
    description: 'Operational maturity decision',
  },
  {
    method: 'POST',
    pathPattern: /^\/service-packs\/governance\/[^/]+\/accept$/,
    action: AuthorityActionType.APPROVE,
    description: 'Service pack institutional acceptance',
  },
];

export function matchesConsequentialRouteRequirement(
  method: string,
  path: string,
): ConsequentialRouteRequirement | undefined {
  const normalizedMethod = method.toUpperCase();
  return CONSEQUENTIAL_ROUTE_REQUIREMENTS.find(
    (requirement) =>
      requirement.method === normalizedMethod && requirement.pathPattern.test(path),
  );
}
