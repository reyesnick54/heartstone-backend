import {
  type ServicePackAuthorityIssue,
  type ServicePackCompilationIssue,
  type ServicePackCompilationResult,
  type ServicePackConfigurationConflict,
  type ServicePackDependencyEntry,
  type ServicePackReadinessSummary,
} from './service-pack.types';

export interface BuildServicePackCompilationResultInput {
  packCode: string;
  configurationFingerprint: string;
  errors: ServicePackCompilationIssue[];
  warnings: ServicePackCompilationIssue[];
  dependencies: ServicePackDependencyEntry[];
  unresolvedDependencies: ServicePackDependencyEntry[];
  authorityIssues: ServicePackAuthorityIssue[];
  configurationConflicts: ServicePackConfigurationConflict[];
  serviceCount: number;
  formCount: number;
  workflowCount: number;
  integrationCount: number;
  readinessSummary: ServicePackReadinessSummary;
}

export function buildServicePackCompilationResult(
  input: BuildServicePackCompilationResultInput,
): ServicePackCompilationResult {
  return Object.freeze({
    packCode: input.packCode,
    compiledAt: new Date().toISOString(),
    dryRun: true as const,
    configurationFingerprint: input.configurationFingerprint,
    errors: Object.freeze([...input.errors]),
    warnings: Object.freeze([...input.warnings]),
    dependencies: Object.freeze([...input.dependencies]),
    unresolvedDependencies: Object.freeze([...input.unresolvedDependencies]),
    authorityIssues: Object.freeze([...input.authorityIssues]),
    configurationConflicts: Object.freeze([...input.configurationConflicts]),
    serviceCount: input.serviceCount,
    formCount: input.formCount,
    workflowCount: input.workflowCount,
    integrationCount: input.integrationCount,
    readinessSummary: Object.freeze({ ...input.readinessSummary }),
  });
}
