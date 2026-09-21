import {
  type SERVICE_PACK_ALLOWED_LABELS,
  type SERVICE_PACK_ALLOWED_MATURITY_STATUSES,
  type SERVICE_PACK_ALLOWED_PUBLIC_AVAILABILITY,
  type SERVICE_PACK_HIGH_RISK_CHANGE_TYPES,
} from './service-pack.constants';

export type ServicePackLabel = (typeof SERVICE_PACK_ALLOWED_LABELS)[number];

export interface ServicePackDeploymentIntent {
  targetMaturityStatus: (typeof SERVICE_PACK_ALLOWED_MATURITY_STATUSES)[number];
  targetPublicAvailability: (typeof SERVICE_PACK_ALLOWED_PUBLIC_AVAILABILITY)[number];
  requiresInstitutionalAcceptance: boolean;
  requiresOperationalActivation: boolean;
}

export interface ServicePackAuthorityFunctionReference {
  functionCode: string;
  publicStageLabel: string;
  authorityActionType: string;
  sequenceOrder: number;
  isConsequential: boolean;
}

export interface ServicePackFormField {
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  dataClassification?: string;
}

export interface ServicePackFormSection {
  sectionKey: string;
  label: string;
  fields: ServicePackFormField[];
}

export interface ServicePackFormDefinition {
  formCode: string;
  formName: string;
  versionLabel: string;
  sections: ServicePackFormSection[];
}

export interface ServicePackEvidenceRequirement {
  evidenceCode: string;
  label: string;
  description: string;
  required: boolean;
  verificationCategory: string;
  retentionPolicyCode?: string;
}

export interface ServicePackWorkflowStage {
  stageKey: string;
  label: string;
  displayOrder: number;
  stepType: string;
  authorityFunctionCode?: string;
  authorityActionType?: string;
  consequenceLevel: string;
  isDecisionStage?: boolean;
  isIssuanceStage?: boolean;
}

export interface ServicePackCompletenessReview {
  enabled: boolean;
  deficiencyNoticeTemplateCode?: string;
  requiredEvidenceCodes: string[];
}

export interface ServicePackSlaRule {
  ruleCode: string;
  label: string;
  targetDays: number;
  clockStartsAtStageKey: string;
  pauseConditions?: string[];
}

export interface ServicePackFeeDefinition {
  feeCode: string;
  label: string;
  amount: number;
  currencyCode: string;
  waivable: boolean;
}

export interface ServicePackOutputDefinition {
  outputCode: string;
  label: string;
  outputType: string;
  deliveryChannel: string;
}

export interface ServicePackCommunication {
  communicationCode: string;
  triggerStageKey: string;
  channel: string;
  templateCode: string;
}

export interface ServicePackDependency {
  dependencyCode: string;
  dependencyType: string;
  description: string;
  externalIntegrationCode?: string;
}

export interface ServicePackDecisionStage {
  stageKey: string;
  decisionActorFunctionCode: string;
  requiresSecondApproval: boolean;
}

export interface ServicePackIssuanceConfig {
  issuanceStageKey: string;
  issuanceFunctionCode: string;
  outputCodes: string[];
}

export interface ServicePackLifecycleConfig {
  supportsRenewal: boolean;
  renewalServiceCode?: string;
  validityPeriodDays?: number;
  supersessionPolicyCode?: string;
}

export interface ServicePackRedressRoute {
  routeCode: string;
  label: string;
  routeType: string;
  description: string;
}

export interface ServicePackDashboardIndicator {
  indicatorCode: string;
  label: string;
  metricType: string;
  threshold?: number;
}

export interface ServicePackServiceDefinition {
  serviceCode: string;
  serviceSlug: string;
  serviceName: string;
  serviceFamilyCode: string;
  serviceType: string;
  description: string;
  applicantCategories: string[];
  authorityFunctions: ServicePackAuthorityFunctionReference[];
  forms: ServicePackFormDefinition[];
  evidenceRequirements: ServicePackEvidenceRequirement[];
  workflowStages: ServicePackWorkflowStage[];
  completenessReview: ServicePackCompletenessReview;
  slaRules: ServicePackSlaRule[];
  fees: ServicePackFeeDefinition[];
  outputs: ServicePackOutputDefinition[];
  communications: ServicePackCommunication[];
  dependencies: ServicePackDependency[];
  decisionStages: ServicePackDecisionStage[];
  issuance: ServicePackIssuanceConfig;
  lifecycle: ServicePackLifecycleConfig;
  redress: ServicePackRedressRoute[];
  dashboardIndicators: ServicePackDashboardIndicator[];
}

export interface ServicePackManifest {
  schemaVersion: string;
  packLabel: ServicePackLabel;
  packId: string;
  packVersion: string;
  packName: string;
  description: string;
  institutionCode: string;
  departmentCode?: string;
  deploymentIntent: ServicePackDeploymentIntent;
  services: ServicePackServiceDefinition[];
}

export interface ServicePackValidationIssue {
  path: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ServicePackValidationResult {
  valid: boolean;
  packId: string;
  packVersion: string;
  issues: ServicePackValidationIssue[];
}

export interface ServicePackDependencyReport {
  packId: string;
  packVersion: string;
  authorityFunctionCodes: string[];
  externalIntegrations: string[];
  crossServiceDependencies: string[];
  formCodes: string[];
  evidenceCodes: string[];
  communicationTemplateCodes: string[];
}

export interface ServicePackCompilationReport {
  packId: string;
  packVersion: string;
  packName: string;
  fingerprint: string;
  serviceCount: number;
  validatedAt: string;
  dependencyReport: ServicePackDependencyReport;
  governanceSummary: {
    nonProduction: boolean;
    activationGovernancePreserved: boolean;
    institutionalAcceptanceRequired: boolean;
  };
  services: {
    serviceCode: string;
    serviceName: string;
    workflowStageCount: number;
    evidenceRequirementCount: number;
    authorityFunctionCount: number;
  }[];
}

export interface ServicePackDiffEntry {
  category: string;
  changeType: string;
  path: string;
  summary: string;
  highRisk: boolean;
  highRiskType?: (typeof SERVICE_PACK_HIGH_RISK_CHANGE_TYPES)[number];
  requiresInstitutionalReview: boolean;
}

export interface ServicePackDiffResult {
  fromPackId: string;
  fromPackVersion: string;
  toPackId: string;
  toPackVersion: string;
  entries: ServicePackDiffEntry[];
  highRiskChanges: ServicePackDiffEntry[];
  summary: {
    addedServices: number;
    removedServices: number;
    modifiedServices: number;
    highRiskCount: number;
  };
}

export interface ServicePackVersionComparisonResult extends ServicePackDiffResult {
  fingerprintChanged: boolean;
  fromFingerprint: string;
  toFingerprint: string;
}
