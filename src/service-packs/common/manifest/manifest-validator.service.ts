import { Injectable } from '@nestjs/common';

import {
  EXECUTABLE_CODE_PATTERNS,
  FORBIDDEN_MANIFEST_AUTHORITY_TRUST_FIELDS,
  FORBIDDEN_MANIFEST_EXECUTABLE_KEYS,
  SERVICE_PACK_REASON_CODES,
} from '../../service-packs.constants';
import { MANIFEST_CODE_SECTIONS, SUPPORTED_MANIFEST_VERSIONS } from './manifest.constants';
import type {
  ManifestValidationIssue,
  ManifestValidationResult,
  ServicePackManifestV1,
} from './manifest.types';

@Injectable()
export class ManifestValidatorService {
  validateManifest(payload: unknown): ManifestValidationResult {
    const issues: ManifestValidationIssue[] = [];

    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      return this.failed(null, [
        this.issue(
          SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
          '$',
          'Manifest must be a JSON object',
        ),
      ]);
    }

    const manifest = payload as Record<string, unknown>;

    if (typeof manifest.manifestVersion !== 'string') {
      issues.push(
        this.issue(
          SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
          '$.manifestVersion',
          'manifestVersion is required and must be a string',
        ),
      );
    } else if (
      !SUPPORTED_MANIFEST_VERSIONS.includes(
        manifest.manifestVersion as (typeof SUPPORTED_MANIFEST_VERSIONS)[number],
      )
    ) {
      issues.push(
        this.issue(
          SERVICE_PACK_REASON_CODES.UNSUPPORTED_MANIFEST_VERSION,
          '$.manifestVersion',
          `Unsupported manifest version "${manifest.manifestVersion}"`,
        ),
      );
    }

    this.validateServicePackSection(manifest, issues);
    this.validateDuplicateCodes(manifest, issues);
    this.scanForbiddenKeys(manifest, '$', issues);
    this.scanExecutableStrings(manifest, '$', issues);
    this.validateAuthorityMappings(manifest, issues);
    this.validateCrossReferences(manifest, issues);
    this.validateDependencies(manifest, issues);

    const manifestVersion =
      typeof manifest.manifestVersion === 'string' &&
      SUPPORTED_MANIFEST_VERSIONS.includes(
        manifest.manifestVersion as (typeof SUPPORTED_MANIFEST_VERSIONS)[number],
      )
        ? (manifest.manifestVersion as ServicePackManifestV1['manifestVersion'])
        : null;

