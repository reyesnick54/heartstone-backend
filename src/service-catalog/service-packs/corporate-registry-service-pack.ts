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

const CORPORATE_FAMILY = 'TEMPLATE-FAMILY-CORPORATE-REGISTRY';

const AUTH_INTAKE = 'TEMPLATE-AUTH-CORPORATE-REGISTRY-INTAKE';
const AUTH_REVIEW = 'TEMPLATE-AUTH-CORPORATE-REGISTRY-REVIEW';
const AUTH_DECIDE = 'TEMPLATE-AUTH-CORPORATE-REGISTRY-DECIDE';
const AUTH_ISSUE = 'TEMPLATE-AUTH-CORPORATE-REGISTRY-ISSUE';
const AUTH_VERIFY = 'TEMPLATE-AUTH-CORPORATE-REGISTRY-VERIFY';

function corporateTemplateService(input: {
  serviceCode: string;
  serviceSlug: string;
  serviceName: string;
  description: string;
  formCode: string;
  evidenceCode: string;
  outputCode: string;
  outputLabel: string;
  indicatorCode: string;
  requiresRegistryDecision?: boolean;
}): ServicePackServiceDefinition {
  const requiresDecision = input.requiresRegistryDecision ?? true;
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
      authorityFunctionCode: AUTH_INTAKE,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'ADMINISTRATIVE',
    },
    {
      stageKey: 'substantive',
      label: 'Registry review',
      displayOrder: 3,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: AUTH_REVIEW,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    },
    ...(requiresDecision
      ? [
          {
            stageKey: 'decision',
            label: 'Registry decision',
            displayOrder: 4,
            stepType: 'DECISION_GATE',
            authorityFunctionCode: AUTH_DECIDE,
            authorityActionType: 'APPROVE',
            consequenceLevel: 'CONSEQUENTIAL',
            isDecisionStage: true,
          },
        ]
      : []),
    {
      stageKey: 'issuance',
      label: requiresDecision ? 'Registry issuance' : 'Verification response',
      displayOrder: requiresDecision ? 5 : 4,
      stepType: requiresDecision ? 'ISSUANCE_GATE' : 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: requiresDecision ? AUTH_ISSUE : AUTH_VERIFY,
      authorityActionType: requiresDecision ? 'ISSUE' : 'VERIFY',
      consequenceLevel: 'CONSEQUENTIAL',
      isIssuanceStage: requiresDecision,
    },
  ];

  return {
    serviceCode: input.serviceCode,
    serviceSlug: input.serviceSlug,
    serviceName: input.serviceName,
    serviceFamilyCode: CORPORATE_FAMILY,
    serviceType: requiresDecision ? 'APPLICATION' : 'INQUIRY',
    description: `${input.description} NON_PRODUCTION corporate registry template.`,
    applicantCategories: ['BUSINESS', 'COMPANY', 'AUTHORIZED_REPRESENTATIVE'],
    authorityFunctions: [
      {
        functionCode: AUTH_INTAKE,
        publicStageLabel: 'Corporate registry intake',
        authorityActionType: 'PREPARE',
        sequenceOrder: 1,
        isConsequential: false,
      },
      {
        functionCode: AUTH_REVIEW,
        publicStageLabel: 'Registry officer review',
        authorityActionType: 'REVIEW',
        sequenceOrder: 2,
        isConsequential: false,
      },
      {
        functionCode: AUTH_DECIDE,
        publicStageLabel: 'Registry decision',
        authorityActionType: 'APPROVE',
        sequenceOrder: 3,
        isConsequential: true,
      },
      {
        functionCode: AUTH_ISSUE,
        publicStageLabel: 'Registry issuance',
        authorityActionType: 'ISSUE',
        sequenceOrder: 4,
        isConsequential: true,
      },
      {
        functionCode: AUTH_VERIFY,
        publicStageLabel: 'Registry verification',
        authorityActionType: 'VERIFY',
        sequenceOrder: 5,
        isConsequential: false,
      },
    ],
    forms: [
      {
        formCode: input.formCode,
        formName: `${input.serviceName} intake`,
        versionLabel: '1.0.0',
        sections: [
          {
            sectionKey: 'entity',
            label: 'Entity details',
            fields: [
              {
                fieldKey: 'proposedLegalName',
                label: 'Proposed legal name',
                fieldType: 'TEXT',
                required: true,
              },
              {
                fieldKey: 'entityType',
                label: 'Entity type',
                fieldType: 'SELECT',
                required: true,
              },
            ],
          },
        ],
      },
    ],
    evidenceRequirements: [
      {
        evidenceCode: input.evidenceCode,
        label: 'Supporting registry evidence',
        description: 'Template corporate registry evidence placeholder',
        required: true,
        verificationCategory: 'CONTENT_FACT',
      },
    ],
    workflowStages,
    completenessReview: {
      enabled: true,
      requiredEvidenceCodes: [input.evidenceCode],
    },
    slaRules: [
      {
        ruleCode: `${input.serviceCode}-SLA`,
        label: `${input.serviceName} SLA`,
        targetDays: 30,
        clockStartsAtStageKey: 'intake',
      },
    ],
    fees: [
      {
        feeCode: `${input.serviceCode}-FEE`,
        label: 'Registry service fee',
        amount: 150,
        currencyCode: 'USD',
        waivable: true,
      },
    ],
    outputs: [
      {
        outputCode: input.outputCode,
        label: input.outputLabel,
        outputType: requiresDecision ? 'REGISTRATION_RECORD' : 'VERIFICATION_RESPONSE',
        deliveryChannel: 'PORTAL',
      },
    ],
    communications: [
      {
        communicationCode: `${input.serviceCode}-STATUS`,
        triggerStageKey: 'substantive',
        channel: 'EMAIL',
        templateCode: `${input.serviceCode}-STATUS-NOTICE`,
      },
    ],
    dependencies: [
      {
        dependencyCode: `${input.serviceCode}-REGISTRY-LOOKUP`,
        dependencyType: 'REGISTRY_LOOKUP',
        description: 'Corporate registry reference lookup',
        externalIntegrationCode: 'TEMPLATE-CORPORATE-REGISTRY-API',
      },
    ],
    decisionStages: requiresDecision
      ? [
          {
            stageKey: 'decision',
            decisionActorFunctionCode: AUTH_DECIDE,
            requiresSecondApproval: true,
          },
        ]
      : [],
    issuance: {
      issuanceStageKey: 'issuance',
      issuanceFunctionCode: requiresDecision ? AUTH_ISSUE : AUTH_VERIFY,
      outputCodes: [input.outputCode],
    },
    lifecycle: { supportsRenewal: false },
    redress: [
      {
        routeCode: `${input.serviceCode}-REVIEW`,
        label: 'Registry administrative review',
        routeType: 'ADMINISTRATIVE_REVIEW',
        description: 'Template corporate registry review route',
      },
    ],
    dashboardIndicators: [
      {
        indicatorCode: input.indicatorCode,
        label: `${input.serviceName} queue depth`,
        metricType: 'QUEUE_DEPTH',
      },
    ],
  };
}

