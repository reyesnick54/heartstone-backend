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

const BENEFIT_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-BENEFIT-INTAKE',
  review: 'TEMPLATE-AUTH-BENEFIT-DETERMINE',
  award: 'TEMPLATE-AUTH-BENEFIT-AWARD',
  suspend: 'TEMPLATE-AUTH-BENEFIT-SUSPEND',
  terminate: 'TEMPLATE-AUTH-BENEFIT-TERMINATE',
  disburse: 'TEMPLATE-AUTH-BENEFIT-DISBURSE',
  appealDecide: 'TEMPLATE-AUTH-BENEFIT-APPEAL-DECIDE',
  external: 'TEMPLATE-AUTH-EXTERNAL-DETERMINATION',
};

function benefitTemplateService(
  serviceCode: string,
  serviceSlug: string,
  serviceName: string,
  serviceType: string,
  applicantCategories: string[],
  options?: {
    decisionFunction?: string;
    issuanceFunction?: string;
    includesExternalDependency?: boolean;
  },
): ServicePackServiceDefinition {
  const decisionFunction = options?.decisionFunction ?? BENEFIT_AUTHORITY.review;
  const issuanceFunction = options?.issuanceFunction ?? BENEFIT_AUTHORITY.award;

  const dependencies: ServicePackServiceDefinition['dependencies'] = [
    {
      dependencyCode: `${serviceCode}-IDENTITY-LOOKUP`,
      dependencyType: 'REGISTRY_LOOKUP',
      description: 'Optional identity registry lookup when configured',
      externalIntegrationCode: 'TEMPLATE-IDENTITY-API',
    },
  ];

  if (options?.includesExternalDependency) {
    dependencies.push({
      dependencyCode: `${serviceCode}-EXTERNAL-DETERMINATION`,
      dependencyType: 'EXTERNAL_AUTHORITY',
      description: 'External determination dependency (does not collapse into award status)',
      externalIntegrationCode: 'TEMPLATE-EXT-DETERMINE-API',
    });
  }

  return {
    serviceCode,
    serviceSlug,
    serviceName,
    serviceFamilyCode: 'TEMPLATE-FAMILY-SOCIAL-PROTECTION',
    serviceType,
    description: `${serviceName} — NON_PRODUCTION social protection template without jurisdiction-specific eligibility thresholds.`,
    applicantCategories,
    authorityFunctions: [
      {
        functionCode: BENEFIT_AUTHORITY.intake,
        publicStageLabel: 'Intake',
        authorityActionType: 'PREPARE',
        sequenceOrder: 1,
        isConsequential: false,
      },
      {
        functionCode: decisionFunction,
        publicStageLabel: 'Official benefit determination',
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
            sectionKey: 'placeholder',
            label: 'Placeholder section',
            fields: [
              {
                fieldKey: 'placeholderField',
                label: 'Placeholder field',
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
    workflowStages: [
      {
        stageKey: 'intake',
        label: 'Intake',
        displayOrder: 1,
        stepType: 'INTAKE',
        consequenceLevel: 'INFORMATIONAL',
      },
      {
        stageKey: 'review',
        label: 'Benefit review',
        displayOrder: 2,
        stepType: 'SUBSTANTIVE_REVIEW',
        authorityFunctionCode: BENEFIT_AUTHORITY.review,
        authorityActionType: 'REVIEW',
        consequenceLevel: 'CONSEQUENTIAL',
      },
      {
        stageKey: 'decision',
        label: 'Official decision',
        displayOrder: 3,
        stepType: 'DECISION_GATE',
        authorityFunctionCode: decisionFunction,
        authorityActionType: 'DECIDE',
        consequenceLevel: 'CONSEQUENTIAL',
        isDecisionStage: true,
      },
    ],
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
    fees: [],
    outputs: [
      {
        outputCode: `${serviceCode}-OUTPUT`,
        label: 'Placeholder output',
        outputType: 'NOTICE',
        deliveryChannel: 'PORTAL',
      },
    ],
    communications: [],
    dependencies,
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
    redress: [],
    dashboardIndicators: [
      {
        indicatorCode: `${serviceCode}-QUEUE`,
        label: 'Queue depth',
        metricType: 'COUNT',
      },
    ],
  };
}

export const SOCIAL_PROTECTION_SERVICES: ServicePackServiceDefinition[] = [
  benefitTemplateService(
    'TEMPLATE-BEN-INCOME-SUPPORT',
    'income-support-application',
    'Income Support Application',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
    { decisionFunction: BENEFIT_AUTHORITY.review, issuanceFunction: BENEFIT_AUTHORITY.award },
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-UNEMPLOYMENT-SUPPORT',
    'unemployment-support-application',
    'Unemployment Support Application',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
    { decisionFunction: BENEFIT_AUTHORITY.review, issuanceFunction: BENEFIT_AUTHORITY.award },
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-FAMILY-ASSISTANCE',
    'family-assistance-application',
    'Family Assistance Application',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
    { decisionFunction: BENEFIT_AUTHORITY.review, issuanceFunction: BENEFIT_AUTHORITY.award },
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-HOUSING-ASSISTANCE',
    'housing-assistance-application',
    'Housing Assistance Application',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
    { decisionFunction: BENEFIT_AUTHORITY.review, issuanceFunction: BENEFIT_AUTHORITY.award },
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-DISABILITY-SUPPORT',
    'disability-support-application',
    'Disability Support Application',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
    { decisionFunction: BENEFIT_AUTHORITY.review, issuanceFunction: BENEFIT_AUTHORITY.award },
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-ELDERLY-SUPPORT',
    'elderly-support-application',
    'Elderly Support Application',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
    { decisionFunction: BENEFIT_AUTHORITY.review, issuanceFunction: BENEFIT_AUTHORITY.award },
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-CHILD-FAMILY-SUPPORT',
    'child-family-support-application',
    'Child / Family Support Application',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
    { decisionFunction: BENEFIT_AUTHORITY.review, issuanceFunction: BENEFIT_AUTHORITY.award },
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-EMERGENCY-ASSISTANCE',
    'emergency-assistance-request',
    'Emergency Assistance Request',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
    { decisionFunction: BENEFIT_AUTHORITY.review, issuanceFunction: BENEFIT_AUTHORITY.award },
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-DISASTER-RELIEF',
    'disaster-relief-application',
    'Disaster Relief Application',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
    {
      decisionFunction: BENEFIT_AUTHORITY.review,
      issuanceFunction: BENEFIT_AUTHORITY.award,
      includesExternalDependency: true,
    },
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-GOVERNMENT-SUBSIDY',
    'government-subsidy-application',
    'Government Subsidy Application',
    'APPLICATION',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT', 'BUSINESS'],
    { decisionFunction: BENEFIT_AUTHORITY.review, issuanceFunction: BENEFIT_AUTHORITY.award },
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-BENEFIT-RENEWAL',
    'benefit-renewal',
    'Benefit Renewal',
    'RENEWAL',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
    { decisionFunction: BENEFIT_AUTHORITY.award },
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-CHANGE-CIRCUMSTANCES',
    'change-of-circumstances',
    'Change of Circumstances',
    'REPORTING',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-PAYMENT-INQUIRY',
    'benefit-payment-inquiry',
    'Benefit Payment Inquiry',
    'INQUIRY',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
    { decisionFunction: BENEFIT_AUTHORITY.disburse },
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-DECISION-REVIEW',
    'benefit-decision-review',
    'Benefit Decision Review',
    'REDRESS',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
    { decisionFunction: BENEFIT_AUTHORITY.review },
  ),
  benefitTemplateService(
    'TEMPLATE-BEN-PUBLIC-BENEFITS-APPEAL',
    'public-benefits-appeal',
    'Public Benefits Appeal',
    'REDRESS',
    ['CITIZEN', 'INDIVIDUAL', 'RESIDENT'],
    { decisionFunction: BENEFIT_AUTHORITY.appealDecide },
  ),
];

export const SOCIAL_PROTECTION_SERVICE_PACK_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: 'template-social-protection-public-benefits',
  packVersion: '1.0.0',
  packName: 'Social Protection & Public Benefits Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Social protection and public benefits family with household profiles, applications, awards, disbursements, changes, appeals, and external determinations.',
  institutionCode: 'TEMPLATE-INSTITUTION',
  departmentCode: 'TEMPLATE-DEPARTMENT-SOCIAL-PROTECTION',
  deploymentIntent: DEPLOYMENT_INTENT,
  services: SOCIAL_PROTECTION_SERVICES,
};