    return {
      valid: issues.length === 0,
      manifestVersion,
      issues,
    };
  }

  private validateServicePackSection(
    manifest: Record<string, unknown>,
    issues: ManifestValidationIssue[],
  ): void {
    const servicePack = manifest.servicePack;
    if (servicePack === undefined) {
      issues.push(
        this.issue(
          SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
          '$.servicePack',
          'servicePack section is required',
        ),
      );
      return;
    }

    if (typeof servicePack !== 'object' || servicePack === null || Array.isArray(servicePack)) {
      issues.push(
        this.issue(
          SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
          '$.servicePack',
          'servicePack must be an object',
        ),
      );
      return;
    }

    const pack = servicePack as Record<string, unknown>;
    for (const field of ['code', 'name', 'versionLabel'] as const) {
      if (typeof pack[field] !== 'string' || pack[field].trim().length === 0) {
        issues.push(
          this.issue(
            SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
            `$.servicePack.${field}`,
            `${field} is required and must be a non-empty string`,
          ),
        );
      }
    }
  }

  private validateDuplicateCodes(
    manifest: Record<string, unknown>,
    issues: ManifestValidationIssue[],
  ): void {
    const globalCodes = new Map<string, string>();

    for (const section of MANIFEST_CODE_SECTIONS) {
      const value = manifest[section.path];
      if (value === undefined) {
        continue;
      }

      if (section.singular) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          continue;
        }
        const code = (value as Record<string, unknown>)[section.codeField];
        if (typeof code === 'string') {
          this.registerCode(globalCodes, code, `$.${section.path}.${section.codeField}`, issues);
        }
        continue;
      }

      if (!Array.isArray(value)) {
        issues.push(
          this.issue(
            SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
            `$.${section.path}`,
            `${section.path} must be an array when present`,
          ),
        );
        continue;
      }

      const sectionCodes = new Set<string>();
      value.forEach((item, index) => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          issues.push(
            this.issue(
              SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
              `$.${section.path}[${String(index)}]`,
              'Array entries must be objects',
            ),
          );
          return;
        }
        const code = (item as Record<string, unknown>)[section.codeField];
        if (typeof code !== 'string' || code.trim().length === 0) {
          issues.push(
            this.issue(
              SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
              `$.${section.path}[${String(index)}].${section.codeField}`,
              `${section.codeField} is required and must be a non-empty string`,
            ),
          );
          return;
        }
        if (sectionCodes.has(code)) {
          issues.push(
            this.issue(
              SERVICE_PACK_REASON_CODES.DUPLICATE_CODE,
              `$.${section.path}[${String(index)}].${section.codeField}`,
              `Duplicate code "${code}" within ${section.path}`,
            ),
          );
        }
        sectionCodes.add(code);
        this.registerCode(
          globalCodes,
          code,
          `$.${section.path}[${String(index)}].${section.codeField}`,
          issues,
        );
      });
    }
  }

  private registerCode(
    globalCodes: Map<string, string>,
    code: string,
    path: string,
    issues: ManifestValidationIssue[],
  ): void {
    const existingPath = globalCodes.get(code);
    if (existingPath) {
      issues.push(
        this.issue(
          SERVICE_PACK_REASON_CODES.DUPLICATE_CODE,
          path,
          `Duplicate code "${code}" already declared at ${existingPath}`,
        ),
      );
      return;
    }
    globalCodes.set(code, path);
  }

  private scanForbiddenKeys(value: unknown, path: string, issues: ManifestValidationIssue[]): void {
    if (value === null || typeof value !== 'object') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        this.scanForbiddenKeys(entry, `${path}[${String(index)}]`, issues);
      });
      return;
    }

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const childPath = `${path}.${key}`;

      if (
        FORBIDDEN_MANIFEST_EXECUTABLE_KEYS.includes(
          key as (typeof FORBIDDEN_MANIFEST_EXECUTABLE_KEYS)[number],
        )
      ) {
        issues.push(
          this.issue(
            SERVICE_PACK_REASON_CODES.EXECUTABLE_CODE_FORBIDDEN,
            childPath,
            `Forbidden executable key "${key}" is not permitted in service pack manifests`,
          ),
        );
      }

      if (FORBIDDEN_MANIFEST_AUTHORITY_TRUST_FIELDS.includes(key as never)) {
        issues.push(
          this.issue(
            SERVICE_PACK_REASON_CODES.AUTHORITY_AUTO_VALID_FORBIDDEN,
            childPath,
            `Manifest may not declare authority trust field "${key}"`,
          ),
        );
      }

      this.scanForbiddenKeys(entry, childPath, issues);
    }
  }

  private scanExecutableStrings(
    value: unknown,
    path: string,
    issues: ManifestValidationIssue[],
  ): void {
    if (typeof value === 'string') {
      for (const pattern of EXECUTABLE_CODE_PATTERNS) {
        if (pattern.test(value)) {
          issues.push(
            this.issue(
              SERVICE_PACK_REASON_CODES.EXECUTABLE_CODE_FORBIDDEN,
              path,
              'Executable code patterns are forbidden in manifest string values',
            ),
          );
          return;
        }
      }
      return;
    }

    if (value === null || typeof value !== 'object') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        this.scanExecutableStrings(entry, `${path}[${String(index)}]`, issues);
      });
      return;
    }

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      this.scanExecutableStrings(entry, `${path}.${key}`, issues);
    }
  }

  private validateAuthorityMappings(
    manifest: Record<string, unknown>,
    issues: ManifestValidationIssue[],
  ): void {
    const mappings = manifest.authorityMappings;
    if (mappings === undefined) {
      return;
    }

    if (!Array.isArray(mappings)) {
      issues.push(
        this.issue(
          SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
          '$.authorityMappings',
          'authorityMappings must be an array when present',
        ),
      );
      return;
    }

    mappings.forEach((mapping, index) => {
      if (typeof mapping !== 'object' || mapping === null || Array.isArray(mapping)) {
        issues.push(
          this.issue(
            SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
            `$.authorityMappings[${String(index)}]`,
            'Authority mapping entries must be objects',
          ),
        );
        return;
      }

      const record = mapping as Record<string, unknown>;
      for (const field of ['code', 'serviceCode', 'functionAuthorityRecordCode'] as const) {
        if (typeof record[field] !== 'string' || record[field].trim().length === 0) {
          issues.push(
            this.issue(
              SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
              `$.authorityMappings[${String(index)}].${field}`,
              `${field} is required and must reference an existing FunctionAuthorityRecord code`,
            ),
          );
        }
      }

      if (
        typeof record.governingSourceCode === 'string' &&
        (record.governingSourceAuthenticated === true || record.isValid === true)
      ) {
        issues.push(
          this.issue(
            SERVICE_PACK_REASON_CODES.MANIFEST_AUTHORITY_NOT_TRUSTED,
            `$.authorityMappings[${String(index)}]`,
            'Governing source authenticity cannot be declared by manifest upload',
          ),
        );
      }
    });
  }

  private validateCrossReferences(
    manifest: Record<string, unknown>,
    issues: ManifestValidationIssue[],
  ): void {
    const serviceCodes = new Set<string>();
    const services = manifest.services;
    if (Array.isArray(services)) {
      for (const service of services) {
        if (typeof service === 'object' && service !== null && !Array.isArray(service)) {
          const code = (service as Record<string, unknown>).code;
          if (typeof code === 'string') {
            serviceCodes.add(code);
          }
        }
      }
    }

    const mappings = manifest.authorityMappings;
    if (!Array.isArray(mappings)) {
      return;
    }

    mappings.forEach((mapping, index) => {
      if (typeof mapping !== 'object' || mapping === null || Array.isArray(mapping)) {
        return;
      }
      const serviceCode = (mapping as Record<string, unknown>).serviceCode;
      if (typeof serviceCode === 'string' && !serviceCodes.has(serviceCode)) {
        issues.push(
          this.issue(
            SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
            `$.authorityMappings[${String(index)}].serviceCode`,
            `Unknown serviceCode "${serviceCode}" — must reference a declared service`,
          ),
        );
      }
    });
  }

  private validateDependencies(
    manifest: Record<string, unknown>,
    issues: ManifestValidationIssue[],
  ): void {
    const dependencies = manifest.dependencies;
    if (dependencies === undefined) {
      return;
    }

    if (!Array.isArray(dependencies)) {
      issues.push(
        this.issue(
          SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
          '$.dependencies',
          'dependencies must be an array when present',
        ),
      );
      return;
    }

    dependencies.forEach((dependency, index) => {
      if (typeof dependency !== 'object' || dependency === null || Array.isArray(dependency)) {
        issues.push(
          this.issue(
            SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
            `$.dependencies[${String(index)}]`,
            'Dependency entries must be objects',
          ),
        );
        return;
      }

      const record = dependency as Record<string, unknown>;
      for (const field of ['dependencyCode', 'dependencyKind', 'referenceKind'] as const) {
        if (typeof record[field] !== 'string' || record[field].trim().length === 0) {
          issues.push(
            this.issue(
              SERVICE_PACK_REASON_CODES.MALFORMED_MANIFEST,
              `$.dependencies[${String(index)}].${field}`,
              `${field} is required`,
            ),
          );
        }
      }

      const controlScope = record.controlScope;
      const dependencyKind = record.dependencyKind;
      if (
        controlScope === 'HEARTSTONE_CONTROLLED' &&
        typeof dependencyKind === 'string' &&
        [
          'EXTERNAL_AUTHORITY',
          'EXTERNAL_REGISTRY',
          'PAYMENT_PROVIDER',
          'IDENTITY_PROVIDER',
          'INTEGRATION',
          'PROFESSIONAL',
        ].includes(dependencyKind)
      ) {
        issues.push(
          this.issue(
            SERVICE_PACK_REASON_CODES.EXTERNAL_DEPENDENCY_FALSELY_CONTROLLED,
            `$.dependencies[${String(index)}].controlScope`,
            `External dependency kind "${dependencyKind}" cannot be marked HEARTSTONE_CONTROLLED`,
          ),
        );
      }
    });
  }

  private issue(code: string, path: string, message: string): ManifestValidationIssue {
    return { code, path, message };
  }

  private failed(
    manifestVersion: ManifestValidationResult['manifestVersion'],
    issues: ManifestValidationIssue[],
  ): ManifestValidationResult {
    return {
      valid: false,
      manifestVersion,
      issues,
    };
  }
}
