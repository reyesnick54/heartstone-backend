import { Injectable } from '@nestjs/common';

import {
  SERVICE_PACK_COMPILATION_CHECK_CODES,
  SERVICE_PACK_ISSUE_SEVERITY,
} from './service-pack.constants';
import {
  type ResolvedServicePackContext,
  type ServicePackCompilationIssue,
  type ServicePackConfigurationConflict,
  type ServicePackManifest,
} from './service-pack.types';

@Injectable()
export class ServicePackConflictDetector {
  detect(
    manifest: ServicePackManifest,
    context: ResolvedServicePackContext,
  ): {
    issues: ServicePackCompilationIssue[];
    conflicts: ServicePackConfigurationConflict[];
  } {
    const issues: ServicePackCompilationIssue[] = [];
    const conflicts: ServicePackConfigurationConflict[] = [];

    const manifestSlugs = new Map<string, string>();
    const manifestCodes = new Map<string, string>();

    for (const service of manifest.services) {
      if (manifestSlugs.has(service.slug)) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.SERVICE_SLUG_COLLISION,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Duplicate service slug "${service.slug}" within manifest`,
          path: `services.${service.code}`,
          entityRef: service.slug,
        });
        const priorCode = manifestSlugs.get(service.slug) ?? service.code;
        conflicts.push({
          kind: 'SERVICE_SLUG',
          message: `Duplicate slug "${service.slug}" within manifest`,
          conflictingRefs: [priorCode, service.code],
        });
      } else {
        manifestSlugs.set(service.slug, service.code);
      }

      if (manifestCodes.has(service.code)) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.CODE_UNIQUENESS,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Duplicate service code "${service.code}" within manifest`,
          path: `services.${service.code}`,
          entityRef: service.code,
        });
      } else {
        manifestCodes.set(service.code, service.code);
      }

      if (context.existingServiceSlugs.has(service.slug)) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.SERVICE_SLUG_COLLISION,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Service slug "${service.slug}" already exists in production catalog`,
          path: `services.${service.code}`,
          entityRef: service.slug,
        });
        conflicts.push({
          kind: 'SERVICE_SLUG',
          message: `Slug "${service.slug}" collides with existing production service`,
          conflictingRefs: [service.slug],
        });
      }

      if (context.existingServiceCodes.has(service.code)) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.CODE_UNIQUENESS,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Service code "${service.code}" already exists in production catalog`,
          path: `services.${service.code}`,
          entityRef: service.code,
        });
      }

      issues.push(...this.detectFeeConflicts(service));
      issues.push(...this.detectOutputConflicts(service));
    }

    return { issues, conflicts };
  }

  private detectFeeConflicts(
    service: ServicePackManifest['services'][number],
  ): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];
    const feeCodes = new Set<string>();

    for (const fee of service.fees ?? []) {
      if (feeCodes.has(fee.code)) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.FEE_DEFINITION_CONFLICTS,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Duplicate fee code "${fee.code}" for service "${service.code}"`,
          path: `services.${service.code}.fees.${fee.code}`,
          entityRef: fee.code,
        });
      }
      feeCodes.add(fee.code);

      if (!fee.isVariable && (fee.amountCents === undefined || fee.amountCents < 0)) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.FEE_DEFINITION_CONFLICTS,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Fixed fee "${fee.code}" requires a non-negative amountCents`,
          path: `services.${service.code}.fees.${fee.code}`,
          entityRef: fee.code,
        });
      }

      if (fee.isVariable && fee.amountCents !== undefined && fee.amountCents < 0) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.FEE_DEFINITION_CONFLICTS,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Variable fee "${fee.code}" has invalid amountCents`,
          path: `services.${service.code}.fees.${fee.code}`,
          entityRef: fee.code,
        });
      }
    }

    return issues;
  }

  private detectOutputConflicts(
    service: ServicePackManifest['services'][number],
  ): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];
    const outputTypes = new Map<string, string>();

    for (const output of service.outputs ?? []) {
      if (output.outputType) {
        const existing = outputTypes.get(output.outputCode);
        if (existing && existing !== output.outputType) {
          issues.push({
            code: SERVICE_PACK_COMPILATION_CHECK_CODES.OUTPUT_TYPE_CONFLICTS,
            severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
            message: `Output "${output.outputCode}" has conflicting types "${existing}" and "${output.outputType}"`,
            path: `services.${service.code}.outputs.${output.outputCode}`,
            entityRef: output.outputCode,
          });
        }
        outputTypes.set(output.outputCode, output.outputType);
      }
    }

    return issues;
  }
}
