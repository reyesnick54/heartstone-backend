import {
  CANNABIS_ADMINISTRATION_SERVICE_PACK_ID,
  CANNABIS_AUTHORITY,
  CANNABIS_DEPARTMENT_CODE,
  CANNABIS_INSTITUTION_CODE,
  CANNABIS_SERVICE_CODE_PREFIX,
  CANNABIS_SERVICE_FAMILY_CODE,
  CANNABIS_TEMPLATE_SERVICE_DEFINITIONS,
} from '../../cannabis-administration/cannabis-administration.constants';
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

function cannabisTemplateService(
  definition: (typeof CANNABIS_TEMPLATE_SERVICE_DEFINITIONS)[number],
): ServicePackServiceDefinition {
  const serviceCode = `${CANNABIS_SERVICE_CODE_PREFIX}${definition.key}`;
  const workflowStages: ServicePackServiceDefinition['workflowStages'] = [
    {
      stageKey: 'intake',
      label: 'Cannabis administration intake',
      displayOrder: 1,
      stepType: 'INTAKE',
      authorityFunctionCode: CANNABIS_AUTHORITY.intake,
      authorityActionType: 'PREPARE',
      consequenceLevel: 'INFORMATIONAL',
    },
    {
      stageKey: 'completeness',
      label: 'Completeness review',
      displayOrder: 2,
      stepType: 'COMPLETENESS_REVIEW',
      authorityFunctionCode: CANNABIS_AUTHORITY.intake,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'ADMINISTRATIVE',
    },
    {
      stageKey: 'due-diligence',
      label: 'Due diligence and ownership review',
      displayOrder: 3,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: CANNABIS_AUTHORITY.dueDiligence,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    },
  ];

  let displayOrder = 4;
  if (definition.requiresSiteEvidence) {
    workflowStages.push({
      stageKey: 'site-facility-review',
      label: 'Site and facility review',
      displayOrder,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: CANNABIS_AUTHORITY.siteReview,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
  }

  if (definition.requiresConsultation) {
    workflowStages.push({
      stageKey: 'consultation-referral',
      label: 'Consultation and referral',
      displayOrder,
      stepType: 'EXTERNAL_REFERRAL',
      authorityFunctionCode: CANNABIS_AUTHORITY.consultation,
      authorityActionType: 'VERIFY',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
  }

  if (definition.serviceType === 'INSPECTION') {
    workflowStages.push({
      stageKey: 'inspection',
      label: 'Inspection coordination',
      displayOrder,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: CANNABIS_AUTHORITY.inspect,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
  }

  workflowStages.push(
    {
      stageKey: 'decision',
      label: 'Licensing decision',
      displayOrder,
      stepType: 'DECISION_GATE',
      authorityFunctionCode: CANNABIS_AUTHORITY.decide,
      authorityActionType: 'DECIDE',
      consequenceLevel: 'CONSEQUENTIAL',
      isDecisionStage: true,
    },
    {
      stageKey: 'issuance',
      label: 'Licence instrument issuance',
      displayOrder: displayOrder + 1,
      stepType: 'ISSUANCE_GATE',
      authorityFunctionCode: CANNABIS_AUTHORITY.issue,
      authorityActionType: 'ISSUE',
      consequenceLevel: 'CONSEQUENTIAL',
      isIssuanceStage: true,
    },
    {
      stageKey: 'compliance',
      label: 'Compliance monitoring',
      displayOrder: displayOrder + 2,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: CANNABIS_AUTHORITY.complianceReview,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'ADMINISTRATIVE',
    },
  );

  const evidenceCodes = [
    'TEMPLATE-CA-OWNERSHIP',
    'TEMPLATE-CA-DUE-DILIGENCE',
    'TEMPLATE-CA-SITE-FACILITY',
    'TEMPLATE-CA-OPERATING-PLAN',
    'TEMPLATE-CA-PROFESSIONAL-ATTESTATION',
  ];

  return {
    serviceCode,
    serviceSlug: slugFromKey(definition.key),
    serviceName: definition.name,
    serviceFamilyCode: CANNABIS_SERVICE_FAMILY_CODE,
    serviceType: definition.serviceType,
    description: `${definition.name} — NON_PRODUCTION placeholder cannabis administration service; licence categories remain jurisdiction configuration.`,
    applicantCategories: ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
    authorityFunctions: [
      {
        functionCode: CANNABIS_AUTHORITY.intake,
        publicStageLabel: 'Intake',
        authorityActionType: 'PREPARE',
        sequenceOrder: 1,
        isConsequential: false,
      },
      {
        functionCode: CANNABIS_AUTHORITY.decide,
        publicStageLabel: 'Decision',
        authorityActionType: 'DECIDE',
        sequenceOrder: 2,
        isConsequential: true,
      },
      {
        functionCode: CANNABIS_AUTHORITY.issue,
        publicStageLabel: 'Issuance',
        authorityActionType: 'ISSUE',
        sequenceOrder: 3,
        isConsequential: true,
      },
      {
        functionCode: CANNABIS_AUTHORITY.suspend,
        publicStageLabel: 'Suspension',
        authorityActionType: 'DECIDE',
        sequenceOrder: 4,
        isConsequential: true,
      },
      {
        functionCode: CANNABIS_AUTHORITY.appeal,
        publicStageLabel: 'Appeal / redress',
        authorityActionType: 'REVIEW',
        sequenceOrder: 5,
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
            sectionKey: 'licence-category',
            label: 'Configured licence category',
            fields: [
              {
                fieldKey: 'licenceCategoryCode',
                label: 'Licence category (jurisdiction-configured)',
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
      label: evidenceCode.replace('TEMPLATE-CA-', '').replace(/-/g, ' '),
      description: 'Template cannabis administration evidence placeholder',
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
    dependencies: definition.requiresConsultation
      ? [
          {
            dependencyCode: 'TEMPLATE-CA-CONFIGURED-CONSULTATION',
            dependencyType: 'EXTERNAL_AUTHORITY',
            description: 'Configured consultation or referral (when required)',
          },
        ]
      : [],
    decisionStages: [
      {
        stageKey: 'decision',
        decisionActorFunctionCode: CANNABIS_AUTHORITY.decide,
        requiresSecondApproval: false,
      },
    ],
    outputs: [
      {
        outputCode: `${serviceCode}-LICENCE-INSTRUMENT`,
        label: 'Cannabis licence official instrument',
        outputType: 'LICENCE_RECORD',
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
        label: 'Configured regulatory fee',
        amount: 0,
        currencyCode: 'USD',
        waivable: true,
      },
    ],
    issuance: {
      issuanceStageKey: 'issuance',
      issuanceFunctionCode: CANNABIS_AUTHORITY.issue,
      outputCodes: [`${serviceCode}-LICENCE-INSTRUMENT`],
    },
    lifecycle: {
      supportsRenewal: definition.serviceType === 'RENEWAL',
      renewalServiceCode:
        definition.serviceType === 'RENEWAL'
          ? `${CANNABIS_SERVICE_CODE_PREFIX}LICENCE-RENEWAL`
          : undefined,
      validityPeriodDays: 365,
    },
    redress: [],
    dashboardIndicators: [
      {
        indicatorCode: `${serviceCode}-QUEUE`,
        label: 'Cannabis administration review queue',
        metricType: 'QUEUE_DEPTH',
      },
    ],
  };
}

export const CANNABIS_ADMINISTRATION_SERVICES: ServicePackServiceDefinition[] =
  CANNABIS_TEMPLATE_SERVICE_DEFINITIONS.map((definition) => cannabisTemplateService(definition));

export const CANNABIS_ADMINISTRATION_SERVICE_PACK_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: CANNABIS_ADMINISTRATION_SERVICE_PACK_ID,
  packVersion: '1.0.0',
  packName: 'Cannabis Administration and Licensing Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Cannabis licence applications, renewals, compliance, inspections, consultation, and enforcement coordination. Licence categories and lawful authority remain jurisdiction configuration and governing instruments.',
  institutionCode: CANNABIS_INSTITUTION_CODE,
  departmentCode: CANNABIS_DEPARTMENT_CODE,
  deploymentIntent: DEPLOYMENT_INTENT,
  services: CANNABIS_ADMINISTRATION_SERVICES,
};
