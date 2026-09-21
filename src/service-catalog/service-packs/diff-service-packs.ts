import { calculateServicePackFingerprint } from './calculate-service-pack-fingerprint';
import { type SERVICE_PACK_HIGH_RISK_CHANGE_TYPES } from './service-pack.constants';
import {
  type ServicePackDiffEntry,
  type ServicePackDiffResult,
  type ServicePackManifest,
  type ServicePackServiceDefinition,
  type ServicePackVersionComparisonResult,
} from './service-pack.types';

const REVIEW_GATE_STEP_TYPES = new Set([
  'COMPLETENESS_REVIEW',
  'SUBSTANTIVE_REVIEW',
  'PROFESSIONAL_REVIEW',
  'DECISION_GATE',
  'EXTERNAL_REFERRAL',
]);

function entry(
  category: string,
  changeType: string,
  path: string,
  summary: string,
  highRisk: boolean,
  highRiskType?: (typeof SERVICE_PACK_HIGH_RISK_CHANGE_TYPES)[number],
): ServicePackDiffEntry {
  return {
    category,
    changeType,
    path,
    summary,
    highRisk,
    highRiskType,
    requiresInstitutionalReview: highRisk,
  };
}

function indexServices(manifest: ServicePackManifest): Map<string, ServicePackServiceDefinition> {
  return new Map(manifest.services.map((service) => [service.serviceCode, service]));
}

function diffForms(
  before: ServicePackServiceDefinition,
  after: ServicePackServiceDefinition,
): ServicePackDiffEntry[] {
  const entries: ServicePackDiffEntry[] = [];
  const beforeForms = new Map(before.forms.map((form) => [form.formCode, form]));
  const afterForms = new Map(after.forms.map((form) => [form.formCode, form]));

  for (const [formCode, afterForm] of afterForms) {
    const beforeForm = beforeForms.get(formCode);
    if (!beforeForm) {
      entries.push(
        entry(
          'forms',
          'FORM_ADDED',
          `${after.serviceCode}.forms.${formCode}`,
          `Added form ${formCode}`,
          false,
        ),
      );
      continue;
    }

    const beforeFields = beforeForm.sections.flatMap((section) => section.fields);
    const afterFields = afterForm.sections.flatMap((section) => section.fields);
    const beforeFieldMap = new Map(beforeFields.map((field) => [field.fieldKey, field]));
    const afterFieldMap = new Map(afterFields.map((field) => [field.fieldKey, field]));

    for (const [fieldKey, afterField] of afterFieldMap) {
      const beforeField = beforeFieldMap.get(fieldKey);
      if (!beforeField) {
        if (
          afterField.dataClassification === 'RESTRICTED' ||
          afterField.dataClassification === 'HIGHLY_RESTRICTED'
        ) {
          entries.push(
            entry(
              'forms',
              'SENSITIVE_FIELD_ADDED',
              `${after.serviceCode}.forms.${formCode}.${fieldKey}`,
              `Added sensitive field ${fieldKey}`,
              true,
              'NEW_SENSITIVE_DATA_FIELD',
            ),
          );
        }
        continue;
      }

      if (beforeField.required !== afterField.required) {
        entries.push(
          entry(
            'forms',
            'FORM_FIELD_REQUIREMENT_CHANGED',
            `${after.serviceCode}.forms.${formCode}.${fieldKey}`,
            `Field ${fieldKey} required changed from ${String(beforeField.required)} to ${String(afterField.required)}`,
            !afterField.required,
            !afterField.required ? 'REVIEW_GATE_REDUCED' : undefined,
          ),
        );
      }
    }
  }

  return entries;
}

