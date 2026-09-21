import {
  type FormConditionalAction,
  type FormConditionalLogic,
  type FormConditionalOperator,
  type FormDataClassification,
  type FormFieldType,
  type WorkflowStepConsequenceLevel,
  type WorkflowStepType,
  type WorkflowTransitionJoinType,
} from '@prisma/client';

import {
  type ServicePackCompilationCheckCode,
  type ServicePackIssueSeverity,
} from './service-pack.constants';

export interface ServicePackManifest {
  manifestVersion: string;
  packCode: string;
  packLabel: string;
  jurisdictionCode: string;
  institutionCode: string;
  services: ServicePackServiceManifest[];
  forms?: ServicePackFormManifest[];
  workflows?: ServicePackWorkflowManifest[];
}

export interface ServicePackServiceManifest {
  code: string;
  slug: string;
  officialName: string;
  publicName: string;
  departmentCode: string;
  serviceFamilyCode: string;
  functionAuthorityCodes: string[];
  governingSourceCodes: string[];
  formCode?: string;
  formVersion?: number;
  workflowCode?: string;
  workflowVersion?: string;
  fees?: ServicePackFeeManifest[];
  outputs?: ServicePackOutputManifest[];
  checklistItems?: ServicePackChecklistItemManifest[];
  redressRoutes?: ServicePackRedressRouteManifest[];
  evidenceRequirementRefs?: string[];
  integrationCodes?: string[];
  dashboardCodes?: string[];
  externalAuthorityCodes?: string[];
  slaConfiguration?: ServicePackSlaConfiguration;
  dataClassifications?: FormDataClassification[];
}

export interface ServicePackFeeManifest {
  code: string;
  label: string;
  amountCents?: number;
  currency?: string;
  isVariable?: boolean;
}

export interface ServicePackOutputManifest {
  outputCode: string;
  label: string;
  outputType?: string;
}

export interface ServicePackChecklistItemManifest {
  itemCode: string;
  label: string;
  isRequired?: boolean;
  evidenceRequirementRef?: string;
}

export interface ServicePackRedressRouteManifest {
  routeCode: string;
  label: string;
  contactReference?: string;
  escalationSteps?: string[];
}

export interface ServicePackSlaConfiguration {
  targetDays: number;
  warningDays?: number;
  pauseAllowed?: boolean;
}

export interface ServicePackFormManifest {
  code: string;
  version: number;
  title: Record<string, string>;
  sections: ServicePackFormSectionManifest[];
}

export interface ServicePackFormSectionManifest {
  sectionKey: string;
  title: Record<string, string>;
  displayOrder: number;
  fields: ServicePackFormFieldManifest[];
}

export interface ServicePackFormFieldManifest {
  fieldKey: string;
  label: Record<string, string>;
  fieldType: FormFieldType;
  required?: boolean;
  displayOrder: number;
  dataClassification?: FormDataClassification;
  conditionalRules?: ServicePackFormConditionalRuleManifest[];
  validation?: Record<string, unknown>;
}

export interface ServicePackFormConditionalRuleManifest {
  action: FormConditionalAction;
  logic: FormConditionalLogic;
  conditions: ServicePackFormConditionClauseManifest[];
}

export interface ServicePackFormConditionClauseManifest {
  fieldKey: string;
  operator: FormConditionalOperator;
  value?: unknown;
}

export interface ServicePackWorkflowManifest {
  code: string;
  version: string;
  governmentServiceCode?: string;
  stages: ServicePackWorkflowStageManifest[];
  steps: ServicePackWorkflowStepManifest[];
  transitions: ServicePackWorkflowTransitionManifest[];
}

export interface ServicePackWorkflowStageManifest {
  stageKey: string;
  label: string;
  displayOrder: number;
}

export interface ServicePackWorkflowStepManifest {
  stepKey: string;
  label: string;
  stepType: WorkflowStepType;
  stageKey?: string;
  consequenceLevel?: WorkflowStepConsequenceLevel;
  functionAuthorityCode?: string;
  displayOrder: number;
  isParallel?: boolean;
  parallelGroupKey?: string;
  joinType?: WorkflowTransitionJoinType;
}

export interface ServicePackWorkflowTransitionManifest {
  transitionKey: string;
  fromStepKey: string;
  toStepKey: string;
  isDefault?: boolean;
}

export interface ServicePackCompilationIssue {
  code: ServicePackCompilationCheckCode;
  severity: ServicePackIssueSeverity;
  message: string;
  path?: string;
  entityRef?: string;
}

export interface ServicePackDependencyEntry {
  ref: string;
  kind: string;
  resolved: boolean;
  entityId?: string;
}

export interface ServicePackAuthorityIssue {
  functionAuthorityCode?: string;
  governingSourceCode?: string;
  message: string;
}

export interface ServicePackConfigurationConflict {
  kind: string;
  message: string;
  conflictingRefs: string[];
}

export interface ServicePackReadinessSummary {
  deployable: boolean;
  criticalIssues: number;
  errorCount: number;
  warningCount: number;
  safeHaltReason?: string;
}

export interface ServicePackCompilationResult {
  readonly packCode: string;
  readonly compiledAt: string;
  readonly dryRun: true;
  readonly configurationFingerprint: string;
  readonly errors: readonly ServicePackCompilationIssue[];
  readonly warnings: readonly ServicePackCompilationIssue[];
  readonly dependencies: readonly ServicePackDependencyEntry[];
  readonly unresolvedDependencies: readonly ServicePackDependencyEntry[];
  readonly authorityIssues: readonly ServicePackAuthorityIssue[];
  readonly configurationConflicts: readonly ServicePackConfigurationConflict[];
  readonly serviceCount: number;
  readonly formCount: number;
  readonly workflowCount: number;
  readonly integrationCount: number;
  readonly readinessSummary: ServicePackReadinessSummary;
}

export interface ResolvedServicePackContext {
  jurisdictionId?: string;
  institutionId?: string;
  departmentIds: Map<string, string>;
  functionAuthorityIds: Map<string, string>;
  governingSourceIds: Map<string, string>;
  existingServiceSlugs: Set<string>;
  existingServiceCodes: Set<string>;
  integrationIds: Map<string, string>;
  dashboardIds: Map<string, string>;
  externalAuthorityIds: Map<string, string>;
  formDefinitionIds: Map<string, string>;
  workflowDefinitionIds: Map<string, string>;
  serviceFamilyIds: Map<string, string>;
}
