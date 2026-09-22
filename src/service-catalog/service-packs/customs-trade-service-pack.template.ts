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

const CUSTOMS_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-CUSTOMS-INTAKE',
  verify: 'TEMPLATE-AUTH-CUSTOMS-VERIFY',
  declarationReview: 'TEMPLATE-AUTH-CUSTOMS-DECLARATION-REVIEW',
  releaseAuthorize: 'TEMPLATE-AUTH-CUSTOMS-RELEASE-AUTHORIZE',
  permitDecide: 'TEMPLATE-AUTH-CUSTOMS-PERMIT-DECIDE',
  assessmentIssue: 'TEMPLATE-AUTH-CUSTOMS-ASSESSMENT-ISSUE',
  refundAdjust: 'TEMPLATE-AUTH-CUSTOMS-REFUND-ADJUST',
  appealDecide: 'TEMPLATE-AUTH-CUSTOMS-APPEAL-DECIDE',
};

function customsTemplateService(
  serviceCode: string,
  serviceSlug: string,
  serviceName: string,
  serviceType: string,
  applicantCategories: string[],
  options?: { decisionFunction?: string; issuanceFunction?: string },
): ServicePackServiceDefinition {
  const decisionFunction = options?.decisionFunction ?? CUSTOMS_AUTHORITY.verify;
  const issuanceFunction = options?.issuanceFunction ?? CUSTOMS_AUTHORITY.verify;

  return {
    serviceCode,
    serviceSlug,
    serviceName,
    serviceFamilyCode: 'TEMPLATE-FAMILY-CUSTOMS-TRADE',
    serviceType,
    description: `${serviceName} — NON_PRODUCTION placeholder customs & trade service.`,
    applicantCategories,
    authorityFunctions: [
      {
        functionCode: CUSTOMS_AUTHORITY.intake,
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
        label: 'Customs review',
        displayOrder: 2,
        stepType: 'SUBSTANTIVE_REVIEW',
        authorityFunctionCode: CUSTOMS_AUTHORITY.declarationReview,
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
        targetDays: 15,
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
        communicationCode: `${serviceCode}-REMINDER`,
        triggerStageKey: 'intake',
        channel: 'EMAIL',
        templateCode: `${serviceCode}-REMINDER-TPL`,
      },
    ],
    dependencies: [
      {
        dependencyCode: `${serviceCode}-PAYMENT-PROVIDER`,
        dependencyType: 'PAYMENT_PROVIDER',
        description: 'Uses HeartStone payment infrastructure when configured',
      },
      {
        dependencyCode: `${serviceCode}-PORT-BORDER-INTEGRATION`,
        dependencyType: 'INTEGRATION',
        description: 'Optional port/border external dependency placeholder',
        externalIntegrationCode: 'TEMPLATE-CUSTOMS-PORT-API',
      },
    ],
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
        label: 'Customs appeal / redress',
        routeType: 'APPEAL',
        description: 'NON_PRODUCTION appeal route',
      },
    ],
    dashboardIndicators: [
      {
        indicatorCode: `${serviceCode}-QUEUE`,
        label: 'Queue depth',
        metricType: 'COUNT',
      },
    ],
  };
}