function diffEvidence(
  before: ServicePackServiceDefinition,
  after: ServicePackServiceDefinition,
): ServicePackDiffEntry[] {
  const entries: ServicePackDiffEntry[] = [];
  const beforeEvidence = new Map(
    before.evidenceRequirements.map((item) => [item.evidenceCode, item]),
  );
  const afterEvidence = new Map(
    after.evidenceRequirements.map((item) => [item.evidenceCode, item]),
  );

  for (const [evidenceCode, beforeItem] of beforeEvidence) {
    const afterItem = afterEvidence.get(evidenceCode);
    if (!afterItem) {
      entries.push(
        entry(
          'evidence',
          'EVIDENCE_REMOVED',
          `${after.serviceCode}.evidenceRequirements.${evidenceCode}`,
          `Removed evidence requirement ${evidenceCode}`,
          true,
          'EVIDENCE_REQUIREMENT_REMOVED',
        ),
      );
      continue;
    }

    if (beforeItem.retentionPolicyCode !== afterItem.retentionPolicyCode) {
      entries.push(
        entry(
          'evidence',
          'RETENTION_CHANGED',
          `${after.serviceCode}.evidenceRequirements.${evidenceCode}`,
          `Retention policy changed for ${evidenceCode}`,
          true,
          'RETENTION_BEHAVIOR_CHANGED',
        ),
      );
    }
  }

  for (const evidenceCode of afterEvidence.keys()) {
    if (!beforeEvidence.has(evidenceCode)) {
      entries.push(
        entry(
          'evidence',
          'EVIDENCE_ADDED',
          `${after.serviceCode}.evidenceRequirements.${evidenceCode}`,
          `Added evidence requirement ${evidenceCode}`,
          false,
        ),
      );
    }
  }

  return entries;
}

function diffWorkflow(
  before: ServicePackServiceDefinition,
  after: ServicePackServiceDefinition,
): ServicePackDiffEntry[] {
  const entries: ServicePackDiffEntry[] = [];
  const beforeStages = new Map(before.workflowStages.map((stage) => [stage.stageKey, stage]));
  const afterStages = new Map(after.workflowStages.map((stage) => [stage.stageKey, stage]));

  for (const [stageKey, beforeStage] of beforeStages) {
    if (!afterStages.has(stageKey)) {
      entries.push(
        entry(
          'workflow',
          'WORKFLOW_STAGE_REMOVED',
          `${after.serviceCode}.workflowStages.${stageKey}`,
          `Removed workflow stage ${stageKey}`,
          REVIEW_GATE_STEP_TYPES.has(beforeStage.stepType),
          REVIEW_GATE_STEP_TYPES.has(beforeStage.stepType) ? 'WORKFLOW_STAGE_REMOVED' : undefined,
        ),
      );
    }
  }

  for (const [stageKey, afterStage] of afterStages) {
    const beforeStage = beforeStages.get(stageKey);
    if (!beforeStage) {
      entries.push(
        entry(
          'workflow',
          'WORKFLOW_STAGE_ADDED',
          `${after.serviceCode}.workflowStages.${stageKey}`,
          `Added workflow stage ${stageKey}`,
          false,
        ),
      );
      continue;
    }

    if (
      beforeStage.stepType !== afterStage.stepType ||
      beforeStage.consequenceLevel !== afterStage.consequenceLevel
    ) {
      const reduced =
        REVIEW_GATE_STEP_TYPES.has(beforeStage.stepType) &&
        !REVIEW_GATE_STEP_TYPES.has(afterStage.stepType);
      entries.push(
        entry(
          'workflow',
          'WORKFLOW_STAGE_CHANGED',
          `${after.serviceCode}.workflowStages.${stageKey}`,
          `Workflow stage ${stageKey} changed`,
          reduced,
          reduced ? 'REVIEW_GATE_REDUCED' : undefined,
        ),
      );
    }
  }

  return entries;
}

function diffAuthority(
  before: ServicePackServiceDefinition,
  after: ServicePackServiceDefinition,
): ServicePackDiffEntry[] {
  const entries: ServicePackDiffEntry[] = [];
  const beforeFunctions = new Map(before.authorityFunctions.map((fn) => [fn.functionCode, fn]));
  const afterFunctions = new Map(after.authorityFunctions.map((fn) => [fn.functionCode, fn]));

  for (const [functionCode] of afterFunctions) {
    if (!beforeFunctions.has(functionCode)) {
      entries.push(
        entry(
          'authority',
          'AUTHORITY_FUNCTION_ADDED',
          `${after.serviceCode}.authorityFunctions.${functionCode}`,
          `Added authority function ${functionCode}`,
          true,
          'NEW_AUTHORITY_FUNCTION',
        ),
      );
    }
  }

  const beforeDecision = new Map(before.decisionStages.map((stage) => [stage.stageKey, stage]));
  const afterDecision = new Map(after.decisionStages.map((stage) => [stage.stageKey, stage]));

  for (const [stageKey, afterStage] of afterDecision) {
    const beforeStage = beforeDecision.get(stageKey);
    if (
      beforeStage &&
      beforeStage.decisionActorFunctionCode !== afterStage.decisionActorFunctionCode
    ) {
      entries.push(
        entry(
          'decision',
          'DECISION_ACTOR_CHANGED',
          `${after.serviceCode}.decisionStages.${stageKey}`,
          `Decision actor changed from ${beforeStage.decisionActorFunctionCode} to ${afterStage.decisionActorFunctionCode}`,
          true,
          'DECISION_ACTOR_CHANGE',
        ),
      );
    }
  }

  return entries;
}

