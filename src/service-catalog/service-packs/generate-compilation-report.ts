import { calculateServicePackFingerprint } from './calculate-service-pack-fingerprint';
import { formatCompilationReportHumanReadable } from './format-compilation-report';
import { generateDependencyReport } from './generate-dependency-report';
import {
  SERVICE_PACK_NON_PRODUCTION_LABEL,
  SERVICE_PACK_TEMPLATE_ONLY_LABEL,
} from './service-pack.constants';
import { type ServicePackCompilationReport, type ServicePackManifest } from './service-pack.types';
import { validateServicePackManifest } from './validate-service-pack';

export interface ServicePackCompilationOutput extends ServicePackCompilationReport {
  humanReadableSummary: string;
}

export function generateCompilationReport(
  manifest: ServicePackManifest,
): ServicePackCompilationOutput {
  const validation = validateServicePackManifest(manifest);
  if (!validation.valid) {
    const messages = validation.issues.map((entry) => `${entry.path}: ${entry.message}`).join('; ');
    throw new Error(`Cannot compile invalid service pack: ${messages}`);
  }

  const dependencyReport = generateDependencyReport(manifest);
  const fingerprint = calculateServicePackFingerprint(manifest);

  const report: ServicePackCompilationOutput = {
    packId: manifest.packId,
    packVersion: manifest.packVersion,
    packName: manifest.packName,
    fingerprint,
    serviceCount: manifest.services.length,
    validatedAt: new Date().toISOString(),
    dependencyReport,
    governanceSummary: {
      nonProduction: [SERVICE_PACK_NON_PRODUCTION_LABEL, SERVICE_PACK_TEMPLATE_ONLY_LABEL].includes(
        manifest.packLabel,
      ),
      activationGovernancePreserved:
        manifest.deploymentIntent.requiresInstitutionalAcceptance &&
        manifest.deploymentIntent.requiresOperationalActivation,
      institutionalAcceptanceRequired: manifest.deploymentIntent.requiresInstitutionalAcceptance,
    },
    services: manifest.services.map((service) => ({
      serviceCode: service.serviceCode,
      serviceName: service.serviceName,
      workflowStageCount: service.workflowStages.length,
      evidenceRequirementCount: service.evidenceRequirements.length,
      authorityFunctionCount: service.authorityFunctions.length,
    })),
    humanReadableSummary: '',
  };

  report.humanReadableSummary = formatCompilationReportHumanReadable(report);

  return report;
}
