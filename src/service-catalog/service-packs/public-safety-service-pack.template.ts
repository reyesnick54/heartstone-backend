import {
  PUBLIC_SAFETY_AUTHORITY,
  PUBLIC_SAFETY_DEPARTMENT_CODE,
  PUBLIC_SAFETY_SERVICE_FAMILY_CODE,
  PUBLIC_SAFETY_SERVICE_PACK_ID,
  PUBLIC_SAFETY_TEMPLATE_SERVICE_DEFINITIONS,
} from '../../public-safety/public-safety.constants';
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
  return `template-ps-${key.toLowerCase()}`;
}

function publicSafetyTemplateService(
  key: string,
  name: string,
  serviceType: string,
  applicantCategories: string[],
  options?: { decisionFunction?: string; issuanceFunction?: string; requiresExternal?: boolean },
): ServicePackServiceDefinition {
  const serviceCode = `TEMPLATE-PS-${key}`;
  const decisionFunction = options?.decisionFunction ?? PUBLIC_SAFETY_AUTHORITY.verify;
  const issuanceFunction = options?.issuanceFunction ?? PUBLIC_SAFETY_AUTHORITY.verify;

  const workflowStages: ServicePackServiceDefinition['workflowStages'] = [
    {
      stageKey: 'intake',
      label: 'Public safety intake',
      displayOrder: 1,
      stepType: 'INTAKE',
      authorityFunctionCode: PUBLIC_SAFETY_AUTHORITY.intake,
      authorityActionType: 'PREPARE',
      consequenceLevel: 'INFORMATIONAL',
    },
    {
      stageKey: 'verification',
      label: 'Verification review',
      displayOrder: 2,
      stepType: 'COMPLETENESS_REVIEW',
      authorityFunctionCode: PUBLIC_SAFETY_AUTHORITY.verify,
      authorityActionType: 'VERIFY',
      consequenceLevel: 'ADMINISTRATIVE',
    },
    {
      stageKey: 'substantive-review',
      label: 'Substantive review',
      displayOrder: 3,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: decisionFunction,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    },
  ];

  let displayOrder = 4;
  if (options?.requiresExternal) {
    workflowStages.push({
      stageKey: 'external-coordination',
      label: 'External authority coordination',
      displayOrder,
      stepType: 'EXTERNAL_REFERRAL',
      authorityFunctionCode: PUBLIC_SAFETY_AUTHORITY.externalCoord,
      authorityActionType: 'VERIFY',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
  }

  if (serviceType === 'INSPECTION') {
    workflowStages.push({
      stageKey: 'inspection',
      label: 'Inspection scheduling',
      displayOrder,
      stepType: 'INTERNAL_COORDINATION',
      authorityFunctionCode: PUBLIC_SAFETY_AUTHORITY.inspectionSchedule,
      authorityActionType: 'INSPECT',
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
    serviceFamilyCode: PUBLIC_SAFETY_SERVICE_FAMILY_CODE,
    serviceType,
    description: `${name} — NON_PRODUCTION placeholder public safety & emergency service.`,
    applicantCategories,
    authorityFunctions: [
      {
        functionCode: PUBLIC_SAFETY_AUTHORITY.intake,
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
            sectionKey: 'incident',
            label: 'Incident / impact placeholder',
            fields: [
              {
                fieldKey: 'summary',
                label: 'Summary',
                fieldType: 'TEXT',
                required: true,
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
        label: 'Public safety review SLA',
        targetDays: 14,
        clockStartsAtStageKey: 'intake',
      },
    ],
    fees: [],
    outputs: [
      {
        outputCode: `${serviceCode}-OUTPUT`,
        label: `${name} output`,
        outputType: 'CONFIRMATION',
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
    dependencies: [],
    decisionStages: [
      {
        stageKey: 'decision',
        decisionActorFunctionCode: decisionFunction,
        requiresSecondApproval: serviceType === 'PERMIT' || serviceType === 'ASSISTANCE',
      },
    ],
    issuance: {
      issuanceStageKey: 'decision',
      issuanceFunctionCode: issuanceFunction,
      outputCodes: [`${serviceCode}-OUTPUT`],
    },
    lifecycle: { supportsRenewal: false },
    redress:
      serviceType === 'REDRESS'
        ? [
            {
              routeCode: `${serviceCode}-APPEAL`,
              label: 'Public safety appeal route',
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

export const PUBLIC_SAFETY_SERVICES: ServicePackServiceDefinition[] =
  PUBLIC_SAFETY_TEMPLATE_SERVICE_DEFINITIONS.map((definition) => {
    const isBusinessHeavy =
      definition.key.includes('PERMIT') ||
      definition.key.includes('FIRE') ||
      definition.key.includes('INFRASTRUCTURE') ||
      definition.key.includes('RECOVERY');
    const isAppeal = definition.serviceType === 'REDRESS';
    const isAssistance =
      definition.serviceType === 'ASSISTANCE' || definition.key.includes('RELIEF');
    const isInspection = definition.serviceType === 'INSPECTION';

    return publicSafetyTemplateService(
      definition.key,
      definition.name,
      definition.serviceType,
      isBusinessHeavy
        ? ['INDIVIDUAL', 'BUSINESS', 'COMPANY']
        : ['INDIVIDUAL', 'BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
      {
        decisionFunction: isAppeal
          ? PUBLIC_SAFETY_AUTHORITY.appealDecide
          : isAssistance
            ? PUBLIC_SAFETY_AUTHORITY.assistanceReview
            : isInspection
              ? PUBLIC_SAFETY_AUTHORITY.inspectionVerify
              : definition.key.includes('RECOVERY')
                ? PUBLIC_SAFETY_AUTHORITY.recoveryDetermine
                : PUBLIC_SAFETY_AUTHORITY.verify,
        issuanceFunction: isAssistance
          ? PUBLIC_SAFETY_AUTHORITY.assistanceReview
          : PUBLIC_SAFETY_AUTHORITY.verify,
        requiresExternal:
          definition.key.includes('DISASTER') || definition.key.includes('INFRASTRUCTURE'),
      },
    );
  });

export const PUBLIC_SAFETY_SERVICE_PACK_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: PUBLIC_SAFETY_SERVICE_PACK_ID,
  packVersion: '1.0.0',
  packName: 'Public Safety & Emergency Government Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Public safety reporting, emergency assistance, inspections, recovery programs, and official notice workflows without jurisdiction-specific emergency powers.',
  institutionCode: 'TEMPLATE-INSTITUTION',
  departmentCode: PUBLIC_SAFETY_DEPARTMENT_CODE,
  deploymentIntent: DEPLOYMENT_INTENT,
  services: PUBLIC_SAFETY_SERVICES,
};
