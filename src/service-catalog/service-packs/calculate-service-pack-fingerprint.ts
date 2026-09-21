import { createHash } from 'node:crypto';

import { canonicalizeJson } from './canonical-json.util';
import { type ServicePackManifest } from './service-pack.types';

export function calculateServicePackFingerprint(manifest: ServicePackManifest): string {
  const payload = {
    schemaVersion: manifest.schemaVersion,
    packId: manifest.packId,
    packVersion: manifest.packVersion,
    services: manifest.services.map((service) => ({
      serviceCode: service.serviceCode,
      serviceSlug: service.serviceSlug,
      serviceFamilyCode: service.serviceFamilyCode,
      applicantCategories: [...service.applicantCategories].sort(),
      authorityFunctions: [...service.authorityFunctions]
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
        .map((fn) => ({
          functionCode: fn.functionCode,
          authorityActionType: fn.authorityActionType,
          isConsequential: fn.isConsequential,
          publicStageLabel: fn.publicStageLabel,
          sequenceOrder: fn.sequenceOrder,
        })),
      forms: service.forms.map((form) => ({
        formCode: form.formCode,
        versionLabel: form.versionLabel,
        sections: form.sections.map((section) => ({
          sectionKey: section.sectionKey,
          fields: section.fields.map((field) => ({
            dataClassification: field.dataClassification ?? null,
            fieldKey: field.fieldKey,
            fieldType: field.fieldType,
            required: field.required,
          })),
        })),
      })),
      evidenceRequirements: [...service.evidenceRequirements]
        .sort((a, b) => a.evidenceCode.localeCompare(b.evidenceCode))
        .map((item) => ({
          evidenceCode: item.evidenceCode,
          required: item.required,
          retentionPolicyCode: item.retentionPolicyCode ?? null,
          verificationCategory: item.verificationCategory,
        })),
      workflowStages: [...service.workflowStages]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((stage) => ({
          authorityActionType: stage.authorityActionType ?? null,
          authorityFunctionCode: stage.authorityFunctionCode ?? null,
          consequenceLevel: stage.consequenceLevel,
          displayOrder: stage.displayOrder,
          isDecisionStage: stage.isDecisionStage ?? false,
          isIssuanceStage: stage.isIssuanceStage ?? false,
          stageKey: stage.stageKey,
          stepType: stage.stepType,
        })),
      fees: [...service.fees]
        .sort((a, b) => a.feeCode.localeCompare(b.feeCode))
        .map((fee) => ({
          amount: fee.amount,
          currencyCode: fee.currencyCode,
          feeCode: fee.feeCode,
          waivable: fee.waivable,
        })),
      outputs: [...service.outputs]
        .sort((a, b) => a.outputCode.localeCompare(b.outputCode))
        .map((output) => ({
          deliveryChannel: output.deliveryChannel,
          outputCode: output.outputCode,
          outputType: output.outputType,
        })),
      slaRules: [...service.slaRules]
        .sort((a, b) => a.ruleCode.localeCompare(b.ruleCode))
        .map((rule) => ({
          ruleCode: rule.ruleCode,
          targetDays: rule.targetDays,
        })),
      decisionStages: service.decisionStages.map((stage) => ({
        decisionActorFunctionCode: stage.decisionActorFunctionCode,
        requiresSecondApproval: stage.requiresSecondApproval,
        stageKey: stage.stageKey,
      })),
      lifecycle: {
        renewalServiceCode: service.lifecycle.renewalServiceCode ?? null,
        supportsRenewal: service.lifecycle.supportsRenewal,
        validityPeriodDays: service.lifecycle.validityPeriodDays ?? null,
      },
      dependencies: service.dependencies.map((dep) => ({
        dependencyCode: dep.dependencyCode,
        dependencyType: dep.dependencyType,
        externalIntegrationCode: dep.externalIntegrationCode ?? null,
      })),
    })),
  };

  return createHash('sha256').update(canonicalizeJson(payload)).digest('hex');
}
