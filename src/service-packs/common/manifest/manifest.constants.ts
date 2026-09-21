export const SUPPORTED_MANIFEST_VERSIONS = ['heartstone.service-pack/v1'] as const;

export type SupportedManifestVersion = (typeof SUPPORTED_MANIFEST_VERSIONS)[number];

export const MANIFEST_TOP_LEVEL_SECTIONS = [
  'servicePack',
  'jurisdiction',
  'institution',
  'department',
  'services',
  'authorityMappings',
  'forms',
  'evidenceRequirements',
  'workflows',
  'fees',
  'outputs',
  'slaRules',
  'communications',
  'integrations',
  'renewals',
  'compliance',
  'redress',
  'dashboardDefinitions',
  'dependencies',
] as const;

export const MANIFEST_CODE_SECTIONS = [
  { path: 'servicePack', codeField: 'code', singular: true },
  { path: 'jurisdiction', codeField: 'code', singular: true },
  { path: 'institution', codeField: 'code', singular: true },
  { path: 'department', codeField: 'code', singular: true },
  { path: 'services', codeField: 'code', singular: false },
  { path: 'authorityMappings', codeField: 'code', singular: false },
  { path: 'forms', codeField: 'code', singular: false },
  { path: 'evidenceRequirements', codeField: 'code', singular: false },
  { path: 'workflows', codeField: 'code', singular: false },
  { path: 'fees', codeField: 'code', singular: false },
  { path: 'outputs', codeField: 'code', singular: false },
  { path: 'slaRules', codeField: 'code', singular: false },
  { path: 'communications', codeField: 'code', singular: false },
  { path: 'integrations', codeField: 'code', singular: false },
  { path: 'renewals', codeField: 'code', singular: false },
  { path: 'compliance', codeField: 'code', singular: false },
  { path: 'redress', codeField: 'code', singular: false },
  { path: 'dashboardDefinitions', codeField: 'code', singular: false },
  { path: 'dependencies', codeField: 'dependencyCode', singular: false },
] as const;
