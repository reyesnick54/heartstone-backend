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

const PROPERTY_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-PROPERTY-INTAKE',
  verify: 'TEMPLATE-AUTH-PROPERTY-VERIFY',
  titleReview: 'TEMPLATE-AUTH-PROPERTY-TITLE-REVIEW',
  transferDecide: 'TEMPLATE-AUTH-PROPERTY-TRANSFER-DECIDE',
  registerTransfer: 'TEMPLATE-AUTH-PROPERTY-REGISTER-TRANSFER',
  surveyVerify: 'TEMPLATE-AUTH-PROPERTY-SURVEY-VERIFY',
  encumbranceDecide: 'TEMPLATE-AUTH-PROPERTY-ENCUMBRANCE-DECIDE',
  certificateIssue: 'TEMPLATE-AUTH-PROPERTY-CERTIFICATE-ISSUE',
  externalRegistry: 'TEMPLATE-AUTH-PROPERTY-EXTERNAL-REGISTRY-CHECK',
  valuationDecide: 'TEMPLATE-AUTH-PROPERTY-VALUATION-DECIDE',
  appealDecide: 'TEMPLATE-AUTH-PROPERTY-APPEAL-DECIDE',
};

const SHARED_PROPERTY_DEPENDENCIES = [
  {
    dependencyCode: 'TEMPLATE-PROP-PARCEL-ID-SCHEME',
    dependencyType: 'CONFIGURATION',
    description: 'NON_PRODUCTION jurisdiction-bound parcel identifier scheme',
  },
  {
    dependencyCode: 'TEMPLATE-PROP-SURVEYOR-LICENSE',
    dependencyType: 'PROFESSIONAL',
    description: 'NON_PRODUCTION licensed surveyor verification dependency',
  },
  {
    dependencyCode: 'TEMPLATE-PROP-TITLE-VERIFICATION',
    dependencyType: 'VERIFICATION',
    description: 'NON_PRODUCTION title verification workflow dependency',
  },
  {
    dependencyCode: 'TEMPLATE-PROP-EXTERNAL-REGISTRY',
    dependencyType: 'INTEGRATION',
    description: 'Optional external land registry integration',
    externalIntegrationCode: 'TEMPLATE-PROP-EXTERNAL-LAND-REGISTRY-API',
  },
  {
    dependencyCode: 'TEMPLATE-PROP-TAX-TRANSFER',
    dependencyType: 'INTEGRATION',
    description: 'NON_PRODUCTION revenue/tax transfer fee dependency hook',
    externalIntegrationCode: 'TEMPLATE-REV-TAX-TRANSFER-FEE',
  },
];

