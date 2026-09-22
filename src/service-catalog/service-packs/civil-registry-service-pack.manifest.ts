import { createHash } from 'node:crypto';

import {
  CIVIL_REGISTRY_AUTHORITY_FUNCTION_CODES,
  CIVIL_REGISTRY_INSTITUTION_CODE,
  CIVIL_REGISTRY_SERVICE_FAMILY_CODE,
  CIVIL_REGISTRY_SERVICE_PACK_ID,
  CIVIL_REGISTRY_SERVICE_PACK_LABEL,
  CIVIL_REGISTRY_SERVICE_SLUGS,
} from '../../civil-registry/civil-registry.constants';
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

function registrationWorkflow(
  intakeCode: string,
  registerCode: string,
): ServicePackServiceDefinition['workflowStages'] {
  return [
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
      consequenceLevel: 'ADMINISTRATIVE',
      authorityFunctionCode: intakeCode,
      authorityActionType: 'PREPARE',
    },
    {
      stageKey: 'register',
      label: 'Official registration decision',
      displayOrder: 3,
      stepType: 'SUBSTANTIVE_REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
      authorityFunctionCode: registerCode,
      authorityActionType: 'VERIFY',
      isDecisionStage: true,
    },
  ];
}

function certificateWorkflow(issueCode: string): ServicePackServiceDefinition['workflowStages'] {
  return [
    {
      stageKey: 'intake',
      label: 'Certificate request intake',
      displayOrder: 1,
      stepType: 'INTAKE',
      consequenceLevel: 'INFORMATIONAL',
    },
    {
      stageKey: 'completeness',
      label: 'Evidence completeness',
      displayOrder: 2,
      stepType: 'COMPLETENESS_REVIEW',
      consequenceLevel: 'ADMINISTRATIVE',
      authorityFunctionCode: CIVIL_REGISTRY_AUTHORITY_FUNCTION_CODES.EVENT_INTAKE,
      authorityActionType: 'PREPARE',
    },
    {
      stageKey: 'issue',
      label: 'Authoritative extract issuance',
      displayOrder: 3,
      stepType: 'ISSUANCE_GATE',
      consequenceLevel: 'CONSEQUENTIAL',
      authorityFunctionCode: issueCode,
      authorityActionType: 'ISSUE',
      isIssuanceStage: true,
    },
  ];
}

function baseService(
  partial: Pick<
    ServicePackServiceDefinition,
    'serviceCode' | 'serviceSlug' | 'serviceName' | 'serviceType' | 'description'
  >,
  extensions: Partial<ServicePackServiceDefinition>,
): ServicePackServiceDefinition {
  return {
    serviceFamilyCode: CIVIL_REGISTRY_SERVICE_FAMILY_CODE,
    applicantCategories: ['CITIZEN', 'INDIVIDUAL'],
    authorityFunctions: [],
    forms: [
      {
        formCode: 'TEMPLATE-CIVIL-GENERIC-FORM',
        formName: 'Civil registry intake (placeholder)',
        versionLabel: '1.0.0',
        sections: [
          {
            sectionKey: 'applicant',
            label: 'Applicant details (placeholder)',
            fields: [
              {
                fieldKey: 'applicantReference',
                label: 'Applicant reference',
                fieldType: 'TEXT',
                required: true,
              },
            ],
          },
        ],
      },
    ],
    evidenceRequirements: [],
    workflowStages: [],
    completenessReview: {
      enabled: true,
      deficiencyNoticeTemplateCode: 'TEMPLATE-CIVIL-DEFICIENCY-NOTICE',
      requiredEvidenceCodes: ['TEMPLATE-CIVIL-ID-EVIDENCE'],
    },
    slaRules: [
      {
        ruleCode: 'TEMPLATE-CIVIL-SLA',
        label: 'Template civil registry SLA placeholder',
        targetDays: 15,
        clockStartsAtStageKey: 'intake',
      },
    ],
    fees: [
      {
        feeCode: 'TEMPLATE-CIVIL-FEE',
        label: 'Template civil registry fee placeholder',
        amount: 0,
        currencyCode: 'XXX',
        waivable: true,
      },
    ],
    outputs: [],
    communications: [
      {
        communicationCode: 'TEMPLATE-CIVIL-ACK',
        triggerStageKey: 'intake',
        channel: 'EMAIL',
        templateCode: 'TEMPLATE-ACKNOWLEDGMENT',
      },
    ],
    dependencies: [
      {
        dependencyCode: 'TEMPLATE-CIVIL-IDENTITY-INTEGRATION',
        dependencyType: 'IDENTITY_PROVIDER',
        description: 'NON_PRODUCTION identity verification integration placeholder',
        externalIntegrationCode: 'TEMPLATE-IDENTITY-PROVIDER',
      },
    ],
    decisionStages: [],
    issuance: {
      issuanceStageKey: 'issue',
      issuanceFunctionCode: CIVIL_REGISTRY_AUTHORITY_FUNCTION_CODES.CERTIFICATE_ISSUE,
      outputCodes: ['TEMPLATE-CIVIL-CERTIFICATE-OUTPUT'],
    },
    lifecycle: { supportsRenewal: false },
    redress: [
      {
        routeCode: 'TEMPLATE-CIVIL-REDRESS',
        label: 'Template administrative review',
        routeType: 'ADMINISTRATIVE_REVIEW',
        description: 'NON_PRODUCTION redress route placeholder',
      },
    ],
    dashboardIndicators: [
      {
        indicatorCode: 'TEMPLATE-CIVIL-PENDING-REG',
        label: 'Pending vital event registrations',
        metricType: 'QUEUE_DEPTH',
      },
    ],
    ...partial,
    ...extensions,
  };
}

