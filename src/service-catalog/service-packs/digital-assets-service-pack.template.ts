import {
  DIGITAL_ASSETS_AUTHORITY,
  DIGITAL_ASSETS_DEPARTMENT_CODE,
  DIGITAL_ASSETS_INSTITUTION_CODE,
  DIGITAL_ASSETS_SERVICE_CODE_PREFIX,
  DIGITAL_ASSETS_SERVICE_FAMILY_CODE,
  DIGITAL_ASSETS_SERVICE_PACK_ID,
  DIGITAL_ASSETS_TEMPLATE_SERVICE_DEFINITIONS,
} from '../../digital-assets/digital-assets.constants';
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

function digitalAssetsTemplateService(
  definition: (typeof DIGITAL_ASSETS_TEMPLATE_SERVICE_DEFINITIONS)[number],
): ServicePackServiceDefinition {
  const serviceCode = `${DIGITAL_ASSETS_SERVICE_CODE_PREFIX}${definition.key}`;
  const workflowStages: ServicePackServiceDefinition['workflowStages'] = [
    {
      stageKey: 'intake',
      label: 'Digital-assets intake',
      displayOrder: 1,
      stepType: 'INTAKE',
      authorityFunctionCode: DIGITAL_ASSETS_AUTHORITY.intake,
      authorityActionType: 'PREPARE',
      consequenceLevel: 'INFORMATIONAL',
    },
    {
      stageKey: 'completeness',
      label: 'Completeness review',
      displayOrder: 2,
      stepType: 'COMPLETENESS_REVIEW',
      authorityFunctionCode: DIGITAL_ASSETS_AUTHORITY.intake,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'ADMINISTRATIVE',
    },
  ];

  let displayOrder = 3;
  if (definition.requiresTechnicalReview) {
    workflowStages.push({
      stageKey: 'technical-security-review',
      label: 'Technical and security review',
      displayOrder,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: DIGITAL_ASSETS_AUTHORITY.technicalReview,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
    workflowStages.push({
      stageKey: 'professional-review',
      label: 'Professional review',
      displayOrder,
      stepType: 'PROFESSIONAL_REVIEW',
      authorityFunctionCode: DIGITAL_ASSETS_AUTHORITY.professionalReview,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
  }

  if (definition.requiresExternal) {
    workflowStages.push({
      stageKey: 'external-referral',
      label: 'External authority referral',
      displayOrder,
      stepType: 'EXTERNAL_REFERRAL',
      authorityFunctionCode: DIGITAL_ASSETS_AUTHORITY.externalReferral,
      authorityActionType: 'VERIFY',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
  }

  workflowStages.push(
    {
      stageKey: 'decision',
      label: 'Regulatory decision',
      displayOrder,
      stepType: 'DECISION_GATE',
      authorityFunctionCode: DIGITAL_ASSETS_AUTHORITY.decide,
      authorityActionType: 'DECIDE',
      consequenceLevel: 'CONSEQUENTIAL',
      isDecisionStage: true,
    },
    {
      stageKey: 'issuance',
      label: 'Authorization issuance',
      displayOrder: displayOrder + 1,
      stepType: 'ISSUANCE_GATE',
      authorityFunctionCode: DIGITAL_ASSETS_AUTHORITY.issue,
      authorityActionType: 'ISSUE',
      consequenceLevel: 'CONSEQUENTIAL',
      isIssuanceStage: true,
    },
  );

  const evidenceCodes = [
    'TEMPLATE-DA-ARCHITECTURE',
    'TEMPLATE-DA-CUSTODY',
    'TEMPLATE-DA-CYBERSECURITY',
    'TEMPLATE-DA-OPERATIONAL-CONTROLS',
    'TEMPLATE-DA-BCP',
    'TEMPLATE-DA-PROFESSIONAL-ATTESTATION',
  ];

  return {
    serviceCode,
    serviceSlug: slugFromKey(definition.key),
    serviceName: definition.name,
    serviceFamilyCode: DIGITAL_ASSETS_SERVICE_FAMILY_CODE,
    serviceType: definition.serviceType,
    description: `${definition.name} — NON_PRODUCTION placeholder digital-assets government service.`,
    applicantCategories: ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
    authorityFunctions: [
      {
        functionCode: DIGITAL_ASSETS_AUTHORITY.intake,
        publicStageLabel: 'Intake',
        authorityActionType: 'PREPARE',
        sequenceOrder: 1,
        isConsequential: false,
      },
      {
        functionCode: DIGITAL_ASSETS_AUTHORITY.technicalReview,
        publicStageLabel: 'Technical review',
        authorityActionType: 'REVIEW',
        sequenceOrder: 2,
        isConsequential: false,
      },
      {
        functionCode: DIGITAL_ASSETS_AUTHORITY.professionalReview,
        publicStageLabel: 'Professional review',
        authorityActionType: 'REVIEW',
        sequenceOrder: 3,
        isConsequential: false,
      },
      {
        functionCode: DIGITAL_ASSETS_AUTHORITY.externalReferral,
        publicStageLabel: 'External referral',
        authorityActionType: 'VERIFY',
        sequenceOrder: 4,
        isConsequential: false,
      },
      {
        functionCode: DIGITAL_ASSETS_AUTHORITY.decide,
        publicStageLabel: 'Regulatory decision',
        authorityActionType: 'DECIDE',
        sequenceOrder: 5,
        isConsequential: true,
      },
      {
        functionCode: DIGITAL_ASSETS_AUTHORITY.issue,
        publicStageLabel: 'Authorization issuance',
        authorityActionType: 'ISSUE',
        sequenceOrder: 6,
        isConsequential: true,
      },
      {
        functionCode: DIGITAL_ASSETS_AUTHORITY.complianceReview,
        publicStageLabel: 'Compliance review',
        authorityActionType: 'REVIEW',
        sequenceOrder: 7,
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
            sectionKey: 'activity',
            label: 'Regulated activity',
            fields: [
              {
                fieldKey: 'activityCategoryCode',
                label: 'Activity category (jurisdiction-configured)',
                fieldType: 'TEXT',
                required: true,
              },
            ],
          },
        ],
      },
    ],
    evidenceRequirements: evidenceCodes.map((evidenceCode, index) => ({
      evidenceCode,
      label: evidenceCode.replace('TEMPLATE-DA-', '').replace(/-/g, ' '),
      description: 'Template digital-assets evidence placeholder (configuration-driven)',
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
        targetDays: 45,
        clockStartsAtStageKey: 'intake',
      },
    ],
    dependencies: definition.requiresExternal
      ? [
          {
            dependencyCode: 'TEMPLATE-DA-FINANCIAL-REGULATOR',
            dependencyType: 'EXTERNAL_AUTHORITY',
            description: 'National financial regulator concurrence (when configured)',
          },
        ]
      : [],
    decisionStages: [
      {
        stageKey: 'decision',
        decisionActorFunctionCode: DIGITAL_ASSETS_AUTHORITY.decide,
        requiresSecondApproval: false,
      },
    ],
    outputs: [
      {
        outputCode: `${serviceCode}-AUTHORIZATION`,
        label: 'Digital-assets authorization instrument',
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
        label: 'Regulatory service fee (configured)',
        amount: 0,
        currencyCode: 'USD',
        waivable: true,
      },
    ],
    issuance: {
      issuanceStageKey: 'issuance',
      issuanceFunctionCode: DIGITAL_ASSETS_AUTHORITY.issue,
      outputCodes: [`${serviceCode}-AUTHORIZATION`],
    },
    lifecycle: {
      supportsRenewal: definition.serviceType === 'RENEWAL',
      renewalServiceCode:
        definition.serviceType === 'RENEWAL' ? `${DIGITAL_ASSETS_SERVICE_CODE_PREFIX}VASP-LICENCE-RENEWAL` : undefined,
      validityPeriodDays: 365,
    },
    redress: [],
    dashboardIndicators: [
      {
        indicatorCode: `${serviceCode}-QUEUE`,
        label: 'Digital-assets review queue',
        metricType: 'QUEUE_DEPTH',
      },
    ],
  };
}

export const DIGITAL_ASSETS_SERVICES: ServicePackServiceDefinition[] =
  DIGITAL_ASSETS_TEMPLATE_SERVICE_DEFINITIONS.map((definition) =>
    digitalAssetsTemplateService(definition),
  );

export const DIGITAL_ASSETS_SERVICE_PACK_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: DIGITAL_ASSETS_SERVICE_PACK_ID,
  packVersion: '1.0.0',
  packName: 'Digital Assets & Blockchain Administration Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Digital-asset regulatory registration, licensing, technical review, external referrals, compliance, and renewal workflows. Activity taxonomy remains jurisdiction configuration.',
  institutionCode: DIGITAL_ASSETS_INSTITUTION_CODE,
  departmentCode: DIGITAL_ASSETS_DEPARTMENT_CODE,
  deploymentIntent: DEPLOYMENT_INTENT,
  services: DIGITAL_ASSETS_SERVICES,
};
