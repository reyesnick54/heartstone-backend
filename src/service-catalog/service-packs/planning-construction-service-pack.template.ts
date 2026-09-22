import {
  PLANNING_AUTHORITY,
  PLANNING_CONSTRUCTION_DEPARTMENT_CODE,
  PLANNING_CONSTRUCTION_SERVICE_FAMILY_CODE,
  PLANNING_CONSTRUCTION_SERVICE_PACK_ID,
  PLANNING_TEMPLATE_SERVICE_DEFINITIONS,
} from '../../planning-construction/planning-construction.constants';
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

function planningTemplateService(
  key: string,
  name: string,
  serviceType: string,
  applicantCategories: string[],
  options?: { decisionFunction?: string; issuanceFunction?: string; requiresExternal?: boolean },
): ServicePackServiceDefinition {
  const serviceCode = `TEMPLATE-PC-${key}`;
  const decisionFunction = options?.decisionFunction ?? PLANNING_AUTHORITY.review;
  const issuanceFunction = options?.issuanceFunction ?? PLANNING_AUTHORITY.permitIssue;

  const workflowStages: ServicePackServiceDefinition['workflowStages'] = [
    {
      stageKey: 'intake',
      label: 'Planning intake',
      displayOrder: 1,
      stepType: 'INTAKE',
      authorityFunctionCode: PLANNING_AUTHORITY.intake,
      authorityActionType: 'PREPARE',
      consequenceLevel: 'INFORMATIONAL',
    },
    {
      stageKey: 'completeness',
      label: 'Completeness review',
      displayOrder: 2,
      stepType: 'COMPLETENESS_REVIEW',
      authorityFunctionCode: PLANNING_AUTHORITY.intake,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'ADMINISTRATIVE',
    },
    {
      stageKey: 'substantive-review',
      label: 'Substantive review',
      displayOrder: 3,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: PLANNING_AUTHORITY.review,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    },
  ];

  let displayOrder = 4;
  if (options?.requiresExternal) {
    workflowStages.push({
      stageKey: 'external-referral',
      label: 'External authority referral',
      displayOrder,
      stepType: 'EXTERNAL_REFERRAL',
      authorityFunctionCode: PLANNING_AUTHORITY.externalReferral,
      authorityActionType: 'VERIFY',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
  }

  if (serviceType === 'INSPECTION') {
    workflowStages.push({
      stageKey: 'inspection',
      label: 'Construction inspection',
      displayOrder,
      stepType: 'INTERNAL_COORDINATION',
      authorityFunctionCode: PLANNING_AUTHORITY.inspectionConduct,
      authorityActionType: 'INSPECT',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
  }

  if (key.includes('PROFESSIONAL')) {
    workflowStages.push({
      stageKey: 'professional-review',
      label: 'Professional document review',
      displayOrder,
      stepType: 'PROFESSIONAL_REVIEW',
      authorityFunctionCode: PLANNING_AUTHORITY.professionalReview,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
  }

  workflowStages.push({
    stageKey: 'decision',
    label: 'Official decision',
    displayOrder,
    stepType: 'DECISION_GATE',
    authorityFunctionCode: decisionFunction,
    authorityActionType: 'DECIDE',
    consequenceLevel: 'CONSEQUENTIAL',
    isDecisionStage: true,
  });

  return {
    serviceCode,
    serviceSlug: slugFromKey(key),
    serviceName: name,
    serviceFamilyCode: PLANNING_CONSTRUCTION_SERVICE_FAMILY_CODE,
    serviceType,
    description: `${name} — NON_PRODUCTION placeholder planning/construction service.`,
    applicantCategories,
    authorityFunctions: [
      {
        functionCode: PLANNING_AUTHORITY.intake,
        publicStageLabel: 'Intake',
        authorityActionType: 'PREPARE',
        sequenceOrder: 1,
        isConsequential: false,
      },
      {
        functionCode: decisionFunction,
        publicStageLabel: 'Official determination',
        authorityActionType: 'DECIDE',
        sequenceOrder: 2,
        isConsequential: true,
      },
    ],
    forms: [
      {
        formCode: `${serviceCode}-FORM`,
        formName: `${name} form`,
        versionLabel: '1.0.0-NON_PRODUCTION',
        sections: [
          {
            sectionKey: 'site',
            label: 'Site / property placeholder',
            fields: [
              {
                fieldKey: 'siteDescription',
                label: 'Site description',
                fieldType: 'TEXT',
                required: false,
              },
            ],
          },
        ],
      },
    ],
    evidenceRequirements: [
      {
        evidenceCode: `${serviceCode}-EVIDENCE`,
        label: 'Placeholder supporting evidence',
        description: 'NON_PRODUCTION evidence requirement',
        required: false,
        verificationCategory: 'CONTENT_FACT',
      },
    ],
    workflowStages,
    completenessReview: {
      enabled: true,
      requiredEvidenceCodes: [`${serviceCode}-EVIDENCE`],
    },
    slaRules: [
      {
        ruleCode: `${serviceCode}-SLA`,
        label: 'Placeholder SLA',
        targetDays: 30,
        clockStartsAtStageKey: 'intake',
      },
    ],
    fees: [
      {
        feeCode: `${serviceCode}-FEE`,
        label: 'Placeholder fee',
        amount: 0,
        currencyCode: 'XCD',
        waivable: true,
      },
    ],
    outputs: [
      {
        outputCode: `${serviceCode}-OUTPUT`,
        label: 'Placeholder output',
        outputType: 'NOTICE',
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
    dependencies: [
      {
        dependencyCode: `${serviceCode}-PAYMENT`,
        dependencyType: 'PAYMENT_PROVIDER',
        description: 'Uses HeartStone payment infrastructure when configured',
      },
    ],
    decisionStages: [
      {
        stageKey: 'decision',
        decisionActorFunctionCode: decisionFunction,
        requiresSecondApproval: serviceType === 'PERMIT' || serviceType === 'CERTIFICATE',
      },
    ],
    issuance: {
      issuanceStageKey: 'decision',
      issuanceFunctionCode: issuanceFunction,
      outputCodes: [`${serviceCode}-OUTPUT`],
    },
    lifecycle: { supportsRenewal: serviceType === 'PERMIT' },
    redress:
      serviceType === 'REDRESS'
        ? [
            {
              routeCode: `${serviceCode}-APPEAL`,
              label: 'Planning appeal route',
              routeType: 'APPEAL',
              description: 'NON_PRODUCTION appeal route',
            },
          ]
        : [],
    dashboardIndicators: [
      {
        indicatorCode: `${serviceCode}-QUEUE`,
        label: 'Queue depth',
        metricType: 'COUNT',
      },
    ],
  };
}

export const PLANNING_CONSTRUCTION_SERVICES: ServicePackServiceDefinition[] =
  PLANNING_TEMPLATE_SERVICE_DEFINITIONS.map((definition) => {
    const isPermit = definition.serviceType === 'PERMIT';
    const isCertificate = definition.serviceType === 'CERTIFICATE';
    const isZoning = definition.key === 'ZONING-LAND-USE';
    const isAppeal = definition.serviceType === 'REDRESS';
    const isProfessional = definition.key.includes('PROFESSIONAL');

    return planningTemplateService(
      definition.key,
      definition.name,
      definition.serviceType,
      isProfessional
        ? ['PROFESSIONAL', 'BUSINESS', 'COMPANY']
        : ['INDIVIDUAL', 'BUSINESS', 'COMPANY'],
      {
        decisionFunction: isZoning
          ? PLANNING_AUTHORITY.zoningDecide
          : isAppeal
            ? PLANNING_AUTHORITY.appealDecide
            : isCertificate
              ? PLANNING_AUTHORITY.occupancyIssue
              : PLANNING_AUTHORITY.review,
        issuanceFunction: isCertificate
          ? PLANNING_AUTHORITY.occupancyIssue
          : isPermit
            ? PLANNING_AUTHORITY.permitIssue
            : PLANNING_AUTHORITY.review,
        requiresExternal: isZoning || isPermit,
      },
    );
  });

export const PLANNING_CONSTRUCTION_SERVICE_PACK_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: PLANNING_CONSTRUCTION_SERVICE_PACK_ID,
  packVersion: '1.0.0',
  packName: 'Planning, Development & Construction Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Planning, development, permitting, inspection, occupancy, and appeal services with jurisdiction-specific rules remaining template placeholders.',
  institutionCode: 'TEMPLATE-INSTITUTION',
  departmentCode: PLANNING_CONSTRUCTION_DEPARTMENT_CODE,
  deploymentIntent: DEPLOYMENT_INTENT,
  services: PLANNING_CONSTRUCTION_SERVICES,
};