const AUTH = CIVIL_REGISTRY_AUTHORITY_FUNCTION_CODES;

export const CIVIL_REGISTRY_SERVICE_PACK_MANIFEST: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: CIVIL_REGISTRY_SERVICE_PACK_ID,
  packVersion: '1.0.0',
  packName: 'Civil Identity & Vital Records Service Pack (Template)',
  description:
    'NON_PRODUCTION template service pack for civil identity and vital records vertical. All legal requirements, forms, evidence rules, fees, SLAs, and authority mappings are placeholders unless backed by verified governing sources.',
  institutionCode: CIVIL_REGISTRY_INSTITUTION_CODE,
  departmentCode: 'TEMPLATE-CIVIL-REGISTRY-DEPARTMENT',
  deploymentIntent: DEPLOYMENT_INTENT,
  services: [
    baseService(
      {
        serviceCode: 'TEMPLATE-REGISTER-BIRTH',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REGISTER_BIRTH,
        serviceName: 'Register Birth (Template)',
        serviceType: 'REGISTRATION',
        description: 'NON_PRODUCTION template birth registration service.',
      },
      {
        authorityFunctions: [
          {
            functionCode: AUTH.EVENT_INTAKE,
            publicStageLabel: 'Submit birth registration',
            authorityActionType: 'PREPARE',
            sequenceOrder: 1,
            isConsequential: false,
          },
          {
            functionCode: AUTH.EVENT_REGISTER,
            publicStageLabel: 'Register birth officially',
            authorityActionType: 'VERIFY',
            sequenceOrder: 2,
            isConsequential: true,
          },
        ],
        forms: [
          {
            formCode: 'TEMPLATE-BIRTH-REG-FORM',
            formName: 'Birth registration intake',
            versionLabel: '1.0.0',
            sections: [
              {
                sectionKey: 'child',
                label: 'Child details (placeholder)',
                fields: [
                  {
                    fieldKey: 'childGivenNames',
                    label: 'Given names',
                    fieldType: 'TEXT',
                    required: true,
                  },
                  {
                    fieldKey: 'dateOfBirth',
                    label: 'Date of birth',
                    fieldType: 'DATE',
                    required: true,
                  },
                ],
              },
            ],
          },
        ],
        evidenceRequirements: [
          {
            evidenceCode: 'TEMPLATE-CIVIL-ID-EVIDENCE',
            label: 'Identity evidence placeholder',
            description: 'Template identity evidence — not verified policy',
            required: true,
            verificationCategory: 'INTEGRITY',
          },
          {
            evidenceCode: 'TEMPLATE-BIRTH-MEDICAL-NOTICE',
            label: 'Medical notice placeholder',
            description: 'Template medical notification evidence',
            required: true,
            verificationCategory: 'ISSUER',
          },
        ],
        workflowStages: registrationWorkflow(AUTH.EVENT_INTAKE, AUTH.EVENT_REGISTER),
        decisionStages: [
          {
            stageKey: 'register',
            decisionActorFunctionCode: AUTH.EVENT_REGISTER,
            requiresSecondApproval: false,
          },
        ],
        issuance: {
          issuanceStageKey: 'register',
          issuanceFunctionCode: AUTH.EVENT_REGISTER,
          outputCodes: ['TEMPLATE-BIRTH-REGISTRATION-RECORD'],
        },
        outputs: [
          {
            outputCode: 'TEMPLATE-BIRTH-REGISTRATION-RECORD',
            label: 'Birth registration record (official)',
            outputType: 'REGISTRATION',
            deliveryChannel: 'SECURE_REGISTRY',
          },
        ],
        dashboardIndicators: [
          {
            indicatorCode: 'TEMPLATE-CIVIL-BIRTH-PENDING',
            label: 'Pending birth registrations',
            metricType: 'QUEUE_DEPTH',
          },
        ],
      },
    ),
    baseService(
      {
        serviceCode: 'TEMPLATE-REQUEST-BIRTH-CERTIFICATE',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REQUEST_BIRTH_CERTIFICATE,
        serviceName: 'Request Birth Certificate (Template)',
        serviceType: 'CERTIFICATE_REQUEST',
        description:
          'NON_PRODUCTION template birth certificate request — initiates governed issuance.',
      },
      {
        authorityFunctions: [
          {
            functionCode: AUTH.EVENT_INTAKE,
            publicStageLabel: 'Request certificate',
            authorityActionType: 'PREPARE',
            sequenceOrder: 1,
            isConsequential: false,
          },
          {
            functionCode: AUTH.CERTIFICATE_ISSUE,
            publicStageLabel: 'Issue birth certificate',
            authorityActionType: 'ISSUE',
            sequenceOrder: 2,
            isConsequential: true,
          },
        ],
        workflowStages: certificateWorkflow(AUTH.CERTIFICATE_ISSUE),
        decisionStages: [
          {
            stageKey: 'issue',
            decisionActorFunctionCode: AUTH.CERTIFICATE_ISSUE,
            requiresSecondApproval: false,
          },
        ],
        outputs: [
          {
            outputCode: 'TEMPLATE-CIVIL-CERTIFICATE-OUTPUT',
            label: 'Birth certificate extract',
            outputType: 'CERTIFICATE',
            deliveryChannel: 'PORTAL',
          },
        ],
      },
    ),
    baseService(
      {
        serviceCode: 'TEMPLATE-REGISTER-DEATH',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REGISTER_DEATH,
        serviceName: 'Register Death (Template)',
        serviceType: 'REGISTRATION',
        description: 'NON_PRODUCTION template death registration service.',
      },
      {
        authorityFunctions: [
          {
            functionCode: AUTH.EVENT_INTAKE,
            publicStageLabel: 'Submit death registration',
            authorityActionType: 'PREPARE',
            sequenceOrder: 1,
            isConsequential: false,
          },
          {
            functionCode: AUTH.EVENT_REGISTER,
            publicStageLabel: 'Register death officially',
            authorityActionType: 'VERIFY',
            sequenceOrder: 2,
            isConsequential: true,
          },
        ],
        workflowStages: registrationWorkflow(AUTH.EVENT_INTAKE, AUTH.EVENT_REGISTER),
        decisionStages: [
          {
            stageKey: 'register',
            decisionActorFunctionCode: AUTH.EVENT_REGISTER,
            requiresSecondApproval: false,
          },
        ],
        issuance: {
          issuanceStageKey: 'register',
          issuanceFunctionCode: AUTH.EVENT_REGISTER,
          outputCodes: ['TEMPLATE-DEATH-REGISTRATION-RECORD'],
        },
        outputs: [
          {
            outputCode: 'TEMPLATE-DEATH-REGISTRATION-RECORD',
            label: 'Death registration record',
            outputType: 'REGISTRATION',
            deliveryChannel: 'SECURE_REGISTRY',
          },
        ],
      },
    ),
    baseService(
      {
        serviceCode: 'TEMPLATE-REQUEST-DEATH-CERTIFICATE',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REQUEST_DEATH_CERTIFICATE,
        serviceName: 'Request Death Certificate (Template)',
        serviceType: 'CERTIFICATE_REQUEST',
        description: 'NON_PRODUCTION death certificate request service.',
      },
      {
        authorityFunctions: [
          {
            functionCode: AUTH.EVENT_INTAKE,
            publicStageLabel: 'Request certificate',
            authorityActionType: 'PREPARE',
            sequenceOrder: 1,
            isConsequential: false,
          },
          {
            functionCode: AUTH.CERTIFICATE_ISSUE,
            publicStageLabel: 'Issue death certificate',
            authorityActionType: 'ISSUE',
            sequenceOrder: 2,
            isConsequential: true,
          },
        ],
        workflowStages: certificateWorkflow(AUTH.CERTIFICATE_ISSUE),
        decisionStages: [
          {
            stageKey: 'issue',
            decisionActorFunctionCode: AUTH.CERTIFICATE_ISSUE,
            requiresSecondApproval: false,
          },
        ],
        outputs: [
          {
            outputCode: 'TEMPLATE-CIVIL-CERTIFICATE-OUTPUT',
            label: 'Death certificate extract',
            outputType: 'CERTIFICATE',
            deliveryChannel: 'PORTAL',
          },
        ],
      },
    ),
    baseService(
      {
        serviceCode: 'TEMPLATE-REGISTER-MARRIAGE',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REGISTER_MARRIAGE,
        serviceName: 'Register Marriage (Template)',
        serviceType: 'REGISTRATION',
        description: 'NON_PRODUCTION marriage registration template.',
      },
      {
        authorityFunctions: [
          {
            functionCode: AUTH.EVENT_INTAKE,
            publicStageLabel: 'Submit marriage registration',
            authorityActionType: 'PREPARE',
            sequenceOrder: 1,
            isConsequential: false,
          },
          {
            functionCode: AUTH.EVENT_REGISTER,
            publicStageLabel: 'Register marriage officially',
            authorityActionType: 'VERIFY',
            sequenceOrder: 2,
            isConsequential: true,
          },
        ],
        workflowStages: registrationWorkflow(AUTH.EVENT_INTAKE, AUTH.EVENT_REGISTER),
        decisionStages: [
          {
            stageKey: 'register',
            decisionActorFunctionCode: AUTH.EVENT_REGISTER,
            requiresSecondApproval: false,
          },
        ],
        issuance: {
          issuanceStageKey: 'register',
          issuanceFunctionCode: AUTH.EVENT_REGISTER,
          outputCodes: ['TEMPLATE-MARRIAGE-REGISTRATION-RECORD'],
        },
        outputs: [
          {
            outputCode: 'TEMPLATE-MARRIAGE-REGISTRATION-RECORD',
            label: 'Marriage registration record',
            outputType: 'REGISTRATION',
            deliveryChannel: 'SECURE_REGISTRY',
          },
        ],
      },
    ),
    baseService(
      {
        serviceCode: 'TEMPLATE-REQUEST-MARRIAGE-CERTIFICATE',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REQUEST_MARRIAGE_CERTIFICATE,
        serviceName: 'Request Marriage Certificate (Template)',
        serviceType: 'CERTIFICATE_REQUEST',
        description: 'NON_PRODUCTION marriage certificate request.',
      },
      {
        authorityFunctions: [
          {
            functionCode: AUTH.EVENT_INTAKE,
            publicStageLabel: 'Request certificate',
            authorityActionType: 'PREPARE',
            sequenceOrder: 1,
            isConsequential: false,
          },
          {
            functionCode: AUTH.CERTIFICATE_ISSUE,
            publicStageLabel: 'Issue marriage certificate',
            authorityActionType: 'ISSUE',
            sequenceOrder: 2,
            isConsequential: true,
          },
        ],
        workflowStages: certificateWorkflow(AUTH.CERTIFICATE_ISSUE),
        decisionStages: [
          {
            stageKey: 'issue',
            decisionActorFunctionCode: AUTH.CERTIFICATE_ISSUE,
            requiresSecondApproval: false,
          },
        ],
        outputs: [
          {
            outputCode: 'TEMPLATE-CIVIL-CERTIFICATE-OUTPUT',
            label: 'Marriage certificate extract',
            outputType: 'CERTIFICATE',
            deliveryChannel: 'PORTAL',
          },
        ],
      },
    ),
    baseService(
      {
        serviceCode: 'TEMPLATE-REGISTER-DIVORCE',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REGISTER_DIVORCE,
        serviceName: 'Register Divorce / Civil Status Change (Template)',
        serviceType: 'REGISTRATION',
        description: 'NON_PRODUCTION divorce or civil status change registration.',
      },
      {
        authorityFunctions: [
          {
            functionCode: AUTH.EVENT_INTAKE,
            publicStageLabel: 'Submit civil status change',
            authorityActionType: 'PREPARE',
            sequenceOrder: 1,
            isConsequential: false,
          },
          {
            functionCode: AUTH.EVENT_REGISTER,
            publicStageLabel: 'Register civil status change',
            authorityActionType: 'VERIFY',
            sequenceOrder: 2,
            isConsequential: true,
          },
        ],
        workflowStages: registrationWorkflow(AUTH.EVENT_INTAKE, AUTH.EVENT_REGISTER),
        decisionStages: [
          {
            stageKey: 'register',
            decisionActorFunctionCode: AUTH.EVENT_REGISTER,
            requiresSecondApproval: true,
          },
        ],
        issuance: {
          issuanceStageKey: 'register',
          issuanceFunctionCode: AUTH.EVENT_REGISTER,
          outputCodes: ['TEMPLATE-CIVIL-STATUS-CHANGE-RECORD'],
        },
        outputs: [
          {
            outputCode: 'TEMPLATE-CIVIL-STATUS-CHANGE-RECORD',
            label: 'Civil status change record',
            outputType: 'REGISTRATION',
            deliveryChannel: 'SECURE_REGISTRY',
          },
        ],
      },
    ),
    baseService(
      {
        serviceCode: 'TEMPLATE-LEGAL-NAME-CHANGE',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.LEGAL_NAME_CHANGE,
        serviceName: 'Legal Name Change Application (Template)',
        serviceType: 'APPLICATION',
        description: 'NON_PRODUCTION legal name change application template.',
      },
      {
        authorityFunctions: [
          {
            functionCode: AUTH.EVENT_INTAKE,
            publicStageLabel: 'Submit name change application',
            authorityActionType: 'PREPARE',
            sequenceOrder: 1,
            isConsequential: false,
          },
          {
            functionCode: AUTH.RECORD_AMEND,
            publicStageLabel: 'Amend civil identity record',
            authorityActionType: 'APPROVE',
            sequenceOrder: 2,
            isConsequential: true,
          },
        ],
        workflowStages: [
          ...registrationWorkflow(AUTH.EVENT_INTAKE, AUTH.RECORD_AMEND).slice(0, 2),
          {
            stageKey: 'amend',
            label: 'Name change decision',
            displayOrder: 3,
            stepType: 'DECISION_GATE',
            consequenceLevel: 'CONSEQUENTIAL',
            authorityFunctionCode: AUTH.RECORD_AMEND,
            authorityActionType: 'APPROVE',
            isDecisionStage: true,
          },
        ],
        decisionStages: [
          {
            stageKey: 'amend',
            decisionActorFunctionCode: AUTH.RECORD_AMEND,
            requiresSecondApproval: true,
          },
        ],
        issuance: {
          issuanceStageKey: 'amend',
          issuanceFunctionCode: AUTH.RECORD_AMEND,
          outputCodes: ['TEMPLATE-NAME-CHANGE-NOTICE'],
        },
        outputs: [
          {
            outputCode: 'TEMPLATE-NAME-CHANGE-NOTICE',
            label: 'Name change notice',
            outputType: 'NOTICE',
            deliveryChannel: 'PORTAL',
          },
        ],
      },
    ),
    baseService(
      {
        serviceCode: 'TEMPLATE-CIVIL-RECORD-CORRECTION',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.RECORD_CORRECTION,
        serviceName: 'Civil Record Correction (Template)',
        serviceType: 'CORRECTION',
        description:
          'NON_PRODUCTION civil record correction request preserving original record versions.',
      },
      {
        authorityFunctions: [
          {
            functionCode: AUTH.EVENT_INTAKE,
            publicStageLabel: 'Submit correction request',
            authorityActionType: 'PREPARE',
            sequenceOrder: 1,
            isConsequential: false,
          },
          {
            functionCode: AUTH.CORRECTION_APPROVE,
            publicStageLabel: 'Approve record correction',
            authorityActionType: 'APPROVE',
            sequenceOrder: 2,
            isConsequential: true,
          },
        ],
        workflowStages: [
          ...registrationWorkflow(AUTH.EVENT_INTAKE, AUTH.CORRECTION_APPROVE).slice(0, 2),
          {
            stageKey: 'correction',
            label: 'Correction approval',
            displayOrder: 3,
            stepType: 'DECISION_GATE',
            consequenceLevel: 'CONSEQUENTIAL',
            authorityFunctionCode: AUTH.CORRECTION_APPROVE,
            authorityActionType: 'APPROVE',
            isDecisionStage: true,
          },
        ],
        decisionStages: [
          {
            stageKey: 'correction',
            decisionActorFunctionCode: AUTH.CORRECTION_APPROVE,
            requiresSecondApproval: true,
          },
        ],
        issuance: {
          issuanceStageKey: 'correction',
          issuanceFunctionCode: AUTH.CORRECTION_APPROVE,
          outputCodes: ['TEMPLATE-CORRECTION-NOTICE'],
        },
        outputs: [
          {
            outputCode: 'TEMPLATE-CORRECTION-NOTICE',
            label: 'Correction decision notice',
            outputType: 'NOTICE',
            deliveryChannel: 'PORTAL',
          },
        ],
        dashboardIndicators: [
          {
            indicatorCode: 'TEMPLATE-CIVIL-CORRECTION-QUEUE',
            label: 'Correction requests pending',
            metricType: 'QUEUE_DEPTH',
          },
        ],
      },
    ),
    baseService(
      {
        serviceCode: 'TEMPLATE-CIVIL-REGISTRY-VERIFICATION',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REGISTRY_VERIFICATION,
        serviceName: 'Civil Registry Verification Service (Template)',
        serviceType: 'VERIFICATION',
        description:
          'NON_PRODUCTION controlled verification for issued civil certificates without exposing underlying record contents.',
      },
      {
        applicantCategories: ['CITIZEN', 'INDIVIDUAL', 'BUSINESS', 'GOVERNMENT_ENTITY'],
        authorityFunctions: [
          {
            functionCode: AUTH.VERIFICATION_ATTEST,
            publicStageLabel: 'Attest verification response',
            authorityActionType: 'ISSUE',
            sequenceOrder: 1,
            isConsequential: true,
          },
        ],
        workflowStages: [
          {
            stageKey: 'verify',
            label: 'Verification attestation',
            displayOrder: 1,
            stepType: 'ISSUANCE_GATE',
            consequenceLevel: 'CONSEQUENTIAL',
            authorityFunctionCode: AUTH.VERIFICATION_ATTEST,
            authorityActionType: 'ISSUE',
            isIssuanceStage: true,
          },
        ],
        decisionStages: [
          {
            stageKey: 'verify',
            decisionActorFunctionCode: AUTH.VERIFICATION_ATTEST,
            requiresSecondApproval: false,
          },
        ],
        issuance: {
          issuanceStageKey: 'verify',
          issuanceFunctionCode: AUTH.VERIFICATION_ATTEST,
          outputCodes: ['TEMPLATE-VERIFICATION-ATTESTATION'],
        },
        outputs: [
          {
            outputCode: 'TEMPLATE-VERIFICATION-ATTESTATION',
            label: 'Verification attestation token',
            outputType: 'VERIFICATION',
            deliveryChannel: 'PUBLIC_LOOKUP',
          },
        ],
        dependencies: [
          {
            dependencyCode: 'TEMPLATE-CIVIL-QR-TOKEN-INTEGRATION',
            dependencyType: 'INTEGRATION',
            description: 'NON_PRODUCTION QR / reference token architecture placeholder',
            externalIntegrationCode: 'TEMPLATE-QR-TOKEN-SERVICE',
          },
        ],
      },
    ),
  ],
};

export function civilRegistryServicePackFingerprint(): string {
  return createHash('sha256')
    .update(JSON.stringify(CIVIL_REGISTRY_SERVICE_PACK_MANIFEST))
    .digest('hex');
}

/** Ensures packLabel export matches governance constant. */
export const CIVIL_REGISTRY_PACK_LABEL = CIVIL_REGISTRY_SERVICE_PACK_LABEL;
