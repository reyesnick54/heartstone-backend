import type { SupportedManifestVersion } from './manifest.constants';

export interface ManifestValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ManifestValidationResult {
  valid: boolean;
  manifestVersion: SupportedManifestVersion | null;
  issues: ManifestValidationIssue[];
}

export interface ServicePackManifestV1 {
  manifestVersion: SupportedManifestVersion;
  servicePack: {
    code: string;
    name: string;
    description?: string;
    versionLabel: string;
  };
  jurisdiction?: ManifestReferenceSection;
  institution?: ManifestReferenceSection;
  department?: ManifestReferenceSection;
  services?: ManifestCodedSection[];
  authorityMappings?: ManifestAuthorityMapping[];
  forms?: ManifestCodedSection[];
  evidenceRequirements?: ManifestCodedSection[];
  workflows?: ManifestCodedSection[];
  fees?: ManifestCodedSection[];
  outputs?: ManifestCodedSection[];
  slaRules?: ManifestCodedSection[];
  communications?: ManifestCodedSection[];
  integrations?: ManifestCodedSection[];
  renewals?: ManifestCodedSection[];
  compliance?: ManifestCodedSection[];
  redress?: ManifestCodedSection[];
  dashboardDefinitions?: ManifestCodedSection[];
  dependencies?: ManifestDependency[];
}

export interface ManifestReferenceSection {
  code?: string;
  name?: string;
  referenceId?: string;
}

export interface ManifestCodedSection {
  code: string;
  name: string;
  description?: string;
  serviceCode?: string;
}

export interface ManifestAuthorityMapping {
  code: string;
  serviceCode: string;
  functionAuthorityRecordCode: string;
  description?: string;
}

export interface ManifestDependency {
  dependencyCode: string;
  dependencyKind: string;
  referenceKind: string;
  referenceId?: string;
  referenceCode?: string;
  controlScope?: 'HEARTSTONE_CONTROLLED' | 'EXTERNAL';
  isRequired?: boolean;
}
