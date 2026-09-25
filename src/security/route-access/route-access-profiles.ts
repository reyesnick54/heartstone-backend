import { type RouteAccessMetadata } from '../decorators/route-access.decorator';
import { RouteClass } from '../route-class.enum';
import { type RouteAccessDomainKey } from './resolve-controller-domain';

export type RouteAccessProfile = RouteAccessMetadata;

const identityProfile: RouteAccessProfile = {
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Identity administration or authenticated self-service session',
  authorityRequirement: 'No government authority inferred from identity alone',
  actorSource: 'Session identity or institutional administrator',
  primarySecurityInvariant: 'User != Officeholder != Role != Permission != Authority',
};

const authorityProfile: RouteAccessProfile = {
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Authority configuration or evaluated institutional action scope',
  authorityRequirement: 'Explicit function authority evaluation for consequential actions',
  actorSource: 'Session identity with officeholder linkage when evaluating authority',
  primarySecurityInvariant: 'Technical permission does not create legal authority',
};

const governmentProfile: RouteAccessProfile = {
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Government structure administration',
  authorityRequirement: 'Institutional configuration authority (not self-granted)',
  actorSource: 'Authenticated institutional administrator',
  primarySecurityInvariant: 'Government structure facts remain separate from identity privilege',
};

const serviceCatalogProfile: RouteAccessProfile = {
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Service catalog administration or public discovery opt-out',
  authorityRequirement: 'Catalog configuration authority for protected routes',
  actorSource: 'Administrator or anonymous reader for explicitly public catalog routes',
  primarySecurityInvariant: 'Published catalog visibility does not grant case or decision access',
};

const applicationProcessingProfile: RouteAccessProfile = {
  routeClass: RouteClass.AUTHENTICATED_SELF_SERVICE,
  authenticationRequired: true,
  scopeRequirement: 'Applicant-owned case/application scope or official institutional case scope',
  authorityRequirement: 'Case access guard; official routes require institutional actor context',
  actorSource: 'Session identity with applicant or official case access resolution',
  primarySecurityInvariant: 'Access to a case does not confer decision authority',
};

const recordsProfile: RouteAccessProfile = {
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Master administrative file institutional read scope',
  authorityRequirement: 'Institutional records access; service identities excluded',
  actorSource: 'Authenticated human institutional actor',
  primarySecurityInvariant: 'Records access is institutional and attributable',
};

const evidenceProfile: RouteAccessProfile = {
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Evidence governance, document custody, or applicant document scope',
  authorityRequirement: 'Document/evidence access guard or institutional evidence role',
  actorSource: 'Session identity with applicant or official actor context',
  primarySecurityInvariant: 'Evidence quality and verification cannot be client-asserted',
};

const decisionsProfile: RouteAccessProfile = {
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Case-bound decision preparation and execution scope',
  authorityRequirement: 'Explicit decision-maker identity match and institutional authority for execution',
  actorSource: 'Session identity; decisionMakerIdentityId must match session',
  primarySecurityInvariant: 'Recommendations and preparation do not equal official decisions',
};

const decisionsIssuanceProfile: RouteAccessProfile = {
  routeClass: RouteClass.CONSEQUENTIAL_AUTHORITY_CONTROLLED,
  authenticationRequired: true,
  scopeRequirement: 'Issuance readiness and official instrument issuance scope',
  authorityRequirement: 'Function authority ISSUE evaluation via ConsequentialActionGuard',
  actorSource: 'Session identity with evaluated issuer authority context',
  primarySecurityInvariant: 'Issuance requires explicit authority evaluation, not authentication alone',
};

const complianceProfile: RouteAccessProfile = {
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Compliance oversight dashboards and obligation administration',
  authorityRequirement: 'Institutional compliance role or holder-scoped dashboard access',
  actorSource: 'Session identity with compliance or holder context',
  primarySecurityInvariant: 'Compliance status is derived from authoritative records',
};

const redressProfile: RouteAccessProfile = {
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Redress and appeals administration',
  authorityRequirement: 'Institutional redress handling authority',
  actorSource: 'Authenticated institutional actor',
  primarySecurityInvariant: 'Redress access does not bypass original decision authority chain',
};

const operationalSupportProfile: RouteAccessProfile = {
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Operational support and platform administration',
  authorityRequirement: 'Restricted platform operations authority',
  actorSource: 'Authenticated platform administrator',
  primarySecurityInvariant: 'Operational tooling cannot mutate authoritative government decisions',
};

