import { BadRequestException, Injectable } from '@nestjs/common';

import {
  SERVICE_PACK_CRITICAL_CHECK_CODES,
  SERVICE_PACK_MANIFEST_VERSION,
} from './service-pack.constants';
import {
  type ServicePackCompilationResult,
  type ServicePackManifest,
  type ServicePackReadinessSummary,
} from './service-pack.types';
import { buildServicePackCompilationResult } from './service-pack-compilation-result';
import { ServicePackConflictDetector } from './service-pack-conflict-detector.service';
import { ServicePackDependencyResolver } from './service-pack-dependency-resolver.service';
import { buildServicePackConfigurationFingerprint } from './service-pack-fingerprint.util';
import { ServicePackValidationService } from './service-pack-validation.service';

@Injectable()
export class ServicePackCompilerService {
  constructor(
    private readonly dependencyResolver: ServicePackDependencyResolver,
    private readonly conflictDetector: ServicePackConflictDetector,
    private readonly validationService: ServicePackValidationService,
  ) {}

  /**
   * Dry-run compilation: validates a service pack manifest against existing
   * government domains without mutating production configuration.
   */
  async compile(manifest: ServicePackManifest): Promise<ServicePackCompilationResult> {
    this.assertManifestStructure(manifest);

    const configurationFingerprint = buildServicePackConfigurationFingerprint(manifest);
    const { context, dependencies } = await this.dependencyResolver.resolve(manifest);
    const { issues: conflictIssues, conflicts } = this.conflictDetector.detect(manifest, context);
    const {
      errors: validationErrors,
      warnings,
      authorityIssues,
    } = this.validationService.validate(manifest, context, dependencies);

    const errors = [
      ...validationErrors,
      ...conflictIssues.filter((issue) => issue.severity === 'ERROR'),
    ];
    const allWarnings = [
      ...warnings,
      ...conflictIssues.filter((issue) => issue.severity === 'WARNING'),
    ];

    const unresolvedDependencies = dependencies.filter((dependency) => !dependency.resolved);
    const integrationCount = new Set(
      manifest.services.flatMap((service) => service.integrationCodes ?? []),
    ).size;

    const readinessSummary = this.buildReadinessSummary(errors, allWarnings, authorityIssues);

    return buildServicePackCompilationResult({
      packCode: manifest.packCode,
      configurationFingerprint,
      errors,
      warnings: allWarnings,
      dependencies,
      unresolvedDependencies,
      authorityIssues,
      configurationConflicts: conflicts,
      serviceCount: manifest.services.length,
      formCount: manifest.forms?.length ?? 0,
      workflowCount: manifest.workflows?.length ?? 0,
      integrationCount,
      readinessSummary,
    });
  }

  private assertManifestStructure(manifest: ServicePackManifest): void {
    if (manifest.manifestVersion !== SERVICE_PACK_MANIFEST_VERSION) {
      throw new BadRequestException(
        `Unsupported manifest version "${manifest.manifestVersion}". Expected "${SERVICE_PACK_MANIFEST_VERSION}".`,
      );
    }

    if (!manifest.packCode.trim()) {
      throw new BadRequestException('Manifest packCode is required');
    }

    if (!manifest.institutionCode.trim()) {
      throw new BadRequestException('Manifest institutionCode is required');
    }

    if (!Array.isArray(manifest.services) || manifest.services.length === 0) {
      throw new BadRequestException('Manifest must include at least one service');
    }
  }

  private buildReadinessSummary(
    errors: { code: string }[],
    warnings: unknown[],
    authorityIssues: unknown[],
  ): ServicePackReadinessSummary {
    const criticalIssues = errors.filter((error) =>
      SERVICE_PACK_CRITICAL_CHECK_CODES.includes(
        error.code as (typeof SERVICE_PACK_CRITICAL_CHECK_CODES)[number],
      ),
    ).length;

    const hasCriticalAuthorityOrDependency = criticalIssues > 0 || authorityIssues.length > 0;

    let safeHaltReason: string | undefined;
    if (hasCriticalAuthorityOrDependency) {
      safeHaltReason = 'Unresolved critical authority or dependency conditions prevent deployment';
    } else if (errors.length > 0) {
      safeHaltReason = 'Compilation errors prevent deployment';
    }

    return {
      deployable: errors.length === 0 && authorityIssues.length === 0,
      criticalIssues,
      errorCount: errors.length,
      warningCount: warnings.length,
      safeHaltReason,
    };
  }
}
