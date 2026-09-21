import { Injectable } from '@nestjs/common';

import {
  SERVICE_PACK_COMPILATION_CHECK_CODES,
  SERVICE_PACK_FORBIDDEN_MANIFEST_FIELDS,
  SERVICE_PACK_ISSUE_SEVERITY,
  SERVICE_PACK_SUPPORTED_DATA_CLASSIFICATIONS,
} from './service-pack.constants';
import {
  type ResolvedServicePackContext,
  type ServicePackAuthorityIssue,
  type ServicePackCompilationIssue,
  type ServicePackDependencyEntry,
  type ServicePackManifest,
} from './service-pack.types';
import { validateServicePackFormManifest } from './service-pack-form-validator.util';
import { validateServicePackWorkflowManifest } from './service-pack-workflow-validator.util';

@Injectable()
export class ServicePackValidationService {
  validate(
    manifest: ServicePackManifest,
    context: ResolvedServicePackContext,
    dependencies: ServicePackDependencyEntry[],
  ): {
    errors: ServicePackCompilationIssue[];
    warnings: ServicePackCompilationIssue[];
    authorityIssues: ServicePackAuthorityIssue[];
  } {
    const errors: ServicePackCompilationIssue[] = [];
    const warnings: ServicePackCompilationIssue[] = [];
    const authorityIssues: ServicePackAuthorityIssue[] = [];

    errors.push(...this.validateForbiddenFields(manifest));
    errors.push(...this.validateReferentialIntegrity(manifest, context, dependencies));
    errors.push(...this.validateDepartmentOwnership(manifest, context));
    errors.push(...this.validateAuthorityMappings(manifest, context, authorityIssues));
    errors.push(...this.validateGoverningSources(manifest, context, authorityIssues));
    errors.push(...this.validateCrossInstitutionReferences(manifest, context));
    errors.push(...this.validateEvidenceRequirements(manifest));
    errors.push(...this.validateRedressRoutes(manifest));
    errors.push(...this.validateSlaConfiguration(manifest));
    errors.push(...this.validateDataClassifications(manifest));
    errors.push(...this.validateIntegrationDependencies(manifest, context));
    errors.push(...this.validateExternalAuthorityDependencies(manifest, context));

    for (const form of manifest.forms ?? []) {
      errors.push(...validateServicePackFormManifest(form, `forms.${form.code}`));
    }

    const resolvedFunctionCodes = new Set(context.functionAuthorityIds.keys());
    for (const workflow of manifest.workflows ?? []) {
      errors.push(
        ...validateServicePackWorkflowManifest(
          workflow,
          resolvedFunctionCodes,
          `workflows.${workflow.code}`,
        ),
      );
    }

    if (!context.jurisdictionId) {
      errors.push({
        code: SERVICE_PACK_COMPILATION_CHECK_CODES.REFERENTIAL_INTEGRITY,
        severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
        message: `Jurisdiction "${manifest.jurisdictionCode}" was not found`,
        path: 'jurisdictionCode',
        entityRef: manifest.jurisdictionCode,
      });
    }

    if (!context.institutionId) {
      errors.push({
        code: SERVICE_PACK_COMPILATION_CHECK_CODES.REFERENTIAL_INTEGRITY,
        severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
        message: `Institution "${manifest.institutionCode}" was not found or is inactive`,
        path: 'institutionCode',
        entityRef: manifest.institutionCode,
      });
    }

    return { errors, warnings, authorityIssues };
  }