function diffFees(
  before: ServicePackServiceDefinition,
  after: ServicePackServiceDefinition,
): ServicePackDiffEntry[] {
  const entries: ServicePackDiffEntry[] = [];
  const beforeFees = new Map(before.fees.map((fee) => [fee.feeCode, fee]));
  const afterFees = new Map(after.fees.map((fee) => [fee.feeCode, fee]));

  for (const [feeCode, afterFee] of afterFees) {
    const beforeFee = beforeFees.get(feeCode);
    if (!beforeFee) {
      entries.push(
        entry(
          'fees',
          'FEE_ADDED',
          `${after.serviceCode}.fees.${feeCode}`,
          `Added fee ${feeCode}`,
          false,
        ),
      );
      continue;
    }

    if (beforeFee.amount !== afterFee.amount || beforeFee.waivable !== afterFee.waivable) {
      entries.push(
        entry(
          'fees',
          'FEE_CHANGED',
          `${after.serviceCode}.fees.${feeCode}`,
          `Fee ${feeCode} changed`,
          true,
          'FEE_CHANGED',
        ),
      );
    }
  }

  return entries;
}

function diffIntegrations(
  before: ServicePackServiceDefinition,
  after: ServicePackServiceDefinition,
): ServicePackDiffEntry[] {
  const entries: ServicePackDiffEntry[] = [];
  const beforeIntegrations = new Set(
    before.dependencies
      .map((dep) => dep.externalIntegrationCode)
      .filter((code): code is string => Boolean(code)),
  );
  const afterIntegrations = new Set(
    after.dependencies
      .map((dep) => dep.externalIntegrationCode)
      .filter((code): code is string => Boolean(code)),
  );

  for (const integrationCode of afterIntegrations) {
    if (!beforeIntegrations.has(integrationCode)) {
      entries.push(
        entry(
          'integrations',
          'INTEGRATION_ADDED',
          `${after.serviceCode}.dependencies.${integrationCode}`,
          `Added external integration ${integrationCode}`,
          true,
          'NEW_EXTERNAL_INTEGRATION',
        ),
      );
    }
  }

  return entries;
}

function diffOutputs(
  before: ServicePackServiceDefinition,
  after: ServicePackServiceDefinition,
): ServicePackDiffEntry[] {
  const entries: ServicePackDiffEntry[] = [];
  const beforeOutputs = new Map(before.outputs.map((output) => [output.outputCode, output]));
  const afterOutputs = new Map(after.outputs.map((output) => [output.outputCode, output]));

  for (const [outputCode, afterOutput] of afterOutputs) {
    const beforeOutput = beforeOutputs.get(outputCode);
    if (!beforeOutput) {
      continue;
    }

    if (
      beforeOutput.outputType !== afterOutput.outputType ||
      beforeOutput.deliveryChannel !== afterOutput.deliveryChannel
    ) {
      entries.push(
        entry(
          'outputs',
          'OUTPUT_CHANGED',
          `${after.serviceCode}.outputs.${outputCode}`,
          `Output ${outputCode} changed`,
          true,
          'OUTPUT_DEFINITION_CHANGED',
        ),
      );
    }
  }

  return entries;
}

function diffSla(
  before: ServicePackServiceDefinition,
  after: ServicePackServiceDefinition,
): ServicePackDiffEntry[] {
  const entries: ServicePackDiffEntry[] = [];
  const beforeRules = new Map(before.slaRules.map((rule) => [rule.ruleCode, rule]));
  const afterRules = new Map(after.slaRules.map((rule) => [rule.ruleCode, rule]));

  for (const [ruleCode, afterRule] of afterRules) {
    const beforeRule = beforeRules.get(ruleCode);
    if (beforeRule && afterRule.targetDays > beforeRule.targetDays) {
      entries.push(
        entry(
          'sla',
          'SLA_RELAXED',
          `${after.serviceCode}.slaRules.${ruleCode}`,
          `SLA ${ruleCode} target increased from ${String(beforeRule.targetDays)} to ${String(afterRule.targetDays)} days`,
          true,
          'SLA_RELAXED',
        ),
      );
    }
  }

  return entries;
}