const intelligenceProfile: RouteAccessProfile = {
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Analytics, metrics, and command-console institutional scope',
  authorityRequirement: 'Intelligence module access; analytics do not create authority',
  actorSource: 'Authenticated institutional analyst or administrator',
  primarySecurityInvariant: 'Analytics and AI outputs are advisory, not official decisions',
};

const operationalReadinessProfile: RouteAccessProfile = {
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Operational readiness assessment administration',
  authorityRequirement: 'Institutional readiness configuration authority',
  actorSource: 'Authenticated institutional administrator',
  primarySecurityInvariant: 'Readiness metadata does not confer production authority',
};

const healthcareProfile: RouteAccessProfile = {
  routeClass: RouteClass.AUTHENTICATED_SELF_SERVICE,
  authenticationRequired: true,
  scopeRequirement: 'Patient-owned healthcare profile or provider policy-scoped access',
  authorityRequirement: 'HealthcareDataAccessPolicy for provider routes; no autonomous clinical authority',
  actorSource: 'Session identity with patient or governed provider context',
  primarySecurityInvariant:
    'Program discovery != medical recommendation; application != clinical authorization',
};

const productionReadinessProfile: RouteAccessProfile = {
  routeClass: RouteClass.PUBLIC,
  authenticationRequired: false,
  scopeRequirement: 'Public boundary disclaimer consumption',
  authorityRequirement: 'None',
  actorSource: 'Anonymous reader',
  primarySecurityInvariant: 'Boundary disclaimers are informational only',
};

const systemProfile: RouteAccessProfile = {
  routeClass: RouteClass.SYSTEM_HEALTH,
  authenticationRequired: false,
  scopeRequirement: 'Process and dependency health probes',
  authorityRequirement: 'None',
  actorSource: 'Anonymous monitor',
  primarySecurityInvariant: 'Health endpoints expose no protected domain data',
};

const governmentServiceDomainProfile: RouteAccessProfile = {
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Government service domain actor scope with institutional boundaries',
  authorityRequirement: 'ConsequentialActionGuard for final government outcomes',
  actorSource: 'Session identity with domain access resolution',
  primarySecurityInvariant: 'Application and submission endpoints do not confer official outcomes',
};

const experienceProfile: RouteAccessProfile = {
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Experience layer navigation and institutional workspace scope',
  authorityRequirement: 'OfficialExperienceGuard for substantive routes; no authority from navigation',
  actorSource: 'Session identity with resolved official or citizen context',
  primarySecurityInvariant: 'Experience projections do not execute consequential government actions',
};

export const ROUTE_ACCESS_PROFILES: Record<RouteAccessDomainKey, RouteAccessProfile> = {
  identity: identityProfile,
  authority: authorityProfile,
  government: governmentProfile,
  'service-catalog': serviceCatalogProfile,
  'application-processing': applicationProcessingProfile,
  records: recordsProfile,
  evidence: evidenceProfile,
  decisions: decisionsProfile,
  'decisions-issuance': decisionsIssuanceProfile,
  compliance: complianceProfile,
  redress: redressProfile,
  'operational-support': operationalSupportProfile,
  intelligence: intelligenceProfile,
  'operational-readiness': operationalReadinessProfile,
  healthcare: healthcareProfile,
  'production-readiness': productionReadinessProfile,
  system: systemProfile,
  labour: governmentServiceDomainProfile,
  immigration: governmentServiceDomainProfile,
  revenue: governmentServiceDomainProfile,
  'customs-trade': governmentServiceDomainProfile,
  'social-protection': governmentServiceDomainProfile,
  transportation: governmentServiceDomainProfile,
  'property-registry': governmentServiceDomainProfile,
  'planning-construction': governmentServiceDomainProfile,
  'public-safety': governmentServiceDomainProfile,
  education: governmentServiceDomainProfile,
  'civil-registry': governmentServiceDomainProfile,
  'service-packs': {
    ...governmentServiceDomainProfile,
    routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  },
  scheduling: applicationProcessingProfile,
  instruments: decisionsIssuanceProfile,
  'citizen-experience': {
    ...experienceProfile,
    routeClass: RouteClass.AUTHENTICATED_SELF_SERVICE,
  },
  experience: experienceProfile,
};

export function profileForDomain(domain: RouteAccessDomainKey): RouteAccessProfile {
  return ROUTE_ACCESS_PROFILES[domain];
}
