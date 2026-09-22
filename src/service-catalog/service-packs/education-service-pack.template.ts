import {
  EDUCATION_AUTHORITY,
  EDUCATION_DEPARTMENT_CODE,
  EDUCATION_INSTITUTION_CODE,
  EDUCATION_INTEGRATION_ROUTE_CODES,
  EDUCATION_SERVICE_CODE_PREFIX,
  EDUCATION_SERVICE_PACK_ID,
  EDUCATION_TEMPLATE_SERVICE_DEFINITIONS,
} from '../../education/education.constants';
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
  return key.toLowerCase().replace(/_/g, '-');
}

function decisionFunctionForService(key: string): string {
  if (key.includes('SCHOLARSHIP')) {
    return EDUCATION_AUTHORITY.scholarshipDecide;
  }
  if (key.includes('GRANT') || key.includes('SUPPORT')) {
    return EDUCATION_AUTHORITY.grantDecide;
  }
  if (key === 'ACCREDITATION') {
    return EDUCATION_AUTHORITY.accreditationDecide;
  }
  if (key.includes('EDUCATOR')) {
    return EDUCATION_AUTHORITY.educatorLicense;
  }
  if (key.includes('INSTITUTION-INSPECTION')) {
    return EDUCATION_AUTHORITY.inspection;
  }
  if (key.includes('INSTITUTION-LICENSE')) {
    return EDUCATION_AUTHORITY.institutionLicense;
  }
  if (key.includes('INSTITUTION-REGISTRATION')) {
    return EDUCATION_AUTHORITY.institutionRegister;
  }
  if (key.includes('ENROLLMENT') || key.includes('TRANSFER')) {
    return EDUCATION_AUTHORITY.enrollmentDecide;
  }
  if (key === 'RECORD-CORRECTION') {
    return EDUCATION_AUTHORITY.recordCorrect;
  }
  if (key === 'APPEAL-REDRESS') {
    return EDUCATION_AUTHORITY.appealDecide;
  }
  return EDUCATION_AUTHORITY.intake;
}

function buildEducationService(
  input: (typeof EDUCATION_TEMPLATE_SERVICE_DEFINITIONS)[number],
): ServicePackServiceDefinition {
  const serviceCode = `${EDUCATION_SERVICE_CODE_PREFIX}${input.key}`;
  const serviceSlug = slugFromKey(input.key);
  const decisionFunction = decisionFunctionForService(input.key);
  const isScholarship = input.key === 'SCHOLARSHIP';

  return {
    serviceCode,
    serviceSlug,
    serviceName: input.name,
    serviceFamilyCode: 'TEMPLATE-FAMILY-EDUCATION',
    serviceType: input.serviceType,
    description: `${input.name} — NON_PRODUCTION placeholder education government service.`,
    applicantCategories:
      input.key.includes('INSTITUTION') || input.key.includes('INSPECTION')
        ? ['BUSINESS', 'COMPANY']
        : ['INDIVIDUAL', 'CITIZEN', 'AUTHORIZED_REPRESENTATIVE'],
    authorityFunctions: [
      {
        functionCode: EDUCATION_AUTHORITY.intake,
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
        formName: `${input.name} form`,
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
        label: 'Education review',
        displayOrder: 2,
        stepType: 'SUBSTANTIVE_REVIEW',
        authorityFunctionCode: EDUCATION_AUTHORITY.intake,
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
        targetDays: 20,
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
        dependencyCode: `${serviceCode}-SCHOOL-REF`,
        dependencyType: 'INTEGRATION',
        description: 'School reference via Integration Gateway when configured',
        externalIntegrationCode: EDUCATION_INTEGRATION_ROUTE_CODES.school,
      },
      {
        dependencyCode: `${serviceCode}-UNIVERSITY-REF`,
        dependencyType: 'INTEGRATION',
        description: 'University reference via Integration Gateway when configured',
        externalIntegrationCode: EDUCATION_INTEGRATION_ROUTE_CODES.university,
      },
      {
        dependencyCode: `${serviceCode}-EXAM-BODY-REF`,
        dependencyType: 'INTEGRATION',
        description: 'Examination body reference via Integration Gateway when configured',
        externalIntegrationCode: EDUCATION_INTEGRATION_ROUTE_CODES.examinationBody,
      },
      {
        dependencyCode: `${serviceCode}-REGISTRY-REF`,
        dependencyType: 'INTEGRATION',
        description: 'Education registry reference via Integration Gateway when configured',
        externalIntegrationCode: EDUCATION_INTEGRATION_ROUTE_CODES.educationRegistry,
      },
      {
        dependencyCode: `${serviceCode}-SIS-REF`,
        dependencyType: 'INTEGRATION',
        description: 'Student information system reference via Integration Gateway when configured',
        externalIntegrationCode: EDUCATION_INTEGRATION_ROUTE_CODES.studentInformationSystem,
      },
    ],
    decisionStages: isScholarship
      ? [
          {
            stageKey: 'decision',
            decisionActorFunctionCode: EDUCATION_AUTHORITY.scholarshipDecide,
            requiresSecondApproval: true,
          },
        ]
      : [
          {
            stageKey: 'decision',
            decisionActorFunctionCode: decisionFunction,
            requiresSecondApproval: input.key === 'ACCREDITATION',
          },
        ],
    issuance: {
      issuanceStageKey: 'decision',
      issuanceFunctionCode: decisionFunction,
      outputCodes: [`${serviceCode}-OUTPUT`],
    },
    lifecycle: { supportsRenewal: input.serviceType === 'RENEWAL' },
    redress:
      input.serviceType === 'REDRESS'
        ? [
            {
              routeCode: `${serviceCode}-APPEAL`,
              label: 'Education appeal / redress',
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
      {
        indicatorCode: `${serviceCode}-SLA-RISK`,
        label: 'SLA risk',
        metricType: 'SLA_BREACH_RISK',
        threshold: 10,
      },
    ],
  };
}

export const EDUCATION_SERVICES: ServicePackServiceDefinition[] =
  EDUCATION_TEMPLATE_SERVICE_DEFINITIONS.map((definition) => buildEducationService(definition));

export const EDUCATION_SERVICE_PACK_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: EDUCATION_SERVICE_PACK_ID,
  packVersion: '1.0.0',
  packName: 'Education Government Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Education vertical with placeholder rules, forms, workflows, integrations (schools, universities, examination bodies, registries, SIS), fees, and dashboard indicators.',
  institutionCode: EDUCATION_INSTITUTION_CODE,
  departmentCode: EDUCATION_DEPARTMENT_CODE,
  deploymentIntent: DEPLOYMENT_INTENT,
  services: EDUCATION_SERVICES,
};