export const CORPORATE_REGISTRY_TEMPLATE_SERVICE_DEFINITIONS: ServicePackServiceDefinition[] = [
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-RESERVE-NAME',
    serviceSlug: 'template-corporate-reserve-name',
    serviceName: 'Reserve Business / Company Name',
    description: 'Jurisdiction-neutral name reservation',
    formCode: 'TEMPLATE-CORP-NAME-RES-FORM',
    evidenceCode: 'TEMPLATE-CORP-NAME-RES-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-NAME-RES-OUTPUT',
    outputLabel: 'Name reservation confirmation',
    indicatorCode: 'TEMPLATE-CORP-NAME-RES-QUEUE',
  }),
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-INCORPORATE',
    serviceSlug: 'template-corporate-incorporate',
    serviceName: 'Incorporate Company',
    description: 'Company incorporation requiring registry decision',
    formCode: 'TEMPLATE-CORP-INC-FORM',
    evidenceCode: 'TEMPLATE-CORP-INC-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-INC-OUTPUT',
    outputLabel: 'Certificate of incorporation',
    indicatorCode: 'TEMPLATE-CORP-INC-QUEUE',
  }),
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-SOLE-TRADER',
    serviceSlug: 'template-corporate-sole-trader',
    serviceName: 'Register Sole Trader / Business',
    description: 'Sole trader registration',
    formCode: 'TEMPLATE-CORP-SOLE-FORM',
    evidenceCode: 'TEMPLATE-CORP-SOLE-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-SOLE-OUTPUT',
    outputLabel: 'Sole trader registration record',
    indicatorCode: 'TEMPLATE-CORP-SOLE-QUEUE',
  }),
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-FOREIGN-COMPANY',
    serviceSlug: 'template-corporate-foreign-company',
    serviceName: 'Register Foreign Company',
    description: 'Foreign company registration',
    formCode: 'TEMPLATE-CORP-FOREIGN-FORM',
    evidenceCode: 'TEMPLATE-CORP-FOREIGN-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-FOREIGN-OUTPUT',
    outputLabel: 'Foreign company registration record',
    indicatorCode: 'TEMPLATE-CORP-FOREIGN-QUEUE',
  }),
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-REGISTER-BRANCH',
    serviceSlug: 'template-corporate-register-branch',
    serviceName: 'Register Branch',
    description: 'Branch registration',
    formCode: 'TEMPLATE-CORP-BRANCH-FORM',
    evidenceCode: 'TEMPLATE-CORP-BRANCH-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-BRANCH-OUTPUT',
    outputLabel: 'Branch registration record',
    indicatorCode: 'TEMPLATE-CORP-BRANCH-QUEUE',
  }),
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-CHANGE-REGISTERED-OFFICE',
    serviceSlug: 'template-corporate-change-registered-office',
    serviceName: 'Change Registered Office',
    description: 'Registered office amendment',
    formCode: 'TEMPLATE-CORP-OFFICE-FORM',
    evidenceCode: 'TEMPLATE-CORP-OFFICE-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-OFFICE-OUTPUT',
    outputLabel: 'Registered office amendment record',
    indicatorCode: 'TEMPLATE-CORP-OFFICE-QUEUE',
  }),
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-CHANGE-DIRECTORS',
    serviceSlug: 'template-corporate-change-directors',
    serviceName: 'Change Directors / Officers',
    description: 'Director and officer amendment',
    formCode: 'TEMPLATE-CORP-DIRECTORS-FORM',
    evidenceCode: 'TEMPLATE-CORP-DIRECTORS-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-DIRECTORS-OUTPUT',
    outputLabel: 'Officer amendment record',
    indicatorCode: 'TEMPLATE-CORP-DIRECTORS-QUEUE',
  }),
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-BENEFICIAL-OWNERSHIP',
    serviceSlug: 'template-corporate-beneficial-ownership',
    serviceName: 'Submit Beneficial Ownership Declaration',
    description: 'Beneficial ownership declaration',
    formCode: 'TEMPLATE-CORP-BO-FORM',
    evidenceCode: 'TEMPLATE-CORP-BO-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-BO-OUTPUT',
    outputLabel: 'Beneficial ownership receipt',
    indicatorCode: 'TEMPLATE-CORP-BO-QUEUE',
  }),
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-ANNUAL-FILING',
    serviceSlug: 'template-corporate-annual-filing',
    serviceName: 'Annual Corporate Filing',
    description: 'Annual corporate return filing',
    formCode: 'TEMPLATE-CORP-ANNUAL-FORM',
    evidenceCode: 'TEMPLATE-CORP-ANNUAL-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-ANNUAL-OUTPUT',
    outputLabel: 'Annual filing acceptance',
    indicatorCode: 'TEMPLATE-CORP-ANNUAL-QUEUE',
  }),
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-CERTIFICATE-REQUEST',
    serviceSlug: 'template-corporate-certificate-request',
    serviceName: 'Request Corporate Certificate',
    description: 'Certificate issuance request',
    formCode: 'TEMPLATE-CORP-CERT-FORM',
    evidenceCode: 'TEMPLATE-CORP-CERT-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-CERT-OUTPUT',
    outputLabel: 'Corporate certificate',
    indicatorCode: 'TEMPLATE-CORP-CERT-QUEUE',
  }),
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-DISSOLUTION',
    serviceSlug: 'template-corporate-dissolution',
    serviceName: 'Company Dissolution',
    description: 'Company dissolution',
    formCode: 'TEMPLATE-CORP-DISS-FORM',
    evidenceCode: 'TEMPLATE-CORP-DISS-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-DISS-OUTPUT',
    outputLabel: 'Dissolution record',
    indicatorCode: 'TEMPLATE-CORP-DISS-QUEUE',
  }),
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-RESTORATION',
    serviceSlug: 'template-corporate-restoration',
    serviceName: 'Company Restoration',
    description: 'Company restoration after dissolution',
    formCode: 'TEMPLATE-CORP-REST-FORM',
    evidenceCode: 'TEMPLATE-CORP-REST-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-REST-OUTPUT',
    outputLabel: 'Restoration record',
    indicatorCode: 'TEMPLATE-CORP-REST-QUEUE',
  }),
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-RECORD-CORRECTION',
    serviceSlug: 'template-corporate-record-correction',
    serviceName: 'Corporate Record Correction',
    description: 'Official corporate record correction',
    formCode: 'TEMPLATE-CORP-CORRECT-FORM',
    evidenceCode: 'TEMPLATE-CORP-CORRECT-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-CORRECT-OUTPUT',
    outputLabel: 'Corrected registry record',
    indicatorCode: 'TEMPLATE-CORP-CORRECT-QUEUE',
  }),
  corporateTemplateService({
    serviceCode: 'TEMPLATE-CORPORATE-REGISTRY-SEARCH',
    serviceSlug: 'template-corporate-registry-search',
    serviceName: 'Corporate Registry Search / Verification',
    description: 'Registry search and verification',
    formCode: 'TEMPLATE-CORP-SEARCH-FORM',
    evidenceCode: 'TEMPLATE-CORP-SEARCH-EVIDENCE',
    outputCode: 'TEMPLATE-CORP-SEARCH-OUTPUT',
    outputLabel: 'Registry verification response',
    indicatorCode: 'TEMPLATE-CORP-SEARCH-QUEUE',
    requiresRegistryDecision: false,
  }),
];

export const CORPORATE_REGISTRY_SERVICE_PACK: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: 'corporate-registry-business-formation-pack',
  packVersion: '1.0.0',
  packName: 'Corporate Registry / Business Formation Service Pack',
  description:
    'Jurisdiction-neutral NON_PRODUCTION corporate registry and business formation templates. TEMPLATE ONLY — not verified law or policy.',
  institutionCode: 'TEMPLATE-CORPORATE-REGISTRY-INSTITUTION',
  departmentCode: 'TEMPLATE-CORPORATE-REGISTRY-DEPARTMENT',
  deploymentIntent: DEPLOYMENT_INTENT,
  services: CORPORATE_REGISTRY_TEMPLATE_SERVICE_DEFINITIONS,
};