function propertyTemplateService(
  serviceCode: string,
  serviceSlug: string,
  serviceName: string,
  serviceType: string,
  applicantCategories: string[],
  options?: {
    decisionFunction?: string;
    issuanceFunction?: string;
    requiresSurveyor?: boolean;
    requiresTitleReview?: boolean;
  },
): ServicePackServiceDefinition {
  const decisionFunction = options?.decisionFunction ?? PROPERTY_AUTHORITY.verify;
  const issuanceFunction = options?.issuanceFunction ?? PROPERTY_AUTHORITY.certificateIssue;

  const evidenceRequirements = [
    {
      evidenceCode: `${serviceCode}-IDENTITY`,
      label: 'Applicant identity evidence',
      description: 'NON_PRODUCTION identity evidence placeholder',
      required: true,
      verificationCategory: 'INTEGRITY',
    },
    {
      evidenceCode: `${serviceCode}-PARCEL-REF`,
      label: 'Parcel reference evidence',
      description: 'NON_PRODUCTION parcel identifier evidence',
      required: true,
      verificationCategory: 'CONTENT_FACT',
    },
  ];

  if (options?.requiresSurveyor) {
    evidenceRequirements.push({
      evidenceCode: `${serviceCode}-SURVEYOR`,
      label: 'Licensed surveyor attestation',
      description: 'NON_PRODUCTION surveyor professional dependency',
      required: true,
      verificationCategory: 'PROFESSIONAL',
    });
  }

  if (options?.requiresTitleReview) {
    evidenceRequirements.push({
      evidenceCode: `${serviceCode}-TITLE-CHAIN`,
      label: 'Title chain evidence',
      description: 'NON_PRODUCTION title verification evidence',
      required: true,
      verificationCategory: 'ISSUER',
    });
  }

  return {
    serviceCode,
    serviceSlug,
    serviceName,
    serviceFamilyCode: 'TEMPLATE-FAMILY-LAND-PROPERTY',
    serviceType,
    description: `${serviceName} — NON_PRODUCTION placeholder land & property registry service with jurisdiction-bound rules.`,
    applicantCategories,
    authorityFunctions: [
      {
        functionCode: PROPERTY_AUTHORITY.intake,
        publicStageLabel: 'Intake',
        authorityActionType: 'PREPARE',
        sequenceOrder: 1,
        isConsequential: false,
      },
      {
        functionCode: decisionFunction,
        publicStageLabel: 'Official registry determination',
        authorityActionType: 'DECIDE',
        sequenceOrder: 2,
        isConsequential: true,
      },
    ],
    forms: [
      {
        formCode: `${serviceCode}-FORM`,
        formName: `${serviceName} form`,
        versionLabel: '1.0.0-NON_PRODUCTION',
        sections: [
          {
            sectionKey: 'parcel',
            label: 'Parcel identifiers (placeholder)',
            fields: [
              {
                fieldKey: 'parcelReference',
                label: 'Parcel reference',
                fieldType: 'TEXT',
                required: true,
              },
              {
                fieldKey: 'applicantCategory',
                label: 'Applicant category',
                fieldType: 'SELECT',
                required: true,
              },
            ],
          },
        ],
      },
    ],
    evidenceRequirements,
    workflowStages: [
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
        authorityFunctionCode: PROPERTY_AUTHORITY.verify,
        authorityActionType: 'VERIFY',
        consequenceLevel: 'ADMINISTRATIVE',
      },
      {
        stageKey: 'substantive',
        label: 'Substantive registry review',
        displayOrder: 3,
        stepType: 'SUBSTANTIVE_REVIEW',
        authorityFunctionCode: PROPERTY_AUTHORITY.titleReview,
        authorityActionType: 'REVIEW',
        consequenceLevel: 'CONSEQUENTIAL',
      },
      {
        stageKey: 'decision',
        label: 'Official decision',
        displayOrder: 4,
        stepType: 'DECISION_GATE',
        authorityFunctionCode: decisionFunction,
        authorityActionType: 'DECIDE',
        consequenceLevel: 'CONSEQUENTIAL',
        isDecisionStage: true,
      },
    ],
    completenessReview: {
      enabled: true,
      requiredEvidenceCodes: evidenceRequirements.map((item) => item.evidenceCode),
    },
    slaRules: [
      {
        ruleCode: `${serviceCode}-SLA`,
        label: 'Placeholder registry SLA',
        targetDays: 30,
        clockStartsAtStageKey: 'intake',
      },
    ],
    fees: [
      {
        feeCode: `${serviceCode}-FEE`,
        label: 'Placeholder registry fee',
        amount: 0,
        currencyCode: 'XCD',
        waivable: true,
      },
    ],
    outputs: [
      {
        outputCode: `${serviceCode}-OUTPUT`,
        label: 'Registry notice or certificate placeholder',
        outputType: 'CERTIFICATE',
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
    dependencies: [...SHARED_PROPERTY_DEPENDENCIES],
    decisionStages: [
      {
        stageKey: 'decision',
        decisionActorFunctionCode: decisionFunction,
        requiresSecondApproval: true,
      },
    ],
    issuance: {
      issuanceStageKey: 'decision',
      issuanceFunctionCode: issuanceFunction,
      outputCodes: [`${serviceCode}-OUTPUT`],
    },
    lifecycle: { supportsRenewal: false },
    redress: [
      {
        routeCode: `${serviceCode}-APPEAL`,
        label: 'Property registry appeal / review',
        routeType: 'APPEAL',
        description: 'NON_PRODUCTION registry appeal route',
      },
    ],
    dashboardIndicators: [
      {
        indicatorCode: `${serviceCode}-QUEUE`,
        label: 'Registry queue depth',
        metricType: 'COUNT',
      },
      {
        indicatorCode: `${serviceCode}-SLA-RISK`,
        label: 'SLA risk indicator',
        metricType: 'COUNT',
        threshold: 5,
      },
    ],
  };
}

export const PROPERTY_LAND_REGISTRY_SERVICES: ServicePackServiceDefinition[] = [
  propertyTemplateService(
    'TEMPLATE-PROP-SEARCH',
    'template-prop-search',
    'Search Property Registry',
    'INQUIRY',
    ['CITIZEN', 'INDIVIDUAL', 'BUSINESS', 'COMPANY'],
  ),
  propertyTemplateService(
    'TEMPLATE-PROP-EXTRACT',
    'template-prop-extract',
    'Request Title / Property Extract',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    { issuanceFunction: PROPERTY_AUTHORITY.certificateIssue },
  ),
  propertyTemplateService(
    'TEMPLATE-PROP-TRANSFER',
    'template-prop-transfer',
    'Register Property Transfer',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    {
      decisionFunction: PROPERTY_AUTHORITY.transferDecide,
      requiresTitleReview: true,
    },
  ),
  propertyTemplateService(
    'TEMPLATE-PROP-NEW-PARCEL',
    'template-prop-new-parcel',
    'Register New Parcel',
    'REGISTRATION',
    ['BUSINESS', 'COMPANY', 'GOVERNMENT_ENTITY'],
    { decisionFunction: PROPERTY_AUTHORITY.transferDecide, requiresSurveyor: true },
  ),
  propertyTemplateService(
    'TEMPLATE-PROP-SUBDIVISION',
    'template-prop-subdivision',
    'Parcel Subdivision Application',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    { decisionFunction: PROPERTY_AUTHORITY.transferDecide, requiresSurveyor: true },
  ),
  propertyTemplateService(
    'TEMPLATE-PROP-CONSOLIDATION',
    'template-prop-consolidation',
    'Parcel Consolidation Application',
    'APPLICATION',
    ['BUSINESS', 'COMPANY'],
    { decisionFunction: PROPERTY_AUTHORITY.transferDecide, requiresSurveyor: true },
  ),
  propertyTemplateService(
    'TEMPLATE-PROP-ENCUMBRANCE',
    'template-prop-encumbrance',
    'Register Mortgage / Encumbrance',
    'APPLICATION',
    ['BUSINESS', 'COMPANY'],
    { decisionFunction: PROPERTY_AUTHORITY.encumbranceDecide, requiresTitleReview: true },
  ),
  propertyTemplateService(
    'TEMPLATE-PROP-ENCUMBRANCE-RELEASE',
    'template-prop-encumbrance-release',
    'Release Encumbrance',
    'APPLICATION',
    ['BUSINESS', 'COMPANY'],
    { decisionFunction: PROPERTY_AUTHORITY.encumbranceDecide },
  ),
  propertyTemplateService(
    'TEMPLATE-PROP-EASEMENT',
    'template-prop-easement',
    'Register Easement / Restriction',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    { decisionFunction: PROPERTY_AUTHORITY.encumbranceDecide },
  ),
  propertyTemplateService(
    'TEMPLATE-PROP-SURVEY',
    'template-prop-survey',
    'Submit Survey Plan',
    'APPLICATION',
    ['BUSINESS', 'COMPANY', 'PROFESSIONAL'],
    { decisionFunction: PROPERTY_AUTHORITY.surveyVerify, requiresSurveyor: true },
  ),
  propertyTemplateService(
    'TEMPLATE-PROP-CORRECTION',
    'template-prop-correction',
    'Property Record Correction',
    'AMENDMENT',
    ['CITIZEN', 'INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    { decisionFunction: PROPERTY_AUTHORITY.titleReview },
  ),
  propertyTemplateService(
    'TEMPLATE-PROP-ADDRESS-CHANGE',
    'template-prop-address-change',
    'Change Property Address / Administrative Details',
    'AMENDMENT',
    ['CITIZEN', 'INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    { decisionFunction: PROPERTY_AUTHORITY.verify },
  ),
  propertyTemplateService(
    'TEMPLATE-PROP-VALUATION',
    'template-prop-valuation',
    'Request Property Valuation',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'BUSINESS', 'COMPANY', 'GOVERNMENT_ENTITY'],
    { decisionFunction: PROPERTY_AUTHORITY.valuationDecide },
  ),
  propertyTemplateService(
    'TEMPLATE-PROP-APPEAL',
    'template-prop-appeal',
    'Property Registry Appeal / Review',
    'REDRESS',
    ['CITIZEN', 'INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    { decisionFunction: PROPERTY_AUTHORITY.appealDecide },
  ),
];

export const PROPERTY_LAND_REGISTRY_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: 'template-land-property-registry',
  packVersion: '1.0.0',
  packName: 'Land & Property Registry Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Land & Property Registry family with jurisdiction-bound parcel identifiers, forms, evidence, surveyor and title verification dependencies, workflows, fees, tax/transfer hooks, decision functions, issuance, communications, SLAs, redress, and dashboard indicators.',
  institutionCode: 'TEMPLATE-INSTITUTION',
  departmentCode: 'TEMPLATE-DEPARTMENT-LAND-REGISTRY',
  deploymentIntent: DEPLOYMENT_INTENT,
  services: PROPERTY_LAND_REGISTRY_SERVICES,
};
