import { type ServicePackCompilationReport } from './service-pack.types';

export function formatCompilationReportHumanReadable(report: ServicePackCompilationReport): string {
  const lines: string[] = [
    '# Service Pack Compilation Report',
    '',
    `- Pack: ${report.packName} (${report.packVersion})`,
    `- Fingerprint: ${report.fingerprint}`,
    `- Services: ${String(report.serviceCount)}`,
    `- Validated at: ${report.validatedAt}`,
    '',
    '## Governance',
    `- NON_PRODUCTION: ${report.governanceSummary.nonProduction ? 'yes' : 'no'}`,
    `- Activation governance preserved: ${report.governanceSummary.activationGovernancePreserved ? 'yes' : 'no'}`,
    `- Institutional acceptance required: ${report.governanceSummary.institutionalAcceptanceRequired ? 'yes' : 'no'}`,
    '',
    '## Dependencies',
    `- Authority functions: ${report.dependencyReport.authorityFunctionCodes.join(', ') || 'none'}`,
    `- External integrations: ${report.dependencyReport.externalIntegrations.join(', ') || 'none'}`,
    `- Cross-service dependencies: ${report.dependencyReport.crossServiceDependencies.join(', ') || 'none'}`,
    `- Forms: ${report.dependencyReport.formCodes.join(', ') || 'none'}`,
    `- Evidence codes: ${report.dependencyReport.evidenceCodes.join(', ') || 'none'}`,
    '',
    '## Services',
  ];

  for (const service of report.services) {
    lines.push(
      `- ${service.serviceCode} (${service.serviceName}): ${String(service.workflowStageCount)} stages, ${String(service.evidenceRequirementCount)} evidence items, ${String(service.authorityFunctionCount)} authority mappings`,
    );
  }

  lines.push('');
  return lines.join('\n');
}