function diffLifecycle(
  before: ServicePackServiceDefinition,
  after: ServicePackServiceDefinition,
): ServicePackDiffEntry[] {
  const entries: ServicePackDiffEntry[] = [];

  if (before.lifecycle.validityPeriodDays !== after.lifecycle.validityPeriodDays) {
    entries.push(
      entry(
        'lifecycle',
        'LIFECYCLE_CHANGED',
        `${after.serviceCode}.lifecycle.validityPeriodDays`,
        'Validity period changed',
        true,
        'RETENTION_BEHAVIOR_CHANGED',
      ),
    );
  }

  if (before.lifecycle.supportsRenewal !== after.lifecycle.supportsRenewal) {
    entries.push(
      entry(
        'lifecycle',
        'RENEWAL_SUPPORT_CHANGED',
        `${after.serviceCode}.lifecycle.supportsRenewal`,
        `Renewal support changed to ${String(after.lifecycle.supportsRenewal)}`,
        !after.lifecycle.supportsRenewal,
        !after.lifecycle.supportsRenewal ? 'REVIEW_GATE_REDUCED' : undefined,
      ),
    );
  }

  return entries;
}

function diffService(
  before: ServicePackServiceDefinition,
  after: ServicePackServiceDefinition,
): ServicePackDiffEntry[] {
  return [
    ...diffForms(before, after),
    ...diffEvidence(before, after),
    ...diffWorkflow(before, after),
    ...diffAuthority(before, after),
    ...diffFees(before, after),
    ...diffIntegrations(before, after),
    ...diffOutputs(before, after),
    ...diffSla(before, after),
    ...diffLifecycle(before, after),
  ];
}

export function diffServicePacks(
  before: ServicePackManifest,
  after: ServicePackManifest,
): ServicePackDiffResult {
  const beforeServices = indexServices(before);
  const afterServices = indexServices(after);
  const entries: ServicePackDiffEntry[] = [];

  for (const [serviceCode] of beforeServices) {
    if (!afterServices.has(serviceCode)) {
      entries.push(
        entry(
          'services',
          'SERVICE_REMOVED',
          `services.${serviceCode}`,
          `Removed service ${serviceCode}`,
          true,
          'SERVICE_REMOVED',
        ),
      );
    }
  }

  for (const [serviceCode, afterService] of afterServices) {
    const beforeService = beforeServices.get(serviceCode);
    if (!beforeService) {
      entries.push(
        entry(
          'services',
          'SERVICE_ADDED',
          `services.${serviceCode}`,
          `Added service ${serviceCode}`,
          false,
        ),
      );
      continue;
    }

    entries.push(...diffService(beforeService, afterService));
  }

  const highRiskChanges = entries.filter((item) => item.highRisk);

  return {
    fromPackId: before.packId,
    fromPackVersion: before.packVersion,
    toPackId: after.packId,
    toPackVersion: after.packVersion,
    entries,
    highRiskChanges,
    summary: {
      addedServices: entries.filter((item) => item.changeType === 'SERVICE_ADDED').length,
      removedServices: entries.filter((item) => item.changeType === 'SERVICE_REMOVED').length,
      modifiedServices: new Set(
        entries
          .filter((item) => !['SERVICE_ADDED', 'SERVICE_REMOVED'].includes(item.changeType))
          .map((item) => item.path.split('.')[0]),
      ).size,
      highRiskCount: highRiskChanges.length,
    },
  };
}

export function compareServicePackVersions(
  before: ServicePackManifest,
  after: ServicePackManifest,
): ServicePackVersionComparisonResult {
  const diff = diffServicePacks(before, after);
  const fromFingerprint = calculateServicePackFingerprint(before);
  const toFingerprint = calculateServicePackFingerprint(after);

  return {
    ...diff,
    fingerprintChanged: fromFingerprint !== toFingerprint,
    fromFingerprint,
    toFingerprint,
  };
}
