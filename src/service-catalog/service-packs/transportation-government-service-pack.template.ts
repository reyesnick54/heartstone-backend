import { TRANSPORTATION_TEMPLATE_AUTHORITY } from '../../transportation/transportation.constants';
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

function transportTemplateService(
  serviceCode: string,
  serviceSlug: string,
  serviceName: string,
  serviceType: string,
  applicantCategories: string[],
  options?: { decisionFunction?: string; issuanceFunction?: string },
): ServicePackServiceDefinition {
  const decisionFunction = options?.decisionFunction ?? TRANSPORTATION_TEMPLATE_AUTHORITY.review;
  const issuanceFunction =
    options?.issuanceFunction ?? TRANSPORTATION_TEMPLATE_AUTHORITY.licenseIssue;

  return {
    serviceCode,
    serviceSlug,
    serviceName,
    serviceFamilyCode: 'TEMPLATE-FAMILY-TRANSPORTATION',
    serviceType,
    description: `${serviceName} — NON_PRODUCTION placeholder transportation service.`,
    applicantCategories,
    authorityFunctions: [
      {
        functionCode: TRANSPORTATION_TEMPLATE_AUTHORITY.intake,
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
        label: 'Transportation review',
        displayOrder: 2,
        stepType: 'SUBSTANTIVE_REVIEW',
        authorityFunctionCode: TRANSPORTATION_TEMPLATE_AUTHORITY.review,
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
        dependencyCode: `${serviceCode}-SCHEDULING`,
        dependencyType: 'INTEGRATION',
        description: 'Uses ServiceAppointment when scheduling is configured',
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
    lifecycle: { supportsRenewal: serviceSlug.includes('renew') },
    redress: [
      {
        routeCode: `${serviceCode}-APPEAL`,
        label: 'Transportation appeal',
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

export const TRANSPORTATION_GOVERNMENT_SERVICES: ServicePackServiceDefinition[] = [
  transportTemplateService(
    'TEMPLATE-TRANS-APPLY-DRIVER-LICENSE',
    'template-trans-apply-driver-license',
    'Apply for Driver License',
    'APPLICATION',
    ['INDIVIDUAL', 'CITIZEN', 'RESIDENT'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.licenseDecide },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-RENEW-DRIVER-LICENSE',
    'template-trans-renew-driver-license',
    'Renew Driver License',
    'RENEWAL',
    ['INDIVIDUAL', 'CITIZEN', 'RESIDENT'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.licenseDecide },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-ADD-LICENSE-CLASS',
    'template-trans-add-license-class',
    'Add Driver License Class / Endorsement',
    'AMENDMENT',
    ['INDIVIDUAL', 'CITIZEN', 'RESIDENT'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.licenseDecide },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-REPLACE-DRIVER-LICENSE',
    'template-trans-replace-driver-license',
    'Replace Lost/Damaged Driver License',
    'REPLACEMENT',
    ['INDIVIDUAL', 'CITIZEN', 'RESIDENT'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.licenseDecide },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-SCHEDULE-DRIVER-TEST',
    'template-trans-schedule-driver-test',
    'Schedule Driver Test',
    'SCHEDULING',
    ['INDIVIDUAL', 'CITIZEN', 'RESIDENT'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.review },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-REGISTER-VEHICLE',
    'template-trans-register-vehicle',
    'Register Vehicle',
    'REGISTRATION',
    ['INDIVIDUAL', 'CITIZEN', 'RESIDENT'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.registrationDecide },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-RENEW-VEHICLE-REG',
    'template-trans-renew-vehicle-registration',
    'Renew Vehicle Registration',
    'RENEWAL',
    ['INDIVIDUAL', 'CITIZEN', 'RESIDENT'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.registrationDecide },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-TRANSFER-VEHICLE',
    'template-trans-transfer-vehicle-ownership',
    'Transfer Vehicle Ownership',
    'TRANSFER',
    ['INDIVIDUAL', 'CITIZEN', 'RESIDENT'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.transferDecide },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-SCHEDULE-INSPECTION',
    'template-trans-schedule-vehicle-inspection',
    'Schedule Vehicle Inspection',
    'SCHEDULING',
    ['INDIVIDUAL', 'CITIZEN', 'RESIDENT', 'BUSINESS', 'COMPANY'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.inspectionVerify },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-REGISTER-COMMERCIAL-VEHICLE',
    'template-trans-register-commercial-vehicle',
    'Register Commercial Vehicle',
    'REGISTRATION',
    ['BUSINESS', 'COMPANY'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.registrationDecide },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-COMMERCIAL-PERMIT',
    'template-trans-commercial-transport-permit',
    'Apply for Commercial Transport Permit',
    'APPLICATION',
    ['BUSINESS', 'COMPANY'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.operatorLicense },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-REGISTER-OPERATOR',
    'template-trans-register-transport-operator',
    'Register Transport Operator',
    'REGISTRATION',
    ['BUSINESS', 'COMPANY'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.operatorLicense },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-MANAGE-FLEET',
    'template-trans-manage-fleet-registration',
    'Manage Fleet Registration',
    'ADMINISTRATION',
    ['BUSINESS', 'COMPANY'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.operatorLicense },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-REGISTRY-EXTRACT',
    'template-trans-vehicle-registry-extract',
    'Request Vehicle Registry Extract',
    'INQUIRY',
    ['INDIVIDUAL', 'CITIZEN', 'BUSINESS', 'COMPANY'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.review },
  ),
  transportTemplateService(
    'TEMPLATE-TRANS-APPEAL',
    'template-trans-appeal-transportation-decision',
    'Appeal Transportation Decision',
    'REDRESS',
    ['INDIVIDUAL', 'CITIZEN', 'BUSINESS', 'COMPANY'],
    { decisionFunction: TRANSPORTATION_TEMPLATE_AUTHORITY.appealDecide },
  ),
];

export const TRANSPORTATION_GOVERNMENT_SERVICE_PACK_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: 'template-transportation-government',
  packVersion: '1.0.0',
  packName: 'Transportation Government Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Transportation family with jurisdiction-neutral placeholder rules for licensing, registration, inspection, operators, fleet, and appeals.',
  institutionCode: 'TEMPLATE-INSTITUTION',
  departmentCode: 'TEMPLATE-DEPARTMENT-TRANSPORTATION',
  deploymentIntent: DEPLOYMENT_INTENT,
  services: TRANSPORTATION_GOVERNMENT_SERVICES,
};
