import { type ServicePackDependencyReport, type ServicePackManifest } from './service-pack.types';

export function generateDependencyReport(
  manifest: ServicePackManifest,
): ServicePackDependencyReport {
  const authorityFunctionCodes = new Set<string>();
  const externalIntegrations = new Set<string>();
  const crossServiceDependencies = new Set<string>();
  const formCodes = new Set<string>();
  const evidenceCodes = new Set<string>();
  const communicationTemplateCodes = new Set<string>();

  for (const service of manifest.services) {
    for (const fn of service.authorityFunctions) {
      authorityFunctionCodes.add(fn.functionCode);
    }

    for (const form of service.forms) {
      formCodes.add(form.formCode);
    }

    for (const evidence of service.evidenceRequirements) {
      evidenceCodes.add(evidence.evidenceCode);
    }

    for (const communication of service.communications) {
      communicationTemplateCodes.add(communication.templateCode);
    }

    for (const dependency of service.dependencies) {
      crossServiceDependencies.add(dependency.dependencyCode);
      if (dependency.externalIntegrationCode) {
        externalIntegrations.add(dependency.externalIntegrationCode);
      }
    }

    if (service.lifecycle.renewalServiceCode) {
      crossServiceDependencies.add(service.lifecycle.renewalServiceCode);
    }
  }

  return {
    packId: manifest.packId,
    packVersion: manifest.packVersion,
    authorityFunctionCodes: [...authorityFunctionCodes].sort(),
    externalIntegrations: [...externalIntegrations].sort(),
    crossServiceDependencies: [...crossServiceDependencies].sort(),
    formCodes: [...formCodes].sort(),
    evidenceCodes: [...evidenceCodes].sort(),
    communicationTemplateCodes: [...communicationTemplateCodes].sort(),
  };
}
