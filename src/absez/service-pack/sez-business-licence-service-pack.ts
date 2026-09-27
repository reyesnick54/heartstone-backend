import {
  SERVICE_PACK_NON_PRODUCTION_LABEL,
  SERVICE_PACK_SCHEMA_VERSION,
} from '../../service-catalog/service-packs/service-pack.constants';
import { type ServicePackManifest, type ServicePackServiceDefinition } from '../../service-catalog/service-packs/service-pack.types';
import {
  ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES,
  ABSEZ_SEZ_DEPARTMENT_CODE,
  ABSEZ_SEZ_INSTITUTION_CODE,
  ABSEZ_SEZ_LICENCE_SERVICE_PACK_ID,
  ABSEZ_SEZ_SERVICE_FAMILY_CODE,
  ABSEZ_SEZ_TEMPLATE_SERVICE_CODES,
} from '../absez.constants';

const DEPLOYMENT_INTENT = {
  targetMaturityStatus: 'DRAFT' as const,
  targetPublicAvailability: 'UNDER_DEVELOPMENT' as const,
  requiresInstitutionalAcceptance: true as const,
  requiresOperationalActivation: true as const,
};

function sezLicenceService(input: {
  serviceCode: string;
  serviceSlug: string;
  serviceName: string;
  description: string;
  serviceType: string;
  decisionFunction: string;
  issuanceFunction?: string;
  supportsRenewal?: boolean;
  includesRedress?: boolean;
}): ServicePackServiceDefinition {
  const issuanceFunction = input.issuanceFunction ?? ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.ISSUE;

  const workflowStages = [
    {
      stageKey: 'intake',
      label: 'Intake',
      displayOrder: 1,
      stepType: 'INTAKE',
      consequenceLevel: 'INFORMATIONAL',
    },
    {
      stageKey: 'completeness',
      label: 'Completeness review',
      displayOrder: 2,
      stepType: 'COMPLETENESS_REVIEW',
      authorityFunctionCode: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.COMPLETENESS,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'ADMINISTRATIVE',
    },
    {
      stageKey: 'substantive',
      label: 'SEZ licensing review',
      displayOrder: 3,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.SUBSTANTIVE_REVIEW,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    },
    {
      stageKey: 'decision',
      label: 'Licensing decision',
      displayOrder: 4,
      stepType: 'DECISION_GATE',
      authorityFunctionCode: input.decisionFunction,
      authorityActionType: 'APPROVE',
      consequenceLevel: 'CONSEQUENTIAL',
      isDecisionStage: true,
    },
    {
      stageKey: 'issuance',
      label: 'Licence issuance',
      displayOrder: 5,
      stepType: 'ISSUANCE_GATE',
      authorityFunctionCode: issuanceFunction,
      authorityActionType: 'ISSUE',
      consequenceLevel: 'CONSEQUENTIAL',
      isIssuanceStage: true,
    },
  ];

  return {
    serviceCode: input.serviceCode,
    serviceSlug: input.serviceSlug,
    serviceName: input.serviceName,
    serviceFamilyCode: ABSEZ_SEZ_SERVICE_FAMILY_CODE,
    serviceType: input.serviceType,
    description: `${input.description} NON_PRODUCTION ABSEZ SEZ licensing template.`,
    applicantCategories: ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE', 'INVESTOR'],
    authorityFunctions: [
      {
        functionCode: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.INTAKE,
        publicStageLabel: 'SEZ licence intake',
        authorityActionType: 'PREPARE',
        sequenceOrder: 1,
        isConsequential: false,
      },
      {
        functionCode: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.COMPLETENESS,
        publicStageLabel: 'Completeness review',
        authorityActionType: 'REVIEW',
        sequenceOrder: 2,
        isConsequential: false,
      },
      {
        functionCode: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.SUBSTANTIVE_REVIEW,
        publicStageLabel: 'Substantive licensing review',
        authorityActionType: 'REVIEW',
        sequenceOrder: 3,
        isConsequential: false,
      },
      {
        functionCode: input.decisionFunction,
        publicStageLabel: 'Licensing decision',
        authorityActionType: 'APPROVE',
        sequenceOrder: 4,
        isConsequential: true,
      },
      {
        functionCode: issuanceFunction,
        publicStageLabel: 'Licence issuance',
        authorityActionType: 'ISSUE',
        sequenceOrder: 5,
        isConsequential: true,
      },
    ],
    forms: [
      {
        formCode: `${input.serviceCode}-FORM`,
        formName: `${input.serviceName} application`,
        versionLabel: '1.0.0-NON_PRODUCTION',
        sections: [
          {
            sectionKey: 'enterprise',
            label: 'Zone enterprise',
            fields: [
              {
                fieldKey: 'organizationId',
                label: 'Registered organization',
                fieldType: 'TEXT',
                required: true,
              },
              {
                fieldKey: 'activityCategories',
                label: 'Approved activity categories',
                fieldType: 'MULTI_SELECT',
                required: true,
              },
            ],
          },
        ],
      },
    ],
    evidenceRequirements: [
      {
        evidenceCode: `${input.serviceCode}-CORPORATE-REGISTRY`,
        label: 'Corporate registry extract',
        description: 'NON_PRODUCTION corporate registration evidence',
        required: true,
        verificationCategory: 'ISSUER',
      },
      {
        evidenceCode: `${input.serviceCode}-BENEFICIAL-OWNERSHIP`,
        label: 'Beneficial ownership declaration',
        description: 'Structured beneficial ownership evidence',
        required: true,
        verificationCategory: 'CONTENT_FACT',
      },
    ],
    completenessReview: {
      enabled: true,
      requiredEvidenceCodes: [
        `${input.serviceCode}-CORPORATE-REGISTRY`,
        `${input.serviceCode}-BENEFICIAL-OWNERSHIP`,
      ],
    },
    fees: [
      {
        feeCode: `${input.serviceCode}-FEE`,
        label: 'SEZ licence application fee',
        amount: 750,
        currencyCode: 'USD',
        waivable: true,
      },
    ],
    decisionStages: [
      {
        stageKey: 'decision',
        decisionActorFunctionCode: input.decisionFunction,
        requiresSecondApproval: false,
      },
    ],
    issuance: {
      issuanceStageKey: 'issuance',
      issuanceFunctionCode: issuanceFunction,
      outputCodes: [`${input.serviceCode}-LICENCE-INSTRUMENT`],
    },
    outputs: [
      {
        outputCode: `${input.serviceCode}-LICENCE-INSTRUMENT`,
        label: 'SEZ business licence instrument',
        outputType: 'LICENCE',
        deliveryChannel: 'PORTAL',
      },
    ],
    lifecycle: input.supportsRenewal
      ? {
          supportsRenewal: true,
          renewalServiceCode: ABSEZ_SEZ_TEMPLATE_SERVICE_CODES.RENEW,
          validityPeriodDays: 365,
        }
      : { supportsRenewal: false },
    redress: input.includesRedress
      ? [
          {
            routeCode: `${input.serviceCode}-APPEAL`,
            label: 'SEZ licensing appeal',
            routeType: 'APPEAL',
            description: `Appeal route via ${ABSEZ_SEZ_TEMPLATE_SERVICE_CODES.APPEAL}`,
          },
        ]
      : [],
    slaRules: [
      {
        ruleCode: `${input.serviceCode}-SLA`,
        label: `${input.serviceName} SLA`,
        targetDays: 10,
        clockStartsAtStageKey: 'intake',
      },
    ],
    communications: [],
    dependencies: [],
    dashboardIndicators: [
      {
        indicatorCode: `${input.serviceCode}-QUEUE`,
        label: `${input.serviceName} queue depth`,
        metricType: 'QUEUE_DEPTH',
      },
    ],
    workflowStages,
  };
}

