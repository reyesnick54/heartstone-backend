import {
  CARBON_MANAGEMENT_AUTHORITY,
  CARBON_MANAGEMENT_DEPARTMENT_CODE,
  CARBON_MANAGEMENT_INSTITUTION_CODE,
  CARBON_MANAGEMENT_SERVICE_CODE_PREFIX,
  CARBON_MANAGEMENT_SERVICE_FAMILY_CODE,
  CARBON_MANAGEMENT_SERVICE_PACK_ID,
  CARBON_MANAGEMENT_TEMPLATE_SERVICE_DEFINITIONS,
} from '../../carbon-management/carbon-management.constants';
import {
  SERVICE_PACK_NON_PRODUCTION_LABEL,
  SERVICE_PACK_SCHEMA_VERSION,
} from './service-pack.constants';
import { type ServicePackManifest, type ServicePackServiceDefinition } from './service-pack.types';

const DEPLOYMENT_INTENT = {
  targetMaturityStatus: 'DRAFT' as const,
  targetPublicAvailability: 'UNDER_DEVELOPMENT' as const,
  requiresInstitutionalAcceptance: true as const,
  requiresOperationalActivation: true as const,
};

function slugFromKey(key: string): string {
  return key.toLowerCase();
}

function carbonManagementTemplateService(
  definition: (typeof CARBON_MANAGEMENT_TEMPLATE_SERVICE_DEFINITIONS)[number],
): ServicePackServiceDefinition {
  const serviceCode = `${CARBON_MANAGEMENT_SERVICE_CODE_PREFIX}${definition.key}`;
  const workflowStages: ServicePackServiceDefinition['workflowStages'] = [
    {
      stageKey: 'intake',
      label: 'Carbon administration intake',
      displayOrder: 1,
      stepType: 'INTAKE',
      authorityFunctionCode: CARBON_MANAGEMENT_AUTHORITY.intake,
      authorityActionType: 'PREPARE',
      consequenceLevel: 'INFORMATIONAL',
    },
    {
      stageKey: 'completeness',
      label: 'Completeness review',
      displayOrder: 2,
      stepType: 'COMPLETENESS_REVIEW',
      authorityFunctionCode: CARBON_MANAGEMENT_AUTHORITY.intake,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'ADMINISTRATIVE',
    },
    {
      stageKey: 'programme-review',
      label: 'Programme and project review',
      displayOrder: 3,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: CARBON_MANAGEMENT_AUTHORITY.programmeReview,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    },
  ];

  let displayOrder = 4;
  if (definition.requiresExternalVerification) {
    workflowStages.push({
      stageKey: 'external-verification',
      label: 'External verification',
      displayOrder,
      stepType: 'EXTERNAL_REFERRAL',
      authorityFunctionCode: CARBON_MANAGEMENT_AUTHORITY.externalVerification,
      authorityActionType: 'VERIFY',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
  }

  workflowStages.push(
    {
      stageKey: 'decision',
      label: 'Administrative decision',
      displayOrder,
      stepType: 'DECISION_GATE',
      authorityFunctionCode: CARBON_MANAGEMENT_AUTHORITY.decide,
      authorityActionType: 'DECIDE',
      consequenceLevel: 'CONSEQUENTIAL',
      isDecisionStage: true,
    },
    {
      stageKey: 'issuance',
      label: 'Administrative authorization issuance',
      displayOrder: displayOrder + 1,
      stepType: 'ISSUANCE_GATE',
      authorityFunctionCode: CARBON_MANAGEMENT_AUTHORITY.issue,
      authorityActionType: 'ISSUE',
      consequenceLevel: 'CONSEQUENTIAL',
      isIssuanceStage: true,
    },
  );

  const evidenceCodes = [
    'TEMPLATE-CM-PROJECT-DESCRIPTION',
    'TEMPLATE-CM-BASELINE-EVIDENCE',
    'TEMPLATE-CM-MONITORING-PLAN',
    'TEMPLATE-CM-EXTERNAL-VERIFICATION',
    'TEMPLATE-CM-REGISTRY-CORRESPONDENCE',
    'TEMPLATE-CM-COMMERCIAL-CONFIDENTIAL',
  ];

  return {
    serviceCode,
    serviceSlug: slugFromKey(definition.key),
    serviceName: definition.name,
    serviceFamilyCode: CARBON_MANAGEMENT_SERVICE_FAMILY_CODE,
    serviceType: definition.serviceType,
    description: `${definition.name} — NON_PRODUCTION placeholder carbon-management government service.`,
    applicantCategories: ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
    authorityFunctions: [
      {
        functionCode: CARBON_MANAGEMENT_AUTHORITY.intake,
        publicStageLabel: 'Intake',
        authorityActionType: 'PREPARE',
        sequenceOrder: 1,
        isConsequential: false,
      },
      {
        functionCode: CARBON_MANAGEMENT_AUTHORITY.programmeReview,
        publicStageLabel: 'Programme review',
        authorityActionType: 'REVIEW',
        sequenceOrder: 2,
        isConsequential: false,
      },
      {
        functionCode: CARBON_MANAGEMENT_AUTHORITY.externalVerification,
        publicStageLabel: 'External verification',
        authorityActionType: 'VERIFY',
        sequenceOrder: 3,
        isConsequential: false,
      },
      {
        functionCode: CARBON_MANAGEMENT_AUTHORITY.decide,
        publicStageLabel: 'Administrative decision',
        authorityActionType: 'DECIDE',
        sequenceOrder: 4,
        isConsequential: true,
      },
      {
        functionCode: CARBON_MANAGEMENT_AUTHORITY.issue,
        publicStageLabel: 'Authorization issuance',
        authorityActionType: 'ISSUE',
        sequenceOrder: 5,
        isConsequential: true,
      },
      {
        functionCode: CARBON_MANAGEMENT_AUTHORITY.complianceReview,
        publicStageLabel: 'Compliance review',
        authorityActionType: 'REVIEW',
        sequenceOrder: 6,
        isConsequential: false,
      },
    ],
    forms: [
      {
        formCode: `${serviceCode}-FORM`,
        formName: `${definition.name} form`,
        versionLabel: '1.0.0-NON_PRODUCTION',
        sections: [
          {
            sectionKey: 'project',
            label: 'Carbon project',
            fields: [
              {
                fieldKey: 'projectCategoryCode',
                label: 'Project category (jurisdiction-configured)',
                fieldType: 'TEXT',
                required: true,
              },
              {
                fieldKey: 'strategicProjectProfileId',
                label: 'Linked strategic project (optional)',
                fieldType: 'TEXT',
                required: false,
              },
            ],
          },
        ],
      },
    ],
    evidenceRequirements: evidenceCodes.map((evidenceCode, index) => ({
      evidenceCode,
      label: evidenceCode.replace('TEMPLATE-CM-', '').replace(/-/g, ' '),
      description: 'Template carbon-management evidence placeholder (configuration-driven)',
      required: index < 2,
      verificationCategory: 'CONTENT_FACT',
    })),
    workflowStages,
    completenessReview: {
      enabled: true,
      requiredEvidenceCodes: evidenceCodes.slice(0, 2),
    },
    slaRules: [
      {
        ruleCode: `${serviceCode}-SLA`,
        label: `${definition.name} SLA`,
        targetDays: 60,
        clockStartsAtStageKey: 'intake',
      },
    ],
    dependencies: definition.requiresExternalVerification
      ? [
          {
            dependencyCode: 'TEMPLATE-CM-INDEPENDENT-VERIFIER',
            dependencyType: 'EXTERNAL_AUTHORITY',
            description: 'Independent verifier attestation (when configured)',
          },
        ]
      : [],
    decisionStages: [
      {
        stageKey: 'decision',
        decisionActorFunctionCode: CARBON_MANAGEMENT_AUTHORITY.decide,
        requiresSecondApproval: false,
      },
    ],
    outputs: [
      {
        outputCode: `${serviceCode}-AUTHORIZATION`,
        label: 'Carbon administrative authorization instrument',
        outputType: 'REGISTRATION_RECORD',
        deliveryChannel: 'PORTAL',
      },
    ],
    communications: [
      {
        communicationCode: `${serviceCode}-ACK`,
        triggerStageKey: 'intake',
        channel: 'EMAIL',
        templateCode: `${serviceCode}-ACK-TPL`,
      },
    ],
    fees: [
      {
        feeCode: `${serviceCode}-FEE`,
        label: 'Administrative service fee (configured)',
        amount: 0,
        currencyCode: 'USD',
        waivable: true,
      },
    ],
    issuance: {
      issuanceStageKey: 'issuance',
      issuanceFunctionCode: CARBON_MANAGEMENT_AUTHORITY.issue,
      outputCodes: [`${serviceCode}-AUTHORIZATION`],
    },
    lifecycle: {
      supportsRenewal: definition.serviceType === 'RENEWAL',
      renewalServiceCode:
        definition.serviceType === 'RENEWAL'
          ? `${CARBON_MANAGEMENT_SERVICE_CODE_PREFIX}PERIODIC-REVIEW`
          : undefined,
      validityPeriodDays: 365,
    },
    redress: [],
    dashboardIndicators: [
      {
        indicatorCode: `${serviceCode}-QUEUE`,
        label: 'Carbon administration review queue',
        metricType: 'QUEUE_DEPTH',
      },
    ],
  };
}

export const CARBON_MANAGEMENT_SERVICES: ServicePackServiceDefinition[] =
  CARBON_MANAGEMENT_TEMPLATE_SERVICE_DEFINITIONS.map((definition) =>
    carbonManagementTemplateService(definition),
  );

export const CARBON_MANAGEMENT_SERVICE_PACK_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: CARBON_MANAGEMENT_SERVICE_PACK_ID,
  packVersion: '1.0.0',
  packName: 'Carbon Management and Trading Administration Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Carbon programme and project registration, external verification, registry reference recording, compliance reporting, and renewal workflows. Programme taxonomy and market mechanics remain jurisdiction configuration.',
  institutionCode: CARBON_MANAGEMENT_INSTITUTION_CODE,
  departmentCode: CARBON_MANAGEMENT_DEPARTMENT_CODE,
  deploymentIntent: DEPLOYMENT_INTENT,
  services: CARBON_MANAGEMENT_SERVICES,
};
