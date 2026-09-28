import {
  MARITIME_AUTHORITY,
  MARITIME_DEPARTMENT_CODE,
  MARITIME_INSTITUTION_CODE,
  MARITIME_SERVICE_CODE_PREFIX,
  MARITIME_SERVICE_FAMILY_CODE,
  MARITIME_SERVICE_PACK_ID,
  MARITIME_TEMPLATE_SERVICE_DEFINITIONS,
} from '../../maritime/maritime.constants';
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

function maritimeTemplateService(
  definition: (typeof MARITIME_TEMPLATE_SERVICE_DEFINITIONS)[number],
): ServicePackServiceDefinition {
  const serviceCode = `${MARITIME_SERVICE_CODE_PREFIX}${definition.key}`;
  const evidenceCodes = [
    `${serviceCode}-VESSEL-IDENTITY`,
    `${serviceCode}-OPERATOR-EVIDENCE`,
    `${serviceCode}-REGULATORY-SUPPORT`,
  ];

  const workflowStages: ServicePackServiceDefinition['workflowStages'] = [
    {
      stageKey: 'intake',
      label: 'Maritime intake',
      displayOrder: 1,
      stepType: 'INTAKE',
      authorityFunctionCode: MARITIME_AUTHORITY.intake,
      authorityActionType: 'PREPARE',
      consequenceLevel: 'INFORMATIONAL',
    },
    {
      stageKey: 'substantive-review',
      label: 'Substantive maritime review',
      displayOrder: 2,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: MARITIME_AUTHORITY.substantiveReview,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    },
  ];

  let displayOrder = 3;
  if (definition.requiresInspection) {
    workflowStages.push({
      stageKey: 'inspection',
      label: 'Maritime inspection coordination',
      displayOrder,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: MARITIME_AUTHORITY.inspectionCoordination,
      authorityActionType: 'VERIFY',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
  }

  if (definition.requiresExternal) {
    workflowStages.push({
      stageKey: 'external-referral',
      label: 'Competent authority determination',
      displayOrder,
      stepType: 'EXTERNAL_REFERRAL',
      authorityFunctionCode: MARITIME_AUTHORITY.externalReferral,
      authorityActionType: 'VERIFY',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
  }

  workflowStages.push(
    {
      stageKey: 'decision',
      label: 'Human maritime decision',
      displayOrder,
      stepType: 'DECISION_GATE',
      authorityFunctionCode: MARITIME_AUTHORITY.decide,
      authorityActionType: 'DECIDE',
      consequenceLevel: 'CONSEQUENTIAL',
      isDecisionStage: true,
    },
    {
      stageKey: 'issuance',
      label: 'Official instrument issuance',
      displayOrder: displayOrder + 1,
      stepType: 'ISSUANCE_GATE',
      authorityFunctionCode: MARITIME_AUTHORITY.issue,
      authorityActionType: 'ISSUE',
      consequenceLevel: 'CONSEQUENTIAL',
      isIssuanceStage: true,
    },
  );

  return {
    serviceCode,
    serviceSlug: definition.key.toLowerCase(),
    serviceName: definition.name,
    serviceFamilyCode: MARITIME_SERVICE_FAMILY_CODE,
    serviceType: definition.serviceType,
    description: `${definition.name} — NON_PRODUCTION maritime / blue-economy template; vessel categories remain jurisdiction configuration.`,
    applicantCategories: ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
    authorityFunctions: [
      {
        functionCode: MARITIME_AUTHORITY.intake,
        publicStageLabel: 'Intake',
        authorityActionType: 'PREPARE',
        sequenceOrder: 1,
        isConsequential: false,
      },
      {
        functionCode: MARITIME_AUTHORITY.substantiveReview,
        publicStageLabel: 'Substantive review',
        authorityActionType: 'REVIEW',
        sequenceOrder: 2,
        isConsequential: false,
      },
      {
        functionCode: MARITIME_AUTHORITY.inspectionCoordination,
        publicStageLabel: 'Inspection',
        authorityActionType: 'VERIFY',
        sequenceOrder: 3,
        isConsequential: false,
      },
      {
        functionCode: MARITIME_AUTHORITY.externalReferral,
        publicStageLabel: 'External referral',
        authorityActionType: 'VERIFY',
        sequenceOrder: 4,
        isConsequential: false,
      },
      {
        functionCode: MARITIME_AUTHORITY.decide,
        publicStageLabel: 'Decision',
        authorityActionType: 'DECIDE',
        sequenceOrder: 5,
        isConsequential: true,
      },
      {
        functionCode: MARITIME_AUTHORITY.issue,
        publicStageLabel: 'Issuance',
        authorityActionType: 'ISSUE',
        sequenceOrder: 6,
        isConsequential: true,
      },
      {
        functionCode: MARITIME_AUTHORITY.complianceReview,
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
            sectionKey: 'vessel',
            label: 'Vessel identity',
            fields: [
              {
                fieldKey: 'vesselTypeCategoryCode',
                label: 'Vessel type category (jurisdiction-configured)',
                fieldType: 'TEXT',
                required: true,
              },
              {
                fieldKey: 'vesselRecordId',
                label: 'Canonical vessel record reference',
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
      label: evidenceCode.replace(MARITIME_SERVICE_CODE_PREFIX, '').replace(/-/g, ' '),
      description: 'Template maritime evidence placeholder (configuration-driven)',
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
        targetDays: 30,
        clockStartsAtStageKey: 'intake',
      },
    ],
    dependencies: definition.requiresExternal
      ? [
          {
            dependencyCode: 'TEMPLATE-MAR-COMPETENT-REGISTRATION-AUTHORITY',
            dependencyType: 'EXTERNAL_AUTHORITY',
            description: 'Competent registration authority determination (when configured)',
          },
        ]
      : [],
    decisionStages: [
      {
        stageKey: 'decision',
        decisionActorFunctionCode: MARITIME_AUTHORITY.decide,
        requiresSecondApproval: false,
      },
    ],
    outputs: [
      {
        outputCode: `${serviceCode}-INSTRUMENT`,
        label: 'Maritime administrative instrument',
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
        label: 'Maritime service fee (configured)',
        amount: 0,
        currencyCode: 'USD',
        waivable: true,
      },
    ],
    issuance: {
      issuanceStageKey: 'issuance',
      issuanceFunctionCode: MARITIME_AUTHORITY.issue,
      outputCodes: [`${serviceCode}-INSTRUMENT`],
    },
    lifecycle: {
      supportsRenewal: definition.serviceType === 'RENEWAL',
      renewalServiceCode:
        definition.serviceType === 'RENEWAL'
          ? `${MARITIME_SERVICE_CODE_PREFIX}MARITIME-LICENCE-RENEWAL`
          : undefined,
      validityPeriodDays: 365,
    },
    redress: [],
    dashboardIndicators: [
      {
        indicatorCode: `${serviceCode}-QUEUE`,
        label: 'Maritime service queue',
        metricType: 'QUEUE_DEPTH',
      },
    ],
  };
}

export const MARITIME_SERVICES: ServicePackServiceDefinition[] =
  MARITIME_TEMPLATE_SERVICE_DEFINITIONS.map((definition) => maritimeTemplateService(definition));

export const MARITIME_SERVICE_PACK_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: MARITIME_SERVICE_PACK_ID,
  packVersion: '1.0.0',
  packName: 'Blue Economy & Maritime Administration Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Vessel administrative intake, maritime licensing, inspections, external competent-authority referrals, compliance reporting, and renewal workflows. Vessel type taxonomy remains jurisdiction configuration.',
  institutionCode: MARITIME_INSTITUTION_CODE,
  departmentCode: MARITIME_DEPARTMENT_CODE,
  deploymentIntent: DEPLOYMENT_INTENT,
  services: MARITIME_SERVICES,
};