  private validateForbiddenFields(manifest: ServicePackManifest): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];
    const manifestRecord = manifest as unknown as Record<string, unknown>;

    for (const field of SERVICE_PACK_FORBIDDEN_MANIFEST_FIELDS) {
      if (manifestRecord[field] !== undefined) {
        issues.push({
          code:
            field.includes('Authority') || field.includes('create')
              ? SERVICE_PACK_COMPILATION_CHECK_CODES.AUTHORITY_CREATION_FORBIDDEN
              : SERVICE_PACK_COMPILATION_CHECK_CODES.ACTIVATION_BYPASS_FORBIDDEN,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Manifest must not include forbidden field "${field}"`,
          path: field,
        });
      }
    }

    for (const service of manifest.services) {
      const serviceRecord = service as unknown as Record<string, unknown>;
      for (const field of SERVICE_PACK_FORBIDDEN_MANIFEST_FIELDS) {
        if (serviceRecord[field] !== undefined) {
          issues.push({
            code:
              field.includes('Authority') || field.includes('create')
                ? SERVICE_PACK_COMPILATION_CHECK_CODES.AUTHORITY_CREATION_FORBIDDEN
                : SERVICE_PACK_COMPILATION_CHECK_CODES.ACTIVATION_BYPASS_FORBIDDEN,
            severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
            message: `Service "${service.code}" must not include forbidden field "${field}"`,
            path: `services.${service.code}.${field}`,
          });
        }
      }
    }

    return issues;
  }

  private validateReferentialIntegrity(
    manifest: ServicePackManifest,
    context: ResolvedServicePackContext,
    dependencies: ServicePackDependencyEntry[],
  ): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];

    for (const dependency of dependencies) {
      if (!dependency.resolved) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.REFERENTIAL_INTEGRITY,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Unresolved ${dependency.kind} reference "${dependency.ref}"`,
          path: dependency.kind,
          entityRef: dependency.ref,
        });
      }
    }

    for (const service of manifest.services) {
      if (!context.serviceFamilyIds.has(service.serviceFamilyCode)) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.REFERENTIAL_INTEGRITY,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Service family "${service.serviceFamilyCode}" not found for service "${service.code}"`,
          path: `services.${service.code}.serviceFamilyCode`,
          entityRef: service.serviceFamilyCode,
        });
      }

      if (service.formCode && !context.formDefinitionIds.has(service.formCode)) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.REFERENTIAL_INTEGRITY,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Form definition "${service.formCode}" not found for service "${service.code}"`,
          path: `services.${service.code}.formCode`,
          entityRef: service.formCode,
        });
      }

      if (service.workflowCode && !context.workflowDefinitionIds.has(service.workflowCode)) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.REFERENTIAL_INTEGRITY,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Workflow definition "${service.workflowCode}" not found for service "${service.code}"`,
          path: `services.${service.code}.workflowCode`,
          entityRef: service.workflowCode,
        });
      }
    }

    return issues;
  }

  private validateDepartmentOwnership(
    manifest: ServicePackManifest,
    context: ResolvedServicePackContext,
  ): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];

    for (const service of manifest.services) {
      if (!context.departmentIds.has(service.departmentCode)) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.DEPARTMENT_OWNERSHIP,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Department "${service.departmentCode}" not found or inactive for institution "${manifest.institutionCode}"`,
          path: `services.${service.code}.departmentCode`,
          entityRef: service.departmentCode,
        });
      }
    }

    return issues;
  }

  private validateAuthorityMappings(
    manifest: ServicePackManifest,
    context: ResolvedServicePackContext,
    authorityIssues: ServicePackAuthorityIssue[],
  ): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];

    for (const service of manifest.services) {
      if (service.functionAuthorityCodes.length === 0) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.AUTHORITY_MAPPING_EXISTENCE,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Service "${service.code}" requires at least one function authority mapping`,
          path: `services.${service.code}.functionAuthorityCodes`,
        });
        continue;
      }

      for (const code of service.functionAuthorityCodes) {
        if (!context.functionAuthorityIds.has(code)) {
          issues.push({
            code: SERVICE_PACK_COMPILATION_CHECK_CODES.AUTHORITY_MAPPING_EXISTENCE,
            severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
            message: `Function authority "${code}" not found or inactive for service "${service.code}"`,
            path: `services.${service.code}.functionAuthorityCodes`,
            entityRef: code,
          });
          authorityIssues.push({
            functionAuthorityCode: code,
            message: `Function authority "${code}" is missing or inactive`,
          });
        }
      }
    }

    return issues;
  }

  private validateGoverningSources(
    manifest: ServicePackManifest,
    context: ResolvedServicePackContext,
    authorityIssues: ServicePackAuthorityIssue[],
  ): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];

    for (const service of manifest.services) {
      for (const code of service.governingSourceCodes) {
        if (!context.governingSourceIds.has(code)) {
          issues.push({
            code: SERVICE_PACK_COMPILATION_CHECK_CODES.GOVERNING_SOURCE_AUTHENTICATION,
            severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
            message: `Governing source "${code}" is not authenticated or not found for service "${service.code}"`,
            path: `services.${service.code}.governingSourceCodes`,
            entityRef: code,
          });
          authorityIssues.push({
            governingSourceCode: code,
            message: `Governing source "${code}" is unauthenticated or missing`,
          });
        }
      }
    }

    return issues;
  }

  private validateCrossInstitutionReferences(
    manifest: ServicePackManifest,
    context: ResolvedServicePackContext,
  ): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];

    for (const service of manifest.services) {
      for (const integrationCode of service.integrationCodes ?? []) {
        if (!context.integrationIds.has(integrationCode)) {
          issues.push({
            code: SERVICE_PACK_COMPILATION_CHECK_CODES.CROSS_INSTITUTION_REFERENCE,
            severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
            message: `Integration "${integrationCode}" is not available within institution "${manifest.institutionCode}"`,
            path: `services.${service.code}.integrationCodes`,
            entityRef: integrationCode,
          });
        }
      }

      for (const dashboardCode of service.dashboardCodes ?? []) {
        if (!context.dashboardIds.has(dashboardCode)) {
          issues.push({
            code: SERVICE_PACK_COMPILATION_CHECK_CODES.CROSS_INSTITUTION_REFERENCE,
            severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
            message: `Dashboard "${dashboardCode}" is not available within institution "${manifest.institutionCode}"`,
            path: `services.${service.code}.dashboardCodes`,
            entityRef: dashboardCode,
          });
        }
      }
    }

    return issues;
  }

  private validateEvidenceRequirements(
    manifest: ServicePackManifest,
  ): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];

    for (const service of manifest.services) {
      const declaredRefs = new Set(service.evidenceRequirementRefs ?? []);

      for (const item of service.checklistItems ?? []) {
        if (item.evidenceRequirementRef && !declaredRefs.has(item.evidenceRequirementRef)) {
          issues.push({
            code: SERVICE_PACK_COMPILATION_CHECK_CODES.MISSING_EVIDENCE_REQUIREMENT_REFERENCES,
            severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
            message: `Checklist item "${item.itemCode}" references undeclared evidence requirement "${item.evidenceRequirementRef}"`,
            path: `services.${service.code}.checklistItems.${item.itemCode}`,
            entityRef: item.evidenceRequirementRef,
          });
        }
      }

      for (const ref of service.evidenceRequirementRefs ?? []) {
        if (!ref.trim()) {
          issues.push({
            code: SERVICE_PACK_COMPILATION_CHECK_CODES.MISSING_EVIDENCE_REQUIREMENT_REFERENCES,
            severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
            message: `Empty evidence requirement reference in service "${service.code}"`,
            path: `services.${service.code}.evidenceRequirementRefs`,
          });
        }
      }

      if ((service.checklistItems?.length ?? 0) > 0 && declaredRefs.size === 0) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.MISSING_EVIDENCE_REQUIREMENT_REFERENCES,
          severity: SERVICE_PACK_ISSUE_SEVERITY.WARNING,
          message: `Service "${service.code}" has checklist items but no evidence requirement references declared`,
          path: `services.${service.code}.evidenceRequirementRefs`,
        });
      }
    }

    return issues;
  }

  private validateRedressRoutes(manifest: ServicePackManifest): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];

    for (const service of manifest.services) {
      for (const route of service.redressRoutes ?? []) {
        if (!route.label.trim()) {
          issues.push({
            code: SERVICE_PACK_COMPILATION_CHECK_CODES.REDRESS_ROUTE_COMPLETENESS,
            severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
            message: `Redress route "${route.routeCode}" missing label for service "${service.code}"`,
            path: `services.${service.code}.redressRoutes.${route.routeCode}`,
            entityRef: route.routeCode,
          });
        }

        if (!route.contactReference?.trim() && !(route.escalationSteps?.length ?? 0)) {
          issues.push({
            code: SERVICE_PACK_COMPILATION_CHECK_CODES.REDRESS_ROUTE_COMPLETENESS,
            severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
            message: `Redress route "${route.routeCode}" requires contactReference or escalationSteps`,
            path: `services.${service.code}.redressRoutes.${route.routeCode}`,
            entityRef: route.routeCode,
          });
        }
      }
    }

    return issues;
  }

  private validateSlaConfiguration(manifest: ServicePackManifest): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];

    for (const service of manifest.services) {
      const sla = service.slaConfiguration;
      if (!sla) {
        continue;
      }

      if (sla.targetDays <= 0) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.SLA_CONFIGURATION_VALIDITY,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `SLA targetDays must be positive for service "${service.code}"`,
          path: `services.${service.code}.slaConfiguration`,
        });
      }

      if (sla.warningDays !== undefined && sla.warningDays >= sla.targetDays) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.SLA_CONFIGURATION_VALIDITY,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `SLA warningDays must be less than targetDays for service "${service.code}"`,
          path: `services.${service.code}.slaConfiguration`,
        });
      }
    }

    return issues;
  }

  private validateDataClassifications(
    manifest: ServicePackManifest,
  ): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];

    for (const service of manifest.services) {
      for (const classification of service.dataClassifications ?? []) {
        if (
          !SERVICE_PACK_SUPPORTED_DATA_CLASSIFICATIONS.includes(
            classification as (typeof SERVICE_PACK_SUPPORTED_DATA_CLASSIFICATIONS)[number],
          )
        ) {
          issues.push({
            code: SERVICE_PACK_COMPILATION_CHECK_CODES.UNSUPPORTED_DATA_CLASSIFICATIONS,
            severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
            message: `Unsupported data classification "${classification}" for service "${service.code}"`,
            path: `services.${service.code}.dataClassifications`,
            entityRef: classification,
          });
        }
      }
    }

    return issues;
  }

  private validateIntegrationDependencies(
    manifest: ServicePackManifest,
    context: ResolvedServicePackContext,
  ): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];

    for (const service of manifest.services) {
      for (const code of service.integrationCodes ?? []) {
        if (!context.integrationIds.has(code)) {
          issues.push({
            code: SERVICE_PACK_COMPILATION_CHECK_CODES.INTEGRATION_DEPENDENCY_AVAILABILITY,
            severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
            message: `Integration "${code}" is unavailable for service "${service.code}"`,
            path: `services.${service.code}.integrationCodes`,
            entityRef: code,
          });
        }
      }
    }

    return issues;
  }

  private validateExternalAuthorityDependencies(
    manifest: ServicePackManifest,
    context: ResolvedServicePackContext,
  ): ServicePackCompilationIssue[] {
    const issues: ServicePackCompilationIssue[] = [];

    for (const service of manifest.services) {
      for (const code of service.externalAuthorityCodes ?? []) {
        if (!context.externalAuthorityIds.has(code)) {
          issues.push({
            code: SERVICE_PACK_COMPILATION_CHECK_CODES.EXTERNAL_AUTHORITY_DEPENDENCIES,
            severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
            message: `External authority "${code}" is unresolved for service "${service.code}"`,
            path: `services.${service.code}.externalAuthorityCodes`,
            entityRef: code,
          });
        }
      }
    }

    return issues;
  }
}
