/**
 * Maps controller source paths to security domain keys used for route classification.
 */
export type RouteAccessDomainKey =
  | 'identity'
  | 'authority'
  | 'government'
  | 'service-catalog'
  | 'application-processing'
  | 'records'
  | 'evidence'
  | 'decisions'
  | 'decisions-issuance'
  | 'compliance'
  | 'redress'
  | 'operational-support'
  | 'intelligence'
  | 'operational-readiness'
  | 'healthcare'
  | 'production-readiness'
  | 'system'
  | 'labour'
  | 'immigration'
  | 'revenue'
  | 'customs-trade'
  | 'social-protection'
  | 'transportation'
  | 'property-registry'
  | 'planning-construction'
  | 'public-safety'
  | 'education'
  | 'civil-registry'
  | 'service-packs'
  | 'scheduling'
  | 'instruments'
  | 'citizen-experience'
  | 'experience';

export function resolveControllerDomain(relativeSourcePath: string): RouteAccessDomainKey {
  const relative = relativeSourcePath.replace(/\\/g, '/');

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
  if (relative.startsWith('labour/')) return 'labour';
  if (relative.startsWith('immigration/')) return 'immigration';
  if (relative.startsWith('revenue/')) return 'revenue';
  if (relative.startsWith('customs-trade/')) return 'customs-trade';
  if (relative.startsWith('social-protection/')) return 'social-protection';
  if (relative.startsWith('transportation/')) return 'transportation';
  if (relative.startsWith('property-registry/')) return 'property-registry';
  if (relative.startsWith('planning-construction/')) return 'planning-construction';
  if (relative.startsWith('public-safety/')) return 'public-safety';
  if (relative.startsWith('education/')) return 'education';
  if (relative.startsWith('civil-registry/')) return 'civil-registry';
  if (relative.startsWith('service-packs/')) return 'service-packs';
  if (relative.startsWith('scheduling/')) return 'scheduling';
  if (relative.startsWith('instruments/')) return 'instruments';
  if (relative.startsWith('citizen-experience/')) return 'citizen-experience';
  if (relative.startsWith('experience/')) return 'experience';
  if (relative === 'app.controller.ts' || relative.startsWith('system/')) return 'system';

  return 'system';
}
