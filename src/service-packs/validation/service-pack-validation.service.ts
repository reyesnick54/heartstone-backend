import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ServicePackComponentKind,
  ServicePackDependencyControlScope,
  ServicePackDependencyKind,
  ServicePackImportStatus,
  ServicePackManifestValidationStatus,
  ServicePackValidationOutcome,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type { ManifestDependency } from '../common/manifest/manifest.types';
import { computeManifestChecksum } from '../common/manifest/manifest-checksum.util';
import { ManifestValidatorService } from '../common/manifest/manifest-validator.service';
import { ServicePacksBoundaryService } from '../common/service-packs-boundary.service';
import { SERVICE_PACK_REASON_CODES } from '../service-packs.constants';

export interface ValidateServicePackVersionRequest {
  servicePackVersionId: string;
  importId?: string;
  validatedByIdentityId?: string;
}

export interface ServicePackValidationResponse {
  outcome: ServicePackValidationOutcome;
  issues: { code: string; path: string; message: string }[];
  manifestChecksum: string;
  manifestValidationStatus: ServicePackManifestValidationStatus;
}

@Injectable()
export class ServicePackValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly manifestValidator: ManifestValidatorService,
    private readonly boundary: ServicePacksBoundaryService,
  ) {}

  async validateVersion(
    request: ValidateServicePackVersionRequest,
  ): Promise<ServicePackValidationResponse> {
    const version = await this.prisma.servicePackVersion.findUnique({
      where: { id: request.servicePackVersionId },
      include: { servicePack: true },
    });

    if (!version) {
      throw new NotFoundException(`Service pack version ${request.servicePackVersionId} not found`);
    }

    this.boundary.assertAcceptedVersionImmutable(version.immutable, version.status);
    this.boundary.assertValidationDoesNotActivateServices(undefined);
    this.boundary.assertValidationDoesNotCreateDecisions({});

    const manifestPayload = version.manifest;
    const schemaResult = this.manifestValidator.validateManifest(manifestPayload);
    const dependencyIssues = await this.validateDependencyReferences(manifestPayload);
    const allIssues = [...schemaResult.issues, ...dependencyIssues];
    const outcome =
      allIssues.length === 0
        ? ServicePackValidationOutcome.PASSED
        : ServicePackValidationOutcome.FAILED;
    const nextValidationStatus =
      outcome === ServicePackValidationOutcome.PASSED
        ? ServicePackManifestValidationStatus.VALIDATED
        : ServicePackManifestValidationStatus.INVALID;
    const manifestChecksum = computeManifestChecksum(manifestPayload);

    await this.prisma.$transaction(async (tx) => {
      await tx.servicePackVersion.update({
        where: { id: version.id },
        data: { manifestValidationStatus: nextValidationStatus, manifestChecksum },
      });

      await tx.servicePackValidationResult.create({
        data: {
          servicePackVersionId: version.id,
          importId: request.importId,
          outcome,
          issues: allIssues as unknown as Prisma.InputJsonValue,
          manifestVersion: version.manifestVersion,
          manifestChecksum,
          validatedByIdentityId: request.validatedByIdentityId,
        },
      });

      if (request.importId) {
        await tx.servicePackImport.update({
          where: { id: request.importId },
          data: {
            status:
              outcome === ServicePackValidationOutcome.PASSED
                ? ServicePackImportStatus.VALIDATED
                : ServicePackImportStatus.REJECTED,
          },
        });
      }

      if (outcome === ServicePackValidationOutcome.PASSED) {
        await this.syncValidatedArtifacts(tx, version.id, manifestPayload);
      }
    });

    return {
      outcome,
      issues: allIssues,
      manifestChecksum,
      manifestValidationStatus: nextValidationStatus,
    };
  }

  private async validateDependencyReferences(
    manifestPayload: unknown,
  ): Promise<{ code: string; path: string; message: string }[]> {
    if (manifestPayload === null || typeof manifestPayload !== 'object') {
      return [];
    }

    const manifest = manifestPayload as Record<string, unknown>;
    const dependencies = manifest.dependencies;
    if (!Array.isArray(dependencies)) {
      return [];
    }

    const issues: { code: string; path: string; message: string }[] = [];

    for (let index = 0; index < dependencies.length; index += 1) {
      const dependency: unknown = dependencies[index];
      if (typeof dependency !== 'object' || dependency === null || Array.isArray(dependency)) {
        continue;
      }

      const record = dependency as ManifestDependency;
      const path = `$.dependencies[${String(index)}]`;

      if (record.referenceId) {
        const exists = await this.referenceExists(record.referenceKind, record.referenceId);
        if (!exists) {
          issues.push({
            code: SERVICE_PACK_REASON_CODES.DEPENDENCY_REFERENCE_INVALID,
            path,
            message: `Dependency reference ${record.referenceKind}:${record.referenceId} was not found`,
          });
        }
      }

      if (record.referenceKind === 'function-authority-record' && record.referenceCode) {
        const far = await this.prisma.functionAuthorityRecord.findUnique({
          where: { code: record.referenceCode },
          select: { id: true },
        });
        if (!far) {
          issues.push({
            code: SERVICE_PACK_REASON_CODES.DEPENDENCY_REFERENCE_INVALID,
            path,
            message: `FunctionAuthorityRecord code "${record.referenceCode}" was not found`,
          });
        }
      }

      if (record.referenceKind === 'department' && record.referenceId) {
        const department = await this.prisma.department.findUnique({
          where: { id: record.referenceId },
          select: { id: true },
        });
        if (!department) {
          issues.push({
            code: SERVICE_PACK_REASON_CODES.DEPENDENCY_REFERENCE_INVALID,
            path,
            message: `Department reference ${record.referenceId} was not found`,
          });
        }
      }
    }

    const authorityMappings = manifest.authorityMappings;
    if (Array.isArray(authorityMappings)) {
      for (let index = 0; index < authorityMappings.length; index += 1) {
        const mapping: unknown = authorityMappings[index];
        if (typeof mapping !== 'object' || mapping === null || Array.isArray(mapping)) {
          continue;
        }
        const farCode = (mapping as Record<string, unknown>).functionAuthorityRecordCode;
        if (typeof farCode !== 'string') {
          continue;
        }
        const far = await this.prisma.functionAuthorityRecord.findUnique({
          where: { code: farCode },
          select: { id: true },
        });
        if (!far) {
          issues.push({
            code: SERVICE_PACK_REASON_CODES.DEPENDENCY_REFERENCE_INVALID,
            path: `$.authorityMappings[${String(index)}].functionAuthorityRecordCode`,
            message: `FunctionAuthorityRecord code "${farCode}" must bind to an existing authenticated governing-source record`,
          });
        }
      }
    }

    return issues;
  }

  private async referenceExists(referenceKind: string, referenceId: string): Promise<boolean> {
    switch (referenceKind) {
      case 'department':
        return !!(await this.prisma.department.findUnique({
          where: { id: referenceId },
          select: { id: true },
        }));
      case 'institution':
        return !!(await this.prisma.institution.findUnique({
          where: { id: referenceId },
          select: { id: true },
        }));
      case 'function-authority-record':
        return !!(await this.prisma.functionAuthorityRecord.findUnique({
          where: { id: referenceId },
          select: { id: true },
        }));
      case 'external-authority':
        return !!(await this.prisma.externalAuthority.findUnique({
          where: { id: referenceId },
          select: { id: true },
        }));
      default:
        return false;
    }
  }

  private async syncValidatedArtifacts(
    tx: Pick<PrismaService, 'servicePackComponent' | 'servicePackDependency'>,
    servicePackVersionId: string,
    manifestPayload: unknown,
  ): Promise<void> {
    if (manifestPayload === null || typeof manifestPayload !== 'object') {
      return;
    }

    const manifest = manifestPayload as Record<string, unknown>;

    await tx.servicePackComponent.deleteMany({ where: { servicePackVersionId } });
    await tx.servicePackDependency.deleteMany({ where: { servicePackVersionId } });

    const componentEntries: {
      componentKind: ServicePackComponentKind;
      componentCode: string;
      manifestPath: string;
      configuration: Record<string, unknown>;
    }[] = [];

    const pushSection = (
      sectionKey: string,
      items: unknown[] | undefined,
      kind: ServicePackComponentKind,
    ) => {
      if (!Array.isArray(items)) {
        return;
      }
      items.forEach((item, index) => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          return;
        }
        const code = (item as Record<string, unknown>).code;
        if (typeof code !== 'string') {
          return;
        }
        componentEntries.push({
          componentKind: kind,
          componentCode: code,
          manifestPath: `$.${sectionKey}[${String(index)}]`,
          configuration: item as Record<string, unknown>,
        });
      });
    };

    pushSection('services', manifest.services as unknown[], ServicePackComponentKind.SERVICE);
    pushSection('forms', manifest.forms as unknown[], ServicePackComponentKind.FORM);
    pushSection(
      'authorityMappings',
      manifest.authorityMappings as unknown[],
      ServicePackComponentKind.AUTHORITY_MAPPING,
    );
    pushSection(
      'evidenceRequirements',
      manifest.evidenceRequirements as unknown[],
      ServicePackComponentKind.EVIDENCE_REQUIREMENT,
    );
    pushSection('workflows', manifest.workflows as unknown[], ServicePackComponentKind.WORKFLOW);
    pushSection('fees', manifest.fees as unknown[], ServicePackComponentKind.FEE);
    pushSection('outputs', manifest.outputs as unknown[], ServicePackComponentKind.OUTPUT);
    pushSection('slaRules', manifest.slaRules as unknown[], ServicePackComponentKind.SLA_RULE);
    pushSection(
      'communications',
      manifest.communications as unknown[],
      ServicePackComponentKind.COMMUNICATION,
    );
    pushSection(
      'integrations',
      manifest.integrations as unknown[],
      ServicePackComponentKind.INTEGRATION,
    );
    pushSection('renewals', manifest.renewals as unknown[], ServicePackComponentKind.RENEWAL);
    pushSection(
      'compliance',
      manifest.compliance as unknown[],
      ServicePackComponentKind.COMPLIANCE,
    );
    pushSection('redress', manifest.redress as unknown[], ServicePackComponentKind.REDRESS);
    pushSection(
      'dashboardDefinitions',
      manifest.dashboardDefinitions as unknown[],
      ServicePackComponentKind.DASHBOARD_DEFINITION,
    );

    if (componentEntries.length > 0) {
      await tx.servicePackComponent.createMany({
        data: componentEntries.map((entry) => ({
          servicePackVersionId,
          componentKind: entry.componentKind,
          componentCode: entry.componentCode,
          manifestPath: entry.manifestPath,
          configuration: entry.configuration as Prisma.InputJsonValue,
        })),
      });
    }

    const dependencies = manifest.dependencies;
    if (Array.isArray(dependencies)) {
      const dependencyRows = dependencies
        .map((dependency, index) => {
          if (typeof dependency !== 'object' || dependency === null || Array.isArray(dependency)) {
            return null;
          }
          const record = dependency as ManifestDependency;
          if (typeof record.dependencyCode !== 'string') {
            return null;
          }
          return {
            servicePackVersionId,
            dependencyKind: record.dependencyKind as ServicePackDependencyKind,
            dependencyCode: record.dependencyCode,
            referenceKind: record.referenceKind,
            referenceId: record.referenceId ?? null,
            referenceCode: record.referenceCode ?? null,
            controlScope:
              record.controlScope === 'HEARTSTONE_CONTROLLED'
                ? ServicePackDependencyControlScope.HEARTSTONE_CONTROLLED
                : ServicePackDependencyControlScope.EXTERNAL,
            isRequired: record.isRequired ?? true,
            manifestPath: `$.dependencies[${String(index)}]`,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (dependencyRows.length > 0) {
        await tx.servicePackDependency.createMany({ data: dependencyRows });
      }
    }
  }
}