export const CUSTOMS_TRADE_SERVICES: ServicePackServiceDefinition[] = [
  customsTemplateService(
    'TEMPLATE-CUST-REGISTER-IMPORTER',
    'template-cust-register-importer',
    'Register Importer',
    'REGISTRATION',
    ['BUSINESS', 'COMPANY'],
  ),
  customsTemplateService(
    'TEMPLATE-CUST-REGISTER-EXPORTER',
    'template-cust-register-exporter',
    'Register Exporter',
    'REGISTRATION',
    ['BUSINESS', 'COMPANY'],
  ),
  customsTemplateService(
    'TEMPLATE-CUST-AUTHORIZE-BROKER',
    'template-cust-authorize-customs-broker',
    'Register / Authorize Customs Broker',
    'REGISTRATION',
    ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
  ),
  customsTemplateService(
    'TEMPLATE-CUST-SUBMIT-IMPORT-DECLARATION',
    'template-cust-submit-import-declaration',
    'Submit Import Declaration',
    'APPLICATION',
    ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
    { decisionFunction: CUSTOMS_AUTHORITY.declarationReview },
  ),
  customsTemplateService(
    'TEMPLATE-CUST-SUBMIT-EXPORT-DECLARATION',
    'template-cust-submit-export-declaration',
    'Submit Export Declaration',
    'APPLICATION',
    ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
    { decisionFunction: CUSTOMS_AUTHORITY.declarationReview },
  ),
  customsTemplateService(
    'TEMPLATE-CUST-AMEND-DECLARATION',
    'template-cust-amend-customs-declaration',
    'Amend Customs Declaration',
    'AMENDMENT',
    ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
    { decisionFunction: CUSTOMS_AUTHORITY.declarationReview },
  ),
  customsTemplateService(
    'TEMPLATE-CUST-IMPORT-PERMIT',
    'template-cust-apply-import-permit',
    'Apply for Import Permit',
    'APPLICATION',
    ['BUSINESS', 'COMPANY'],
    { decisionFunction: CUSTOMS_AUTHORITY.permitDecide },
  ),
  customsTemplateService(
    'TEMPLATE-CUST-EXPORT-PERMIT',
    'template-cust-apply-export-permit',
    'Apply for Export Permit',
    'APPLICATION',
    ['BUSINESS', 'COMPANY'],
    { decisionFunction: CUSTOMS_AUTHORITY.permitDecide },
  ),
  customsTemplateService(
    'TEMPLATE-CUST-RESTRICTED-GOODS',
    'template-cust-restricted-goods-authorization',
    'Restricted Goods Authorization',
    'APPLICATION',
    ['BUSINESS', 'COMPANY'],
    { decisionFunction: CUSTOMS_AUTHORITY.permitDecide },
  ),
  customsTemplateService(
    'TEMPLATE-CUST-MANIFEST-REFERENCE',
    'template-cust-submit-cargo-manifest-reference',
    'Submit Cargo / Manifest Reference',
    'REPORTING',
    ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
  ),
  customsTemplateService(
    'TEMPLATE-CUST-REQUEST-INSPECTION',
    'template-cust-request-customs-inspection',
    'Request Customs Inspection',
    'APPLICATION',
    ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
  ),
  customsTemplateService(
    'TEMPLATE-CUST-RESPOND-HOLD',
    'template-cust-respond-customs-hold',
    'Respond to Customs Hold',
    'APPLICATION',
    ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
  ),
  customsTemplateService(
    'TEMPLATE-CUST-PAY-ASSESSMENT',
    'template-cust-pay-customs-assessment',
    'Pay Customs Assessment',
    'PAYMENT',
    ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
    { decisionFunction: CUSTOMS_AUTHORITY.assessmentIssue },
  ),
  customsTemplateService(
    'TEMPLATE-CUST-ADJUSTMENT-REFUND',
    'template-cust-request-customs-adjustment-refund',
    'Request Customs Adjustment / Refund',
    'APPLICATION',
    ['BUSINESS', 'COMPANY'],
    { decisionFunction: CUSTOMS_AUTHORITY.refundAdjust },
  ),
  customsTemplateService(
    'TEMPLATE-CUST-RELEASE-REVIEW',
    'template-cust-request-release-review',
    'Request Release Review',
    'APPLICATION',
    ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
    {
      decisionFunction: CUSTOMS_AUTHORITY.releaseAuthorize,
      issuanceFunction: CUSTOMS_AUTHORITY.releaseAuthorize,
    },
  ),
  customsTemplateService(
    'TEMPLATE-CUST-APPEAL-REDRESS',
    'template-cust-customs-appeal-redress',
    'Customs Appeal / Redress',
    'REDRESS',
    ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
    { decisionFunction: CUSTOMS_AUTHORITY.appealDecide },
  ),
];

export const CUSTOMS_TRADE_SERVICE_PACK_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: 'template-customs-trade-administration',
  packVersion: '1.0.0',
  packName: 'Customs & Trade Government Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Customs & Trade family with placeholder rules, forms, workflows, fees, integrations, and dashboard indicators for the unified Trade Portal.',
  institutionCode: 'TEMPLATE-INSTITUTION',
  departmentCode: 'TEMPLATE-DEPARTMENT-CUSTOMS',
  deploymentIntent: DEPLOYMENT_INTENT,
  services: CUSTOMS_TRADE_SERVICES,
};
