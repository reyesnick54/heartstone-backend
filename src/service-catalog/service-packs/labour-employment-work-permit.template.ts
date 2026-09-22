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

const LABOUR_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-LABOUR-INTAKE',
  review: 'TEMPLATE-AUTH-LABOUR-REVIEW',
  decide: 'TEMPLATE-AUTH-LABOUR-DECIDE',
  issue: 'TEMPLATE-AUTH-LABOUR-ISSUE',
  inspect: 'TEMPLATE-AUTH-LABOUR-INSPECT',
  enforce: 'TEMPLATE-AUTH-LABOUR-ENFORCE',
  complaintDecide: 'TEMPLATE-AUTH-LABOUR-COMPLAINT-DECIDE',
  qualificationVerify: 'TEMPLATE-AUTH-LABOUR-QUALIFICATION-VERIFY',
  immigrationCoord: 'TEMPLATE-AUTH-LABOUR-IMMIGRATION-COORD',
};

function labourTemplateService(
  serviceCode: string,
  serviceSlug: string,
  serviceName: string,
  serviceType: string,
  applicantCategories: string[],
  options?: {
    decisionFunction?: string;
    issuanceFunction?: string;
    includesImmigrationDependency?: boolean;
  },
): ServicePackServiceDefinition {
  const decisionFunction = options?.decisionFunction ?? LABOUR_AUTHORITY.review;
  const issuanceFunction = options?.issuanceFunction ?? LABOUR_AUTHORITY.issue;

  const dependencies: ServicePackServiceDefinition['dependencies'] = [
    {
      dependencyCode: `${serviceCode}-CORPORATE-REGISTRY`,
      dependencyType: 'REGISTRY_LOOKUP',
      description: 'Optional corporate registry lookup when configured',
      externalIntegrationCode: 'TEMPLATE-CORP-REG-API',
    },
  ];

  if (options?.includesImmigrationDependency) {
    dependencies.push({
      dependencyCode: `${serviceCode}-IMMIGRATION-COORD`,
      dependencyType: 'EXTERNAL_AUTHORITY',
      description: 'Immigration coordination dependency (status channels remain separate)',
      externalIntegrationCode: 'TEMPLATE-IMM-COORD-API',
    });
  }

  return {
    serviceCode,
    serviceSlug,
    serviceName,
    serviceFamilyCode: 'TEMPLATE-FAMILY-LABOUR-EMPLOYMENT',
    serviceType,
    description: `${serviceName} — NON_PRODUCTION jurisdiction-bound labour template.`,
    applicantCategories,
    authorityFunctions: [
      {
        functionCode: LABOUR_AUTHORITY.intake,
        publicStageLabel: 'Intake',
        authorityActionType: 'PREPARE',
        sequenceOrder: 1,
        isConsequential: false,
      },
      {
        functionCode: decisionFunction,
        publicStageLabel: 'Official labour determination',
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
        label: 'Labour review',
        displayOrder: 2,
        stepType: 'SUBSTANTIVE_REVIEW',
        authorityFunctionCode: LABOUR_AUTHORITY.review,
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

export const LABOUR_EMPLOYMENT_SERVICES: ServicePackServiceDefinition[] = [
  labourTemplateService(
    'TEMPLATE-LAB-REGISTER-EMPLOYER',
    'register-employer',
    'Register Employer',
    'REGISTRATION',
    ['BUSINESS', 'COMPANY'],
    { decisionFunction: LABOUR_AUTHORITY.decide },
  ),
  labourTemplateService(
    'TEMPLATE-LAB-UPDATE-EMPLOYER',
    'update-employer-details',
    'Update Employer Details',
    'AMENDMENT',
    ['BUSINESS', 'COMPANY'],
  ),
  labourTemplateService(
    'TEMPLATE-LAB-REGISTER-EMPLOYMENT',
    'register-employment-relationship',
    'Register Employment Relationship',
    'REGISTRATION',
    ['BUSINESS', 'EMPLOYEE', 'CITIZEN'],
  ),
  labourTemplateService(
    'TEMPLATE-LAB-EMPLOYMENT-DECLARATION',
    'submit-employment-declaration',
    'Submit Employment Declaration',
    'REPORTING',
    ['BUSINESS', 'EMPLOYEE'],
  ),
  labourTemplateService(
    'TEMPLATE-LAB-APPLY-WORK-PERMIT',
    'apply-work-permit',
    'Apply for Work Permit',
    'APPLICATION',
    ['BUSINESS', 'EMPLOYEE', 'CITIZEN'],
    {
      decisionFunction: LABOUR_AUTHORITY.decide,
      issuanceFunction: LABOUR_AUTHORITY.issue,
      includesImmigrationDependency: true,
    },
  ),
  labourTemplateService(
    'TEMPLATE-LAB-RENEW-WORK-PERMIT',
    'renew-work-permit',
    'Renew Work Permit',
    'RENEWAL',
    ['BUSINESS', 'EMPLOYEE'],
    { decisionFunction: LABOUR_AUTHORITY.decide, issuanceFunction: LABOUR_AUTHORITY.issue },
  ),
  labourTemplateService(
    'TEMPLATE-LAB-AMEND-WORK-PERMIT',
    'amend-work-permit',
    'Amend Work Permit',
    'AMENDMENT',
    ['GOVERNMENT_ENTITY', 'BUSINESS'],
    { decisionFunction: LABOUR_AUTHORITY.decide },
  ),
  labourTemplateService(
    'TEMPLATE-LAB-TERMINATE-WORK-AUTH',
    'terminate-work-authorization',
    'Terminate / Close Work Authorization',
    'AMENDMENT',
    ['GOVERNMENT_ENTITY', 'BUSINESS'],
    { decisionFunction: LABOUR_AUTHORITY.enforce },
  ),
  labourTemplateService(
    'TEMPLATE-LAB-FOREIGN-WORKER-SPONSOR',
    'foreign-worker-sponsorship',
    'Submit Foreign Worker Sponsorship',
    'APPLICATION',
    ['BUSINESS', 'COMPANY'],
    { includesImmigrationDependency: true, decisionFunction: LABOUR_AUTHORITY.immigrationCoord },
  ),
  labourTemplateService(
    'TEMPLATE-LAB-WORKFORCE-DECLARATION',
    'workforce-declaration',
    'Submit Workforce Declaration',
    'REPORTING',
    ['BUSINESS', 'COMPANY'],
  ),
  labourTemplateService(
    'TEMPLATE-LAB-PROFESSIONAL-QUALIFICATION',
    'professional-qualification-verification',
    'Professional Qualification Verification Request',
    'REQUEST',
    ['EMPLOYEE', 'PROFESSIONAL'],
    { decisionFunction: LABOUR_AUTHORITY.qualificationVerify },
  ),
  labourTemplateService(
    'TEMPLATE-LAB-INSPECTION',
    'labour-inspection',
    'Labour Inspection Request / Response',
    'INSPECTION',
    ['GOVERNMENT_ENTITY', 'BUSINESS'],
    { decisionFunction: LABOUR_AUTHORITY.inspect },
  ),
  labourTemplateService(
    'TEMPLATE-LAB-EMPLOYMENT-COMPLAINT',
    'employment-complaint',
    'Employment Complaint',
    'REDRESS',
    ['EMPLOYEE', 'CITIZEN'],
    { decisionFunction: LABOUR_AUTHORITY.complaintDecide },
  ),
  labourTemplateService(
    'TEMPLATE-LAB-EMPLOYMENT-DISPUTE',
    'employment-dispute-review',
    'Employment Dispute / Review',
    'REDRESS',
    ['EMPLOYEE', 'BUSINESS'],
    { decisionFunction: LABOUR_AUTHORITY.complaintDecide },
  ),
  labourTemplateService(
    'TEMPLATE-LAB-WORKPLACE-COMPLIANCE',
    'workplace-compliance-submission',
    'Workplace Compliance Submission',
    'REPORTING',
    ['BUSINESS', 'COMPANY'],
  ),
  labourTemplateService(
    'TEMPLATE-LAB-DECISION-APPEAL',
    'labour-decision-appeal',
    'Labour Decision Appeal',
    'REDRESS',
    ['EMPLOYEE', 'BUSINESS'],
    { decisionFunction: LABOUR_AUTHORITY.decide },
  ),
];

export const LABOUR_EMPLOYMENT_WORK_PERMIT_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: 'template-labour-employment-work-permit',
  packVersion: '1.0.0',
  packName: 'Labour, Employment & Work Permit Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Labour, employment and work permit family with jurisdiction-bound placeholder rules and separate immigration coordination.',
  institutionCode: 'TEMPLATE-INSTITUTION',
  departmentCode: 'TEMPLATE-DEPARTMENT-LABOUR',
  deploymentIntent: DEPLOYMENT_INTENT,
  services: LABOUR_EMPLOYMENT_SERVICES,
};