export const ABSEZ_SEZ_LICENCE_SERVICE_DEFINITIONS: ServicePackServiceDefinition[] = [
  sezLicenceService({
    serviceCode: ABSEZ_SEZ_TEMPLATE_SERVICE_CODES.APPLY,
    serviceSlug: 'template-absez-sez-business-licence',
    serviceName: 'SEZ Business Licence',
    description: 'Apply for an ABSEZ special economic zone business licence',
    serviceType: 'APPLICATION',
    decisionFunction: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.DECIDE,
    supportsRenewal: true,
    includesRedress: true,
  }),
  sezLicenceService({
    serviceCode: ABSEZ_SEZ_TEMPLATE_SERVICE_CODES.RENEW,
    serviceSlug: 'template-absez-sez-licence-renewal',
    serviceName: 'SEZ Business Licence Renewal',
    description: 'Renew an ABSEZ SEZ business licence',
    serviceType: 'RENEWAL',
    decisionFunction: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.DECIDE,
    supportsRenewal: false,
    includesRedress: true,
  }),
  sezLicenceService({
    serviceCode: ABSEZ_SEZ_TEMPLATE_SERVICE_CODES.SUSPEND,
    serviceSlug: 'template-absez-sez-licence-suspension',
    serviceName: 'SEZ Business Licence Suspension',
    description: 'Suspend an ABSEZ SEZ business licence',
    serviceType: 'ADMINISTRATIVE',
    decisionFunction: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.SUSPEND,
    issuanceFunction: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.SUSPEND,
    includesRedress: true,
  }),
  sezLicenceService({
    serviceCode: ABSEZ_SEZ_TEMPLATE_SERVICE_CODES.REVOKE,
    serviceSlug: 'template-absez-sez-licence-revocation',
    serviceName: 'SEZ Business Licence Revocation',
    description: 'Revoke an ABSEZ SEZ business licence',
    serviceType: 'ADMINISTRATIVE',
    decisionFunction: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.REVOKE,
    issuanceFunction: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.REVOKE,
    includesRedress: true,
  }),
  sezLicenceService({
    serviceCode: ABSEZ_SEZ_TEMPLATE_SERVICE_CODES.APPEAL,
    serviceSlug: 'template-absez-sez-licence-appeal',
    serviceName: 'SEZ Business Licence Appeal',
    description: 'Appeal route for ABSEZ SEZ licensing decisions',
    serviceType: 'REDRESS',
    decisionFunction: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.APPEAL,
    issuanceFunction: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.APPEAL,
    includesRedress: false,
  }),
];

export const ABSEZ_SEZ_BUSINESS_LICENCE_SERVICE_PACK: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: ABSEZ_SEZ_LICENCE_SERVICE_PACK_ID,
  packVersion: '1.0.0',
  packName: 'ABSEZ SEZ Business Licensing Service Pack',
  description:
    'NON_PRODUCTION ABSEZ special economic zone business licensing templates with decision, issuance, renewal, suspension, revocation, and appeal routes. TEMPLATE ONLY — not verified law or policy.',
  institutionCode: ABSEZ_SEZ_INSTITUTION_CODE,
  departmentCode: ABSEZ_SEZ_DEPARTMENT_CODE,
  deploymentIntent: DEPLOYMENT_INTENT,
  services: ABSEZ_SEZ_LICENCE_SERVICE_DEFINITIONS,
};
