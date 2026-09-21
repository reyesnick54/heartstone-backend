import {
  SERVICE_PACK_ALLOWED_LABELS,
  SERVICE_PACK_ALLOWED_MATURITY_STATUSES,
  SERVICE_PACK_ALLOWED_PUBLIC_AVAILABILITY,
  SERVICE_PACK_APPLICANT_CATEGORIES,
  SERVICE_PACK_AUTHORITY_ACTION_TYPES,
  SERVICE_PACK_AUTHORITY_FUNCTION_REGISTRY,
  SERVICE_PACK_FORBIDDEN_AVAILABILITY_VALUES,
  SERVICE_PACK_FORBIDDEN_MATURITY_VALUES,
  SERVICE_PACK_GOVERNANCE_BYPASS_FIELDS,
  SERVICE_PACK_NON_PRODUCTION_LABEL,
  SERVICE_PACK_SCHEMA_VERSION,
  SERVICE_PACK_TEMPLATE_ONLY_LABEL,
  SERVICE_PACK_WORKFLOW_STEP_TYPES,
} from './service-pack.constants';
import {
  type ServicePackManifest,
  type ServicePackValidationIssue,
  type ServicePackValidationResult,
} from './service-pack.types';

function issue(
  path: string,
  code: string,
  message: string,
  severity: 'error' | 'warning' = 'error',
): ServicePackValidationIssue {
  return { path, code, message, severity };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertNonProductionLabel(
  manifest: ServicePackManifest,
  issues: ServicePackValidationIssue[],
): void {
  if (!SERVICE_PACK_ALLOWED_LABELS.includes(manifest.packLabel)) {
    issues.push(
      issue(
        'packLabel',
        'NON_PRODUCTION_LABEL_REQUIRED',
        `packLabel must be ${SERVICE_PACK_NON_PRODUCTION_LABEL} or ${SERVICE_PACK_TEMPLATE_ONLY_LABEL}`,
      ),
    );
  }

  if (
    !manifest.description.includes('NON_PRODUCTION') &&
    !manifest.description.includes('TEMPLATE')
  ) {
    issues.push(
      issue(
        'description',
        'NON_PRODUCTION_DESCRIPTION_REQUIRED',
        'description must explicitly state NON_PRODUCTION or TEMPLATE ONLY scope',
      ),
    );
  }
}

function assertGovernanceBypass(
  manifest: ServicePackManifest,
  issues: ServicePackValidationIssue[],
): void {
  const raw = manifest as unknown as Record<string, unknown>;

  for (const field of SERVICE_PACK_GOVERNANCE_BYPASS_FIELDS) {
    if (field in raw) {
      issues.push(
        issue(
          field,
          'ACTIVATION_GOVERNANCE_BYPASS',
          `Service packs must not declare ${field}; activation is governed by ServiceActivationService`,
        ),
      );
    }
  }

  if (
    !SERVICE_PACK_ALLOWED_MATURITY_STATUSES.includes(manifest.deploymentIntent.targetMaturityStatus)
  ) {
    issues.push(
      issue(
        'deploymentIntent.targetMaturityStatus',
        'ACTIVATION_GOVERNANCE_BYPASS',
        `targetMaturityStatus must remain ${SERVICE_PACK_ALLOWED_MATURITY_STATUSES.join(' or ')} in authoring manifests`,
      ),
    );
  }

  if (
    SERVICE_PACK_FORBIDDEN_MATURITY_VALUES.includes(
      manifest.deploymentIntent
        .targetMaturityStatus as (typeof SERVICE_PACK_FORBIDDEN_MATURITY_VALUES)[number],
    )
  ) {
    issues.push(
      issue(
        'deploymentIntent.targetMaturityStatus',
        'ACTIVATION_GOVERNANCE_BYPASS',
        'Service packs cannot declare operational maturity statuses',
      ),
    );
  }

  if (
    !SERVICE_PACK_ALLOWED_PUBLIC_AVAILABILITY.includes(
      manifest.deploymentIntent.targetPublicAvailability,
    )
  ) {
    issues.push(
      issue(
        'deploymentIntent.targetPublicAvailability',
        'ACTIVATION_GOVERNANCE_BYPASS',
        `targetPublicAvailability must be one of: ${SERVICE_PACK_ALLOWED_PUBLIC_AVAILABILITY.join(', ')}`,
      ),
    );
  }

  if (
    SERVICE_PACK_FORBIDDEN_AVAILABILITY_VALUES.includes(
      manifest.deploymentIntent
        .targetPublicAvailability as (typeof SERVICE_PACK_FORBIDDEN_AVAILABILITY_VALUES)[number],
    )
  ) {
    issues.push(
      issue(
        'deploymentIntent.targetPublicAvailability',
        'ACTIVATION_GOVERNANCE_BYPASS',
        'Service packs cannot declare application-capable public availability',
      ),
    );
  }

  if (!manifest.deploymentIntent.requiresInstitutionalAcceptance) {
    issues.push(
      issue(
        'deploymentIntent.requiresInstitutionalAcceptance',
        'ACTIVATION_GOVERNANCE_BYPASS',
        'requiresInstitutionalAcceptance must remain true',
      ),
    );
  }

  if (!manifest.deploymentIntent.requiresOperationalActivation) {
    issues.push(
      issue(
        'deploymentIntent.requiresOperationalActivation',
        'ACTIVATION_GOVERNANCE_BYPASS',
        'requiresOperationalActivation must remain true',
      ),
    );
  }
}

function assertAuthorityMappings(
  manifest: ServicePackManifest,
  issues: ServicePackValidationIssue[],
): void {
  const registry = new Set<string>(SERVICE_PACK_AUTHORITY_FUNCTION_REGISTRY);

  for (const [serviceIndex, service] of manifest.services.entries()) {
    const basePath = `services[${String(serviceIndex)}]`;

    for (const [fnIndex, fn] of service.authorityFunctions.entries()) {
      if (!registry.has(fn.functionCode)) {
        issues.push(
          issue(
            `${basePath}.authorityFunctions[${String(fnIndex)}].functionCode`,
            'INVALID_AUTHORITY_MAPPING',
            `Unknown authority function code "${fn.functionCode}". Register the code or use a canonical template reference.`,
          ),
        );
      }

      if (
        !SERVICE_PACK_AUTHORITY_ACTION_TYPES.includes(
          fn.authorityActionType as (typeof SERVICE_PACK_AUTHORITY_ACTION_TYPES)[number],
        )
      ) {
        issues.push(
          issue(
            `${basePath}.authorityFunctions[${String(fnIndex)}].authorityActionType`,
            'INVALID_AUTHORITY_ACTION',
            `Unsupported authority action type "${fn.authorityActionType}"`,
          ),
        );
      }
    }

    for (const [stageIndex, stage] of service.workflowStages.entries()) {
      if (
        !SERVICE_PACK_WORKFLOW_STEP_TYPES.includes(
          stage.stepType as (typeof SERVICE_PACK_WORKFLOW_STEP_TYPES)[number],
        )
      ) {
        issues.push(
          issue(
            `${basePath}.workflowStages[${String(stageIndex)}].stepType`,
            'INVALID_WORKFLOW_STEP',
            `Unsupported workflow step type "${stage.stepType}"`,
          ),
        );
      }

      if (stage.authorityFunctionCode && !registry.has(stage.authorityFunctionCode)) {
        issues.push(
          issue(
            `${basePath}.workflowStages[${String(stageIndex)}].authorityFunctionCode`,
            'INVALID_AUTHORITY_MAPPING',
            `Unknown workflow authority function code "${stage.authorityFunctionCode}"`,
          ),
        );
      }
    }

    for (const [stageIndex, stage] of service.decisionStages.entries()) {
      if (!registry.has(stage.decisionActorFunctionCode)) {
        issues.push(
          issue(
            `${basePath}.decisionStages[${String(stageIndex)}].decisionActorFunctionCode`,
            'INVALID_AUTHORITY_MAPPING',
            `Unknown decision actor function code "${stage.decisionActorFunctionCode}"`,
          ),
        );
      }
    }

    if (!registry.has(service.issuance.issuanceFunctionCode)) {
      issues.push(
        issue(
          `${basePath}.issuance.issuanceFunctionCode`,
          'INVALID_AUTHORITY_MAPPING',
          `Unknown issuance function code "${service.issuance.issuanceFunctionCode}"`,
        ),
      );
    }
  }
}

function assertStructuralIntegrity(
  manifest: ServicePackManifest,
  issues: ServicePackValidationIssue[],
): void {
  if (manifest.schemaVersion !== SERVICE_PACK_SCHEMA_VERSION) {
    issues.push(
      issue(
        'schemaVersion',
        'UNSUPPORTED_SCHEMA_VERSION',
        `Expected schemaVersion ${SERVICE_PACK_SCHEMA_VERSION}, received ${manifest.schemaVersion}`,
      ),
    );
  }

  if (!SERVICE_PACK_ALLOWED_LABELS.includes(manifest.packLabel)) {
    issues.push(
      issue(
        'packLabel',
        'INVALID_PACK_LABEL',
        `packLabel must be one of: ${SERVICE_PACK_ALLOWED_LABELS.join(', ')}`,
      ),
    );
  }

  if (manifest.services.length === 0) {
    issues.push(
      issue('services', 'EMPTY_SERVICE_LIST', 'At least one service definition is required'),
    );
  }

  const serviceCodes = new Set<string>();

  for (const [serviceIndex, service] of manifest.services.entries()) {
    const basePath = `services[${String(serviceIndex)}]`;

    if (serviceCodes.has(service.serviceCode)) {
      issues.push(
        issue(
          `${basePath}.serviceCode`,
          'DUPLICATE_SERVICE_CODE',
          `Duplicate serviceCode "${service.serviceCode}"`,
        ),
      );
    }
    serviceCodes.add(service.serviceCode);

    for (const category of service.applicantCategories) {
      if (
        !SERVICE_PACK_APPLICANT_CATEGORIES.includes(
          category as (typeof SERVICE_PACK_APPLICANT_CATEGORIES)[number],
        )
      ) {
        issues.push(
          issue(
            `${basePath}.applicantCategories`,
            'INVALID_APPLICANT_CATEGORY',
            `Unsupported applicant category "${category}"`,
          ),
        );
      }
    }

    if (service.forms.length === 0) {
      issues.push(
        issue(`${basePath}.forms`, 'MISSING_FORM', 'Each service must define at least one form'),
      );
    }

    if (service.workflowStages.length === 0) {
      issues.push(
        issue(
          `${basePath}.workflowStages`,
          'MISSING_WORKFLOW',
          'Each service must define workflow stages',
        ),
      );
    }

    if (
      service.completenessReview.enabled &&
      service.completenessReview.requiredEvidenceCodes.length === 0
    ) {
      issues.push(
        issue(
          `${basePath}.completenessReview.requiredEvidenceCodes`,
          'INCOMPLETE_COMPLETENESS_REVIEW',
          'Completeness review requires at least one evidence code when enabled',
        ),
      );
    }
  }
}

export function parseServicePackManifest(raw: unknown): ServicePackManifest {
  if (!isRecord(raw)) {
    throw new Error('Service pack manifest must be a JSON object');
  }

  return raw as unknown as ServicePackManifest;
}

export function validateServicePackManifest(
  manifest: ServicePackManifest,
): ServicePackValidationResult {
  const issues: ServicePackValidationIssue[] = [];

  assertNonProductionLabel(manifest, issues);
  assertGovernanceBypass(manifest, issues);
  assertStructuralIntegrity(manifest, issues);
  assertAuthorityMappings(manifest, issues);

  return {
    valid: issues.filter((entry) => entry.severity === 'error').length === 0,
    packId: manifest.packId,
    packVersion: manifest.packVersion,
    issues,
  };
}

export function validateServicePackRaw(raw: unknown): ServicePackValidationResult {
  const manifest = parseServicePackManifest(raw);
  return validateServicePackManifest(manifest);
}
