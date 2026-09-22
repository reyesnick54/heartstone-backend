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

const REVENUE_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-REVENUE-INTAKE',
  verify: 'TEMPLATE-AUTH-REVENUE-VERIFY',
  returnReview: 'TEMPLATE-AUTH-REVENUE-RETURN-REVIEW',
  assessmentIssue: 'TEMPLATE-AUTH-REVENUE-ASSESSMENT-ISSUE',
  refundAuthorize: 'TEMPLATE-AUTH-REVENUE-REFUND-AUTHORIZE',
  objectionDecide: 'TEMPLATE-AUTH-REVENUE-OBJECTION-DECIDE',
  clearanceIssue: 'TEMPLATE-AUTH-REVENUE-CLEARANCE-ISSUE',
  paymentPlanApprove: 'TEMPLATE-AUTH-REVENUE-PAYMENT-PLAN-APPROVE',
};

function revenueTemplateService(
  serviceCode: string,
  serviceSlug: string,
  serviceName: string,
  serviceType: string,
  applicantCategories: string[],
  options?: { issuanceFunction?: string; decisionFunction?: string },
): ServicePackServiceDefinition {
  const decisionFunction = options?.decisionFunction ?? REVENUE_AUTHORITY.verify;
  const issuanceFunction = options?.issuanceFunction ?? REVENUE_AUTHORITY.verify;

  return {
    serviceCode,
    serviceSlug,
    serviceName,
    serviceFamilyCode: 'TEMPLATE-FAMILY-REVENUE-TAX',
    serviceType,
    description: `${serviceName} — NON_PRODUCTION placeholder tax service.`,
    applicantCategories,
    authorityFunctions: [
      {
        functionCode: REVENUE_AUTHORITY.intake,
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
        label: 'Revenue review',
        displayOrder: 2,
        stepType: 'SUBSTANTIVE_REVIEW',
        authorityFunctionCode: REVENUE_AUTHORITY.returnReview,
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
        dependencyCode: `${serviceCode}-ACCOUNTING-INTEGRATION`,
        dependencyType: 'INTEGRATION',
        description: 'Optional external accounting/registry integration',
        externalIntegrationCode: 'TEMPLATE-REV-ACCOUNTING-API',
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
        routeCode: `${serviceCode}-OBJECTION`,
        label: 'Tax objection / review',
        routeType: 'OBJECTION',
        description: 'NON_PRODUCTION objection route',
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

export const REVENUE_TAX_SERVICES: ServicePackServiceDefinition[] = [
  revenueTemplateService(
    'TEMPLATE-REV-REGISTER-INDIVIDUAL',
    'template-rev-register-individual',
    'Register Individual Taxpayer',
    'REGISTRATION',
    ['INDIVIDUAL', 'CITIZEN'],
  ),
  revenueTemplateService(
    'TEMPLATE-REV-REGISTER-BUSINESS',
    'template-rev-register-business',
    'Register Business Taxpayer',
    'REGISTRATION',
    ['BUSINESS', 'COMPANY'],
  ),
  revenueTemplateService(
    'TEMPLATE-REV-UPDATE-TAXPAYER',
    'template-rev-update-taxpayer',
    'Update Taxpayer Details',
    'AMENDMENT',
    ['INDIVIDUAL', 'BUSINESS', 'COMPANY'],
  ),
  revenueTemplateService(
    'TEMPLATE-REV-FILE-RETURN',
    'template-rev-file-return',
    'File Tax Return / Declaration',
    'APPLICATION',
    ['INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    { decisionFunction: REVENUE_AUTHORITY.returnReview },
  ),
  revenueTemplateService(
    'TEMPLATE-REV-AMEND-RETURN',
    'template-rev-amend-return',
    'Amend Filed Return',
    'AMENDMENT',
    ['INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    { decisionFunction: REVENUE_AUTHORITY.returnReview },
  ),
  revenueTemplateService(
    'TEMPLATE-REV-VIEW-ASSESSMENT',
    'template-rev-view-assessment',
    'View Assessment',
    'INQUIRY',
    ['INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    { decisionFunction: REVENUE_AUTHORITY.assessmentIssue },
  ),
  revenueTemplateService(
    'TEMPLATE-REV-PAY-LIABILITY',
    'template-rev-pay-liability',
    'Pay Tax Liability',
    'PAYMENT',
    ['INDIVIDUAL', 'BUSINESS', 'COMPANY'],
  ),
  revenueTemplateService(
    'TEMPLATE-REV-REQUEST-REFUND',
    'template-rev-request-refund',
    'Request Refund',
    'APPLICATION',
    ['INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    { decisionFunction: REVENUE_AUTHORITY.refundAuthorize },
  ),
  revenueTemplateService(
    'TEMPLATE-REV-PAYMENT-PLAN',
    'template-rev-payment-plan',
    'Request Payment Plan',
    'APPLICATION',
    ['INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    { decisionFunction: REVENUE_AUTHORITY.paymentPlanApprove },
  ),
  revenueTemplateService(
    'TEMPLATE-REV-TAX-OBJECTION',
    'template-rev-tax-objection',
    'Submit Tax Objection / Review',
    'REDRESS',
    ['INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    { decisionFunction: REVENUE_AUTHORITY.objectionDecide },
  ),
  revenueTemplateService(
    'TEMPLATE-REV-CLEARANCE-CERT',
    'template-rev-clearance-cert',
    'Request Tax Compliance / Clearance Certificate',
    'APPLICATION',
    ['INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    {
      decisionFunction: REVENUE_AUTHORITY.clearanceIssue,
      issuanceFunction: REVENUE_AUTHORITY.clearanceIssue,
    },
  ),
  revenueTemplateService(
    'TEMPLATE-REV-WITHHOLDING',
    'template-rev-withholding',
    'Employer Withholding Submission',
    'REPORTING',
    ['BUSINESS', 'COMPANY'],
    { decisionFunction: REVENUE_AUTHORITY.returnReview },
  ),
  revenueTemplateService(
    'TEMPLATE-REV-STATEMENT',
    'template-rev-statement',
    'Tax Account Statement Request',
    'INQUIRY',
    ['INDIVIDUAL', 'BUSINESS', 'COMPANY'],
  ),
  revenueTemplateService(
    'TEMPLATE-REV-RECORD-CORRECTION',
    'template-rev-record-correction',
    'Tax Record Correction',
    'AMENDMENT',
    ['INDIVIDUAL', 'BUSINESS', 'COMPANY'],
    { decisionFunction: REVENUE_AUTHORITY.verify },
  ),
];

export const REVENUE_TAX_ADMINISTRATION_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: 'template-revenue-tax-administration',
  packVersion: '1.0.0',
  packName: 'Revenue & Tax Administration Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Revenue & Tax Administration family with placeholder rules, rates, forms, deadlines, exemptions, and thresholds.',
  institutionCode: 'TEMPLATE-INSTITUTION',
  departmentCode: 'TEMPLATE-DEPARTMENT-REVENUE',
  deploymentIntent: DEPLOYMENT_INTENT,
  services: REVENUE_TAX_SERVICES,
};
