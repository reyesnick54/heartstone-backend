import {
  SERVICE_PACK_SCHEMA_VERSION,
  SERVICE_PACK_TEMPLATE_ONLY_LABEL,
} from './service-pack.constants';
import { type ServicePackManifest, type ServicePackServiceDefinition } from './service-pack.types';

const DEPLOYMENT_INTENT = {
  targetMaturityStatus: 'DRAFT' as const,
  targetPublicAvailability: 'UNDER_DEVELOPMENT' as const,
  requiresInstitutionalAcceptance: true as const,
  requiresOperationalActivation: true as const,
};

function baseService(
  partial: Pick<
    ServicePackServiceDefinition,
    | 'serviceCode'
    | 'serviceSlug'
    | 'serviceName'
    | 'serviceFamilyCode'
    | 'serviceType'
    | 'description'
    | 'applicantCategories'
  >,
  extensions: Partial<ServicePackServiceDefinition>,
): ServicePackServiceDefinition {
  return {
    authorityFunctions: [],
    forms: [],
    evidenceRequirements: [],
    workflowStages: [],
    completenessReview: { enabled: true, requiredEvidenceCodes: [] },
    slaRules: [],
    fees: [],
    outputs: [],
    communications: [],
    dependencies: [],
    decisionStages: [],
    issuance: {
      issuanceStageKey: 'issuance',
      issuanceFunctionCode: 'TEMPLATE-AUTH-REGISTRATION-VERIFY',
      outputCodes: [],
    },
    lifecycle: { supportsRenewal: false },
    redress: [],
    dashboardIndicators: [],
    ...partial,
    ...extensions,
  };
}

function pack(
  packId: string,
  packName: string,
  description: string,
  serviceFamilyCode: string,
  service: ServicePackServiceDefinition,
): ServicePackManifest {
  return {
    schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
    packLabel: SERVICE_PACK_TEMPLATE_ONLY_LABEL,
    packId,
    packVersion: '1.0.0',
    packName,
    description: `${description} NON_PRODUCTION / TEMPLATE ONLY — not verified law or policy.`,
    institutionCode: 'TEMPLATE-INSTITUTION',
    departmentCode: 'TEMPLATE-DEPARTMENT',
    deploymentIntent: DEPLOYMENT_INTENT,
    services: [{ ...service, serviceFamilyCode: service.serviceFamilyCode || serviceFamilyCode }],
  };
}

export const SIMPLE_REGISTRATION_TEMPLATE: ServicePackManifest = pack(
  'template-simple-registration',
  'Simple Registration Service Template',
  'Canonical template for low-complexity registration services.',
  'TEMPLATE-FAMILY-REGISTRATION',
  baseService(
    {
      serviceCode: 'TEMPLATE-SIMPLE-REGISTRATION',
      serviceSlug: 'template-simple-registration',
      serviceName: 'Template Simple Registration',
      serviceFamilyCode: 'TEMPLATE-FAMILY-REGISTRATION',
      serviceType: 'REGISTRATION',
      description: 'NON_PRODUCTION simple registration template.',
      applicantCategories: ['INDIVIDUAL', 'CITIZEN'],
    },
    {
      authorityFunctions: [
        {
          functionCode: 'TEMPLATE-AUTH-REGISTRATION-INTAKE',
          publicStageLabel: 'Submit registration',
          authorityActionType: 'PREPARE',
          sequenceOrder: 1,
          isConsequential: false,
        },
        {
          functionCode: 'TEMPLATE-AUTH-REGISTRATION-VERIFY',
          publicStageLabel: 'Confirm registration',
          authorityActionType: 'VERIFY',
          sequenceOrder: 2,
          isConsequential: true,
        },
      ],
      forms: [
        {
          formCode: 'TEMPLATE-REG-FORM',
          formName: 'Registration intake',
          versionLabel: '1.0.0',
          sections: [
            {
              sectionKey: 'applicant',
              label: 'Applicant details',
              fields: [
                { fieldKey: 'fullName', label: 'Full name', fieldType: 'TEXT', required: true },
                { fieldKey: 'email', label: 'Email', fieldType: 'EMAIL', required: true },
              ],
            },
          ],
        },
      ],
      evidenceRequirements: [
        {
          evidenceCode: 'TEMPLATE-ID-DOC',
          label: 'Identity document',
          description: 'Template identity evidence placeholder',
          required: true,
          verificationCategory: 'INTEGRITY',
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
          stageKey: 'completeness',
          label: 'Completeness review',
          displayOrder: 2,
          stepType: 'COMPLETENESS_REVIEW',
          authorityFunctionCode: 'TEMPLATE-AUTH-REGISTRATION-INTAKE',
          authorityActionType: 'REVIEW',
          consequenceLevel: 'ADMINISTRATIVE',
        },
        {
          stageKey: 'verify',
          label: 'Verify registration',
          displayOrder: 3,
          stepType: 'SUBSTANTIVE_REVIEW',
          authorityFunctionCode: 'TEMPLATE-AUTH-REGISTRATION-VERIFY',
          authorityActionType: 'VERIFY',
          consequenceLevel: 'CONSEQUENTIAL',
          isDecisionStage: true,
        },
        {
          stageKey: 'issuance',
          label: 'Issue confirmation',
          displayOrder: 4,
          stepType: 'ISSUANCE_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-REGISTRATION-VERIFY',
          authorityActionType: 'ISSUE',
          consequenceLevel: 'CONSEQUENTIAL',
          isIssuanceStage: true,
        },
      ],
      completenessReview: {
        enabled: true,
        deficiencyNoticeTemplateCode: 'TEMPLATE-DEFICIENCY-NOTICE',
        requiredEvidenceCodes: ['TEMPLATE-ID-DOC'],
      },
      slaRules: [
        {
          ruleCode: 'TEMPLATE-REG-SLA',
          label: 'Registration decision SLA',
          targetDays: 10,
          clockStartsAtStageKey: 'intake',
        },
      ],
      fees: [],
      outputs: [
        {
          outputCode: 'TEMPLATE-REG-CONFIRMATION',
          label: 'Registration confirmation',
          outputType: 'CONFIRMATION',
          deliveryChannel: 'PORTAL',
        },
      ],
      communications: [
        {
          communicationCode: 'TEMPLATE-REG-ACK',
          triggerStageKey: 'intake',
          channel: 'EMAIL',
          templateCode: 'TEMPLATE-ACKNOWLEDGMENT',
        },
      ],
      dependencies: [],
      decisionStages: [
        {
          stageKey: 'verify',
          decisionActorFunctionCode: 'TEMPLATE-AUTH-REGISTRATION-VERIFY',
          requiresSecondApproval: false,
        },
      ],
      issuance: {
        issuanceStageKey: 'issuance',
        issuanceFunctionCode: 'TEMPLATE-AUTH-REGISTRATION-VERIFY',
        outputCodes: ['TEMPLATE-REG-CONFIRMATION'],
      },
      lifecycle: { supportsRenewal: false },
      redress: [
        {
          routeCode: 'TEMPLATE-REG-REVIEW',
          label: 'Administrative review',
          routeType: 'ADMINISTRATIVE_REVIEW',
          description: 'Template review route',
        },
      ],
      dashboardIndicators: [
        {
          indicatorCode: 'TEMPLATE-REG-PENDING',
          label: 'Pending registrations',
          metricType: 'QUEUE_DEPTH',
        },
      ],
    },
  ),
);

export const LICENSE_PERMIT_TEMPLATE: ServicePackManifest = pack(
  'template-license-permit',
  'License / Permit Service Template',
  'Canonical template for licensure and permit services with fees and issuance.',
  'TEMPLATE-FAMILY-LICENSING',
  baseService(
    {
      serviceCode: 'TEMPLATE-LICENSE-PERMIT',
      serviceSlug: 'template-license-permit',
      serviceName: 'Template License / Permit',
      serviceFamilyCode: 'TEMPLATE-FAMILY-LICENSING',
      serviceType: 'LICENCE',
      description: 'NON_PRODUCTION license/permit template.',
      applicantCategories: ['BUSINESS', 'PROFESSIONAL'],
    },
    {
      authorityFunctions: [
        {
          functionCode: 'TEMPLATE-AUTH-LICENSE-REVIEW',
          publicStageLabel: 'License review',
          authorityActionType: 'REVIEW',
          sequenceOrder: 1,
          isConsequential: false,
        },
        {
          functionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
          publicStageLabel: 'Issue license',
          authorityActionType: 'ISSUE',
          sequenceOrder: 2,
          isConsequential: true,
        },
      ],
      forms: [
        {
          formCode: 'TEMPLATE-LICENSE-FORM',
          formName: 'License application',
          versionLabel: '1.0.0',
          sections: [
            {
              sectionKey: 'business',
              label: 'Business details',
              fields: [
                {
                  fieldKey: 'businessName',
                  label: 'Business name',
                  fieldType: 'TEXT',
                  required: true,
                },
                {
                  fieldKey: 'licenseClass',
                  label: 'License class',
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
          evidenceCode: 'TEMPLATE-BUSINESS-REG',
          label: 'Business registration',
          description: 'Template business registration evidence',
          required: true,
          verificationCategory: 'ISSUER',
        },
        {
          evidenceCode: 'TEMPLATE-QUALIFICATION',
          label: 'Professional qualification',
          description: 'Template qualification evidence',
          required: true,
          verificationCategory: 'PROFESSIONAL',
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
          stageKey: 'completeness',
          label: 'Completeness review',
          displayOrder: 2,
          stepType: 'COMPLETENESS_REVIEW',
          authorityFunctionCode: 'TEMPLATE-AUTH-LICENSE-REVIEW',
          authorityActionType: 'REVIEW',
          consequenceLevel: 'ADMINISTRATIVE',
        },
        {
          stageKey: 'substantive',
          label: 'Substantive review',
          displayOrder: 3,
          stepType: 'SUBSTANTIVE_REVIEW',
          authorityFunctionCode: 'TEMPLATE-AUTH-LICENSE-REVIEW',
          authorityActionType: 'REVIEW',
          consequenceLevel: 'CONSEQUENTIAL',
          isDecisionStage: true,
        },
        {
          stageKey: 'issuance',
          label: 'Issue license',
          displayOrder: 4,
          stepType: 'ISSUANCE_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
          authorityActionType: 'ISSUE',
          consequenceLevel: 'CONSEQUENTIAL',
          isIssuanceStage: true,
        },
      ],
      completenessReview: {
        enabled: true,
        deficiencyNoticeTemplateCode: 'TEMPLATE-DEFICIENCY-NOTICE',
        requiredEvidenceCodes: ['TEMPLATE-BUSINESS-REG', 'TEMPLATE-QUALIFICATION'],
      },
      slaRules: [
        {
          ruleCode: 'TEMPLATE-LICENSE-SLA',
          label: 'License decision SLA',
          targetDays: 30,
          clockStartsAtStageKey: 'intake',
        },
      ],
      fees: [
        {
          feeCode: 'TEMPLATE-LICENSE-FEE',
          label: 'Application fee',
          amount: 250,
          currencyCode: 'USD',
          waivable: false,
        },
      ],
      outputs: [
        {
          outputCode: 'TEMPLATE-LICENSE-CERT',
          label: 'License certificate',
          outputType: 'LICENCE',
          deliveryChannel: 'PORTAL',
        },
      ],
      communications: [
        {
          communicationCode: 'TEMPLATE-LICENSE-FEE-NOTICE',
          triggerStageKey: 'intake',
          channel: 'EMAIL',
          templateCode: 'TEMPLATE-FEE-NOTICE',
        },
      ],
      dependencies: [],
      decisionStages: [
        {
          stageKey: 'substantive',
          decisionActorFunctionCode: 'TEMPLATE-AUTH-LICENSE-REVIEW',
          requiresSecondApproval: true,
        },
      ],
      issuance: {
        issuanceStageKey: 'issuance',
        issuanceFunctionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
        outputCodes: ['TEMPLATE-LICENSE-CERT'],
      },
      lifecycle: {
        supportsRenewal: true,
        renewalServiceCode: 'TEMPLATE-LICENSE-RENEWAL',
        validityPeriodDays: 365,
      },
      redress: [
        {
          routeCode: 'TEMPLATE-LICENSE-APPEAL',
          label: 'License appeal',
          routeType: 'APPEAL',
          description: 'Template appeal route',
        },
      ],
      dashboardIndicators: [
        {
          indicatorCode: 'TEMPLATE-LICENSE-SLA-RISK',
          label: 'SLA at-risk licenses',
          metricType: 'SLA_BREACH_RISK',
          threshold: 5,
        },
      ],
    },
  ),
);

export const RENEWAL_TEMPLATE: ServicePackManifest = pack(
  'template-renewal',
  'Renewal Service Template',
  'Canonical template for renewal of existing authorizations.',
  'TEMPLATE-FAMILY-RENEWAL',
  baseService(
    {
      serviceCode: 'TEMPLATE-LICENSE-RENEWAL',
      serviceSlug: 'template-license-renewal',
      serviceName: 'Template License Renewal',
      serviceFamilyCode: 'TEMPLATE-FAMILY-RENEWAL',
      serviceType: 'LICENCE',
      description: 'NON_PRODUCTION renewal template.',
      applicantCategories: ['BUSINESS', 'PROFESSIONAL'],
    },
    {
      authorityFunctions: [
        {
          functionCode: 'TEMPLATE-AUTH-RENEWAL-VERIFY',
          publicStageLabel: 'Verify renewal eligibility',
          authorityActionType: 'VERIFY',
          sequenceOrder: 1,
          isConsequential: false,
        },
        {
          functionCode: 'TEMPLATE-AUTH-RENEWAL-ISSUANCE',
          publicStageLabel: 'Issue renewed authorization',
          authorityActionType: 'ISSUE',
          sequenceOrder: 2,
          isConsequential: true,
        },
      ],
      forms: [
        {
          formCode: 'TEMPLATE-RENEWAL-FORM',
          formName: 'Renewal application',
          versionLabel: '1.0.0',
          sections: [
            {
              sectionKey: 'renewal',
              label: 'Renewal details',
              fields: [
                {
                  fieldKey: 'existingLicenseNumber',
                  label: 'Existing license number',
                  fieldType: 'IDENTIFIER',
                  required: true,
                },
                {
                  fieldKey: 'changesDeclared',
                  label: 'Changes declared',
                  fieldType: 'BOOLEAN',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
      evidenceRequirements: [
        {
          evidenceCode: 'TEMPLATE-CURRENT-LICENSE',
          label: 'Current license',
          description: 'Template current license evidence',
          required: true,
          verificationCategory: 'INTEGRITY',
        },
        {
          evidenceCode: 'TEMPLATE-COMPLIANCE-STATEMENT',
          label: 'Compliance statement',
          description: 'Template compliance statement',
          required: true,
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
          stageKey: 'completeness',
          label: 'Completeness review',
          displayOrder: 2,
          stepType: 'COMPLETENESS_REVIEW',
          authorityFunctionCode: 'TEMPLATE-AUTH-RENEWAL-VERIFY',
          authorityActionType: 'REVIEW',
          consequenceLevel: 'ADMINISTRATIVE',
        },
        {
          stageKey: 'verify',
          label: 'Verify eligibility',
          displayOrder: 3,
          stepType: 'SUBSTANTIVE_REVIEW',
          authorityFunctionCode: 'TEMPLATE-AUTH-RENEWAL-VERIFY',
          authorityActionType: 'VERIFY',
          consequenceLevel: 'CONSEQUENTIAL',
          isDecisionStage: true,
        },
        {
          stageKey: 'issuance',
          label: 'Issue renewal',
          displayOrder: 4,
          stepType: 'ISSUANCE_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-RENEWAL-ISSUANCE',
          authorityActionType: 'ISSUE',
          consequenceLevel: 'CONSEQUENTIAL',
          isIssuanceStage: true,
        },
      ],
      completenessReview: {
        enabled: true,
        requiredEvidenceCodes: ['TEMPLATE-CURRENT-LICENSE', 'TEMPLATE-COMPLIANCE-STATEMENT'],
      },
      slaRules: [
        {
          ruleCode: 'TEMPLATE-RENEWAL-SLA',
          label: 'Renewal SLA',
          targetDays: 15,
          clockStartsAtStageKey: 'intake',
        },
      ],
      fees: [
        {
          feeCode: 'TEMPLATE-RENEWAL-FEE',
          label: 'Renewal fee',
          amount: 100,
          currencyCode: 'USD',
          waivable: true,
        },
      ],
      outputs: [
        {
          outputCode: 'TEMPLATE-RENEWED-LICENSE',
          label: 'Renewed license',
          outputType: 'LICENCE',
          deliveryChannel: 'PORTAL',
        },
      ],
      communications: [
        {
          communicationCode: 'TEMPLATE-RENEWAL-REMINDER',
          triggerStageKey: 'intake',
          channel: 'EMAIL',
          templateCode: 'TEMPLATE-RENEWAL-NOTICE',
        },
      ],
      dependencies: [
        {
          dependencyCode: 'TEMPLATE-PRIOR-LICENSE',
          dependencyType: 'PRIOR_AUTHORIZATION',
          description: 'Requires valid prior license',
        },
      ],
      decisionStages: [
        {
          stageKey: 'verify',
          decisionActorFunctionCode: 'TEMPLATE-AUTH-RENEWAL-VERIFY',
          requiresSecondApproval: false,
        },
      ],
      issuance: {
        issuanceStageKey: 'issuance',
        issuanceFunctionCode: 'TEMPLATE-AUTH-RENEWAL-ISSUANCE',
        outputCodes: ['TEMPLATE-RENEWED-LICENSE'],
      },
      lifecycle: {
        supportsRenewal: false,
        validityPeriodDays: 365,
        supersessionPolicyCode: 'TEMPLATE-SUPERSEDE-PRIOR',
      },
      redress: [
        {
          routeCode: 'TEMPLATE-RENEWAL-REVIEW',
          label: 'Renewal review',
          routeType: 'ADMINISTRATIVE_REVIEW',
          description: 'Template renewal review route',
        },
      ],
      dashboardIndicators: [
        {
          indicatorCode: 'TEMPLATE-RENEWAL-EXPIRING',
          label: 'Expiring authorizations',
          metricType: 'EXPIRY_WINDOW',
        },
      ],
    },
  ),
);

export const INSPECTION_DEPENDENT_TEMPLATE: ServicePackManifest = pack(
  'template-inspection-dependent',
  'Inspection-Dependent Service Template',
  'Canonical template where issuance depends on inspection outcomes.',
  'TEMPLATE-FAMILY-INSPECTION',
  baseService(
    {
      serviceCode: 'TEMPLATE-INSPECTION-SERVICE',
      serviceSlug: 'template-inspection-service',
      serviceName: 'Template Inspection-Dependent Service',
      serviceFamilyCode: 'TEMPLATE-FAMILY-INSPECTION',
      serviceType: 'PERMIT',
      description: 'NON_PRODUCTION inspection-dependent template.',
      applicantCategories: ['BUSINESS'],
    },
    {
      authorityFunctions: [
        {
          functionCode: 'TEMPLATE-AUTH-INSPECTION-SCHEDULE',
          publicStageLabel: 'Schedule inspection',
          authorityActionType: 'PREPARE',
          sequenceOrder: 1,
          isConsequential: false,
        },
        {
          functionCode: 'TEMPLATE-AUTH-INSPECTION-VERIFY',
          publicStageLabel: 'Verify inspection',
          authorityActionType: 'INSPECT',
          sequenceOrder: 2,
          isConsequential: true,
        },
        {
          functionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
          publicStageLabel: 'Issue permit',
          authorityActionType: 'ISSUE',
          sequenceOrder: 3,
          isConsequential: true,
        },
      ],
      forms: [
        {
          formCode: 'TEMPLATE-INSPECTION-FORM',
          formName: 'Permit with inspection',
          versionLabel: '1.0.0',
          sections: [
            {
              sectionKey: 'site',
              label: 'Site details',
              fields: [
                {
                  fieldKey: 'siteAddress',
                  label: 'Site address',
                  fieldType: 'ADDRESS',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
      evidenceRequirements: [
        {
          evidenceCode: 'TEMPLATE-SITE-PLAN',
          label: 'Site plan',
          description: 'Template site plan evidence',
          required: true,
          verificationCategory: 'CONTENT_FACT',
        },
        {
          evidenceCode: 'TEMPLATE-INSPECTION-REPORT',
          label: 'Inspection report',
          description: 'Template inspection report',
          required: true,
          verificationCategory: 'INSPECTION',
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
          stageKey: 'completeness',
          label: 'Completeness review',
          displayOrder: 2,
          stepType: 'COMPLETENESS_REVIEW',
          consequenceLevel: 'ADMINISTRATIVE',
        },
        {
          stageKey: 'inspection',
          label: 'Inspection',
          displayOrder: 3,
          stepType: 'SUBSTANTIVE_REVIEW',
          authorityFunctionCode: 'TEMPLATE-AUTH-INSPECTION-VERIFY',
          authorityActionType: 'INSPECT',
          consequenceLevel: 'CONSEQUENTIAL',
        },
        {
          stageKey: 'decision',
          label: 'Decision',
          displayOrder: 4,
          stepType: 'DECISION_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-INSPECTION-VERIFY',
          authorityActionType: 'DECIDE',
          consequenceLevel: 'CONSEQUENTIAL',
          isDecisionStage: true,
        },
        {
          stageKey: 'issuance',
          label: 'Issuance',
          displayOrder: 5,
          stepType: 'ISSUANCE_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
          authorityActionType: 'ISSUE',
          consequenceLevel: 'CONSEQUENTIAL',
          isIssuanceStage: true,
        },
      ],
      completenessReview: { enabled: true, requiredEvidenceCodes: ['TEMPLATE-SITE-PLAN'] },
      slaRules: [
        {
          ruleCode: 'TEMPLATE-INSPECTION-SLA',
          label: 'Inspection completion SLA',
          targetDays: 21,
          clockStartsAtStageKey: 'inspection',
        },
      ],
      fees: [
        {
          feeCode: 'TEMPLATE-INSPECTION-FEE',
          label: 'Inspection fee',
          amount: 150,
          currencyCode: 'USD',
          waivable: false,
        },
      ],
      outputs: [
        {
          outputCode: 'TEMPLATE-PERMIT',
          label: 'Permit certificate',
          outputType: 'PERMIT',
          deliveryChannel: 'PORTAL',
        },
      ],
      communications: [
        {
          communicationCode: 'TEMPLATE-INSPECTION-SCHEDULED',
          triggerStageKey: 'inspection',
          channel: 'EMAIL',
          templateCode: 'TEMPLATE-INSPECTION-NOTICE',
        },
      ],
      dependencies: [
        {
          dependencyCode: 'TEMPLATE-INSPECTION-SCHEDULER',
          dependencyType: 'OPERATIONAL',
          description: 'Inspection scheduling dependency',
        },
      ],
      decisionStages: [
        {
          stageKey: 'decision',
          decisionActorFunctionCode: 'TEMPLATE-AUTH-INSPECTION-VERIFY',
          requiresSecondApproval: false,
        },
      ],
      issuance: {
        issuanceStageKey: 'issuance',
        issuanceFunctionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
        outputCodes: ['TEMPLATE-PERMIT'],
      },
      lifecycle: {
        supportsRenewal: true,
        renewalServiceCode: 'TEMPLATE-LICENSE-RENEWAL',
        validityPeriodDays: 180,
      },
      redress: [
        {
          routeCode: 'TEMPLATE-INSPECTION-APPEAL',
          label: 'Inspection appeal',
          routeType: 'APPEAL',
          description: 'Template inspection appeal route',
        },
      ],
      dashboardIndicators: [
        {
          indicatorCode: 'TEMPLATE-INSPECTION-BACKLOG',
          label: 'Inspection backlog',
          metricType: 'QUEUE_DEPTH',
        },
      ],
    },
  ),
);

export const EXTERNAL_AUTHORITY_TEMPLATE: ServicePackManifest = pack(
  'template-external-authority',
  'External-Authority-Dependent Service Template',
  'Canonical template requiring external authority determination.',
  'TEMPLATE-FAMILY-EXTERNAL',
  baseService(
    {
      serviceCode: 'TEMPLATE-EXTERNAL-AUTHORITY',
      serviceSlug: 'template-external-authority',
      serviceName: 'Template External Authority Service',
      serviceFamilyCode: 'TEMPLATE-FAMILY-EXTERNAL',
      serviceType: 'APPLICATION',
      description: 'NON_PRODUCTION external-authority template.',
      applicantCategories: ['BUSINESS', 'INVESTOR'],
    },
    {
      authorityFunctions: [
        {
          functionCode: 'TEMPLATE-AUTH-EXTERNAL-REFERRAL',
          publicStageLabel: 'External referral',
          authorityActionType: 'PREPARE',
          sequenceOrder: 1,
          isConsequential: false,
        },
        {
          functionCode: 'TEMPLATE-AUTH-EXTERNAL-DETERMINATION',
          publicStageLabel: 'External determination',
          authorityActionType: 'REVIEW',
          sequenceOrder: 2,
          isConsequential: true,
        },
        {
          functionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
          publicStageLabel: 'Issue authorization',
          authorityActionType: 'ISSUE',
          sequenceOrder: 3,
          isConsequential: true,
        },
      ],
      forms: [
        {
          formCode: 'TEMPLATE-EXTERNAL-FORM',
          formName: 'External referral application',
          versionLabel: '1.0.0',
          sections: [
            {
              sectionKey: 'referral',
              label: 'Referral details',
              fields: [
                {
                  fieldKey: 'externalCaseReference',
                  label: 'External case reference',
                  fieldType: 'IDENTIFIER',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
      evidenceRequirements: [
        {
          evidenceCode: 'TEMPLATE-EXTERNAL-CONSENT',
          label: 'External authority consent',
          description: 'Template external consent evidence',
          required: true,
          verificationCategory: 'ISSUER',
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
          stageKey: 'completeness',
          label: 'Completeness review',
          displayOrder: 2,
          stepType: 'COMPLETENESS_REVIEW',
          consequenceLevel: 'ADMINISTRATIVE',
        },
        {
          stageKey: 'external-referral',
          label: 'External referral',
          displayOrder: 3,
          stepType: 'EXTERNAL_REFERRAL',
          authorityFunctionCode: 'TEMPLATE-AUTH-EXTERNAL-REFERRAL',
          authorityActionType: 'PREPARE',
          consequenceLevel: 'ADMINISTRATIVE',
        },
        {
          stageKey: 'external-determination',
          label: 'External determination',
          displayOrder: 4,
          stepType: 'DECISION_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-EXTERNAL-DETERMINATION',
          authorityActionType: 'REVIEW',
          consequenceLevel: 'CONSEQUENTIAL',
          isDecisionStage: true,
        },
        {
          stageKey: 'issuance',
          label: 'Issuance',
          displayOrder: 5,
          stepType: 'ISSUANCE_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
          authorityActionType: 'ISSUE',
          consequenceLevel: 'CONSEQUENTIAL',
          isIssuanceStage: true,
        },
      ],
      completenessReview: { enabled: true, requiredEvidenceCodes: ['TEMPLATE-EXTERNAL-CONSENT'] },
      slaRules: [
        {
          ruleCode: 'TEMPLATE-EXTERNAL-SLA',
          label: 'External determination SLA',
          targetDays: 45,
          clockStartsAtStageKey: 'external-referral',
          pauseConditions: ['AWAITING_EXTERNAL_RESPONSE'],
        },
      ],
      fees: [],
      outputs: [
        {
          outputCode: 'TEMPLATE-EXTERNAL-AUTH',
          label: 'Authorization letter',
          outputType: 'AUTHORIZATION',
          deliveryChannel: 'PORTAL',
        },
      ],
      communications: [
        {
          communicationCode: 'TEMPLATE-EXTERNAL-REFERRAL-SENT',
          triggerStageKey: 'external-referral',
          channel: 'EMAIL',
          templateCode: 'TEMPLATE-EXTERNAL-REFERRAL-NOTICE',
        },
      ],
      dependencies: [
        {
          dependencyCode: 'TEMPLATE-EXT-AUTH-INTEGRATION',
          dependencyType: 'EXTERNAL_AUTHORITY',
          description: 'External authority integration',
          externalIntegrationCode: 'TEMPLATE-EXT-AUTH-API',
        },
      ],
      decisionStages: [
        {
          stageKey: 'external-determination',
          decisionActorFunctionCode: 'TEMPLATE-AUTH-EXTERNAL-DETERMINATION',
          requiresSecondApproval: true,
        },
      ],
      issuance: {
        issuanceStageKey: 'issuance',
        issuanceFunctionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
        outputCodes: ['TEMPLATE-EXTERNAL-AUTH'],
      },
      lifecycle: { supportsRenewal: false, validityPeriodDays: 730 },
      redress: [
        {
          routeCode: 'TEMPLATE-EXTERNAL-REVIEW',
          label: 'External review',
          routeType: 'ADMINISTRATIVE_REVIEW',
          description: 'Template external review route',
        },
      ],
      dashboardIndicators: [
        {
          indicatorCode: 'TEMPLATE-EXTERNAL-PENDING',
          label: 'Awaiting external response',
          metricType: 'EXTERNAL_WAIT',
        },
      ],
    },
  ),
);

export const PROFESSIONAL_REVIEW_TEMPLATE: ServicePackManifest = pack(
  'template-professional-review',
  'Professional-Review Service Template',
  'Canonical template with reserved professional review gate.',
  'TEMPLATE-FAMILY-PROFESSIONAL',
  baseService(
    {
      serviceCode: 'TEMPLATE-PROFESSIONAL-REVIEW',
      serviceSlug: 'template-professional-review',
      serviceName: 'Template Professional Review Service',
      serviceFamilyCode: 'TEMPLATE-FAMILY-PROFESSIONAL',
      serviceType: 'CERTIFICATION',
      description: 'NON_PRODUCTION professional-review template.',
      applicantCategories: ['PROFESSIONAL'],
    },
    {
      authorityFunctions: [
        {
          functionCode: 'TEMPLATE-AUTH-PROFESSIONAL-REVIEW',
          publicStageLabel: 'Professional review',
          authorityActionType: 'REVIEW',
          sequenceOrder: 1,
          isConsequential: true,
        },
        {
          functionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
          publicStageLabel: 'Issue certification',
          authorityActionType: 'ISSUE',
          sequenceOrder: 2,
          isConsequential: true,
        },
      ],
      forms: [
        {
          formCode: 'TEMPLATE-PROF-FORM',
          formName: 'Professional certification',
          versionLabel: '1.0.0',
          sections: [
            {
              sectionKey: 'credentials',
              label: 'Credentials',
              fields: [
                {
                  fieldKey: 'professionalRegistrationNumber',
                  label: 'Registration number',
                  fieldType: 'IDENTIFIER',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
      evidenceRequirements: [
        {
          evidenceCode: 'TEMPLATE-PROF-CREDENTIAL',
          label: 'Professional credential',
          description: 'Template professional credential',
          required: true,
          verificationCategory: 'PROFESSIONAL',
        },
        {
          evidenceCode: 'TEMPLATE-CONTINUING-EDUCATION',
          label: 'Continuing education record',
          description: 'Template CPD evidence',
          required: true,
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
          stageKey: 'completeness',
          label: 'Completeness review',
          displayOrder: 2,
          stepType: 'COMPLETENESS_REVIEW',
          consequenceLevel: 'ADMINISTRATIVE',
        },
        {
          stageKey: 'professional-review',
          label: 'Professional review',
          displayOrder: 3,
          stepType: 'PROFESSIONAL_REVIEW',
          authorityFunctionCode: 'TEMPLATE-AUTH-PROFESSIONAL-REVIEW',
          authorityActionType: 'REVIEW',
          consequenceLevel: 'CONSEQUENTIAL',
          isDecisionStage: true,
        },
        {
          stageKey: 'issuance',
          label: 'Issuance',
          displayOrder: 4,
          stepType: 'ISSUANCE_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
          authorityActionType: 'ISSUE',
          consequenceLevel: 'CONSEQUENTIAL',
          isIssuanceStage: true,
        },
      ],
      completenessReview: {
        enabled: true,
        requiredEvidenceCodes: ['TEMPLATE-PROF-CREDENTIAL', 'TEMPLATE-CONTINUING-EDUCATION'],
      },
      slaRules: [
        {
          ruleCode: 'TEMPLATE-PROF-SLA',
          label: 'Professional review SLA',
          targetDays: 20,
          clockStartsAtStageKey: 'professional-review',
        },
      ],
      fees: [
        {
          feeCode: 'TEMPLATE-PROF-FEE',
          label: 'Certification fee',
          amount: 175,
          currencyCode: 'USD',
          waivable: false,
        },
      ],
      outputs: [
        {
          outputCode: 'TEMPLATE-PROF-CERT',
          label: 'Professional certificate',
          outputType: 'CERTIFICATION',
          deliveryChannel: 'PORTAL',
        },
      ],
      communications: [
        {
          communicationCode: 'TEMPLATE-PROF-REVIEW-ASSIGNED',
          triggerStageKey: 'professional-review',
          channel: 'EMAIL',
          templateCode: 'TEMPLATE-PROF-REVIEW-NOTICE',
        },
      ],
      dependencies: [
        {
          dependencyCode: 'TEMPLATE-PROF-REGISTRY',
          dependencyType: 'PROFESSIONAL_REGISTRY',
          description: 'Professional registry lookup',
        },
      ],
      decisionStages: [
        {
          stageKey: 'professional-review',
          decisionActorFunctionCode: 'TEMPLATE-AUTH-PROFESSIONAL-REVIEW',
          requiresSecondApproval: true,
        },
      ],
      issuance: {
        issuanceStageKey: 'issuance',
        issuanceFunctionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
        outputCodes: ['TEMPLATE-PROF-CERT'],
      },
      lifecycle: {
        supportsRenewal: true,
        renewalServiceCode: 'TEMPLATE-LICENSE-RENEWAL',
        validityPeriodDays: 365,
      },
      redress: [
        {
          routeCode: 'TEMPLATE-PROF-APPEAL',
          label: 'Professional appeal',
          routeType: 'APPEAL',
          description: 'Template professional appeal route',
        },
      ],
      dashboardIndicators: [
        {
          indicatorCode: 'TEMPLATE-PROF-BACKLOG',
          label: 'Professional review backlog',
          metricType: 'QUEUE_DEPTH',
        },
      ],
    },
  ),
);

export const MULTI_DEPARTMENT_TEMPLATE: ServicePackManifest = pack(
  'template-multi-department',
  'Multi-Department Workflow Service Template',
  'Canonical template coordinating multiple departments.',
  'TEMPLATE-FAMILY-MULTI-DEPT',
  baseService(
    {
      serviceCode: 'TEMPLATE-MULTI-DEPT',
      serviceSlug: 'template-multi-department',
      serviceName: 'Template Multi-Department Service',
      serviceFamilyCode: 'TEMPLATE-FAMILY-MULTI-DEPT',
      serviceType: 'APPLICATION',
      description: 'NON_PRODUCTION multi-department template.',
      applicantCategories: ['BUSINESS', 'GOVERNMENT_ENTITY'],
    },
    {
      authorityFunctions: [
        {
          functionCode: 'TEMPLATE-AUTH-MULTI-DEPT-COORD',
          publicStageLabel: 'Coordinate departments',
          authorityActionType: 'PREPARE',
          sequenceOrder: 1,
          isConsequential: false,
        },
        {
          functionCode: 'TEMPLATE-AUTH-MULTI-DEPT-DECIDE',
          publicStageLabel: 'Joint decision',
          authorityActionType: 'DECIDE',
          sequenceOrder: 2,
          isConsequential: true,
        },
        {
          functionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
          publicStageLabel: 'Issue authorization',
          authorityActionType: 'ISSUE',
          sequenceOrder: 3,
          isConsequential: true,
        },
      ],
      forms: [
        {
          formCode: 'TEMPLATE-MULTI-DEPT-FORM',
          formName: 'Multi-department application',
          versionLabel: '1.0.0',
          sections: [
            {
              sectionKey: 'coordination',
              label: 'Coordination details',
              fields: [
                {
                  fieldKey: 'involvedDepartments',
                  label: 'Involved departments',
                  fieldType: 'MULTISELECT',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
      evidenceRequirements: [
        {
          evidenceCode: 'TEMPLATE-DEPT-A-INPUT',
          label: 'Department A input',
          description: 'Template department A evidence',
          required: true,
          verificationCategory: 'CONTENT_FACT',
        },
        {
          evidenceCode: 'TEMPLATE-DEPT-B-INPUT',
          label: 'Department B input',
          description: 'Template department B evidence',
          required: true,
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
          stageKey: 'completeness',
          label: 'Completeness review',
          displayOrder: 2,
          stepType: 'COMPLETENESS_REVIEW',
          consequenceLevel: 'ADMINISTRATIVE',
        },
        {
          stageKey: 'coordination',
          label: 'Internal coordination',
          displayOrder: 3,
          stepType: 'INTERNAL_COORDINATION',
          authorityFunctionCode: 'TEMPLATE-AUTH-MULTI-DEPT-COORD',
          authorityActionType: 'PREPARE',
          consequenceLevel: 'ADMINISTRATIVE',
        },
        {
          stageKey: 'parallel-join',
          label: 'Parallel join',
          displayOrder: 4,
          stepType: 'PARALLEL_JOIN',
          consequenceLevel: 'ADMINISTRATIVE',
        },
        {
          stageKey: 'decision',
          label: 'Joint decision',
          displayOrder: 5,
          stepType: 'DECISION_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-MULTI-DEPT-DECIDE',
          authorityActionType: 'DECIDE',
          consequenceLevel: 'CONSEQUENTIAL',
          isDecisionStage: true,
        },
        {
          stageKey: 'issuance',
          label: 'Issuance',
          displayOrder: 6,
          stepType: 'ISSUANCE_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
          authorityActionType: 'ISSUE',
          consequenceLevel: 'CONSEQUENTIAL',
          isIssuanceStage: true,
        },
      ],
      completenessReview: {
        enabled: true,
        requiredEvidenceCodes: ['TEMPLATE-DEPT-A-INPUT', 'TEMPLATE-DEPT-B-INPUT'],
      },
      slaRules: [
        {
          ruleCode: 'TEMPLATE-MULTI-DEPT-SLA',
          label: 'Multi-department SLA',
          targetDays: 35,
          clockStartsAtStageKey: 'coordination',
        },
      ],
      fees: [
        {
          feeCode: 'TEMPLATE-MULTI-DEPT-FEE',
          label: 'Coordination fee',
          amount: 300,
          currencyCode: 'USD',
          waivable: false,
        },
      ],
      outputs: [
        {
          outputCode: 'TEMPLATE-MULTI-DEPT-AUTH',
          label: 'Joint authorization',
          outputType: 'AUTHORIZATION',
          deliveryChannel: 'PORTAL',
        },
      ],
      communications: [
        {
          communicationCode: 'TEMPLATE-MULTI-DEPT-STATUS',
          triggerStageKey: 'coordination',
          channel: 'EMAIL',
          templateCode: 'TEMPLATE-COORDINATION-STATUS',
        },
      ],
      dependencies: [
        {
          dependencyCode: 'TEMPLATE-DEPT-A',
          dependencyType: 'INTERNAL_DEPARTMENT',
          description: 'Department A coordination',
        },
        {
          dependencyCode: 'TEMPLATE-DEPT-B',
          dependencyType: 'INTERNAL_DEPARTMENT',
          description: 'Department B coordination',
        },
      ],
      decisionStages: [
        {
          stageKey: 'decision',
          decisionActorFunctionCode: 'TEMPLATE-AUTH-MULTI-DEPT-DECIDE',
          requiresSecondApproval: true,
        },
      ],
      issuance: {
        issuanceStageKey: 'issuance',
        issuanceFunctionCode: 'TEMPLATE-AUTH-LICENSE-ISSUANCE',
        outputCodes: ['TEMPLATE-MULTI-DEPT-AUTH'],
      },
      lifecycle: { supportsRenewal: false, validityPeriodDays: 365 },
      redress: [
        {
          routeCode: 'TEMPLATE-MULTI-DEPT-REVIEW',
          label: 'Multi-department review',
          routeType: 'ADMINISTRATIVE_REVIEW',
          description: 'Template multi-department review route',
        },
      ],
      dashboardIndicators: [
        {
          indicatorCode: 'TEMPLATE-MULTI-DEPT-WAIT',
          label: 'Awaiting department input',
          metricType: 'COORDINATION_WAIT',
        },
      ],
    },
  ),
);

export const BENEFIT_ENTITLEMENT_TEMPLATE: ServicePackManifest = pack(
  'template-benefit-entitlement',
  'Benefit / Entitlement Application Template',
  'Canonical template for benefit and entitlement determination services.',
  'TEMPLATE-FAMILY-BENEFIT',
  baseService(
    {
      serviceCode: 'TEMPLATE-BENEFIT-ENTITLEMENT',
      serviceSlug: 'template-benefit-entitlement',
      serviceName: 'Template Benefit / Entitlement Application',
      serviceFamilyCode: 'TEMPLATE-FAMILY-BENEFIT',
      serviceType: 'APPLICATION',
      description: 'NON_PRODUCTION benefit/entitlement template.',
      applicantCategories: ['INDIVIDUAL', 'CITIZEN', 'RESIDENT'],
    },
    {
      authorityFunctions: [
        {
          functionCode: 'TEMPLATE-AUTH-BENEFIT-INTAKE',
          publicStageLabel: 'Benefit intake',
          authorityActionType: 'PREPARE',
          sequenceOrder: 1,
          isConsequential: false,
        },
        {
          functionCode: 'TEMPLATE-AUTH-BENEFIT-DETERMINE',
          publicStageLabel: 'Entitlement determination',
          authorityActionType: 'DECIDE',
          sequenceOrder: 2,
          isConsequential: true,
        },
      ],
      forms: [
        {
          formCode: 'TEMPLATE-BENEFIT-FORM',
          formName: 'Benefit application',
          versionLabel: '1.0.0',
          sections: [
            {
              sectionKey: 'eligibility',
              label: 'Eligibility',
              fields: [
                {
                  fieldKey: 'householdSize',
                  label: 'Household size',
                  fieldType: 'INTEGER',
                  required: true,
                },
                {
                  fieldKey: 'incomeBand',
                  label: 'Income band',
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
          evidenceCode: 'TEMPLATE-INCOME-PROOF',
          label: 'Income proof',
          description: 'Template income evidence',
          required: true,
          verificationCategory: 'CONTENT_FACT',
          retentionPolicyCode: 'TEMPLATE-RETENTION-7Y',
        },
        {
          evidenceCode: 'TEMPLATE-RESIDENCY-PROOF',
          label: 'Residency proof',
          description: 'Template residency evidence',
          required: true,
          verificationCategory: 'ISSUER',
        },
      ],
      workflowStages: [
        {
          stageKey: 'intake',
          label: 'Intake',
          displayOrder: 1,
          stepType: 'INTAKE',
          authorityFunctionCode: 'TEMPLATE-AUTH-BENEFIT-INTAKE',
          authorityActionType: 'PREPARE',
          consequenceLevel: 'INFORMATIONAL',
        },
        {
          stageKey: 'completeness',
          label: 'Completeness review',
          displayOrder: 2,
          stepType: 'COMPLETENESS_REVIEW',
          consequenceLevel: 'ADMINISTRATIVE',
        },
        {
          stageKey: 'substantive',
          label: 'Eligibility review',
          displayOrder: 3,
          stepType: 'SUBSTANTIVE_REVIEW',
          authorityFunctionCode: 'TEMPLATE-AUTH-BENEFIT-DETERMINE',
          authorityActionType: 'REVIEW',
          consequenceLevel: 'CONSEQUENTIAL',
        },
        {
          stageKey: 'decision',
          label: 'Entitlement decision',
          displayOrder: 4,
          stepType: 'DECISION_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-BENEFIT-DETERMINE',
          authorityActionType: 'DECIDE',
          consequenceLevel: 'CONSEQUENTIAL',
          isDecisionStage: true,
        },
        {
          stageKey: 'issuance',
          label: 'Issue entitlement notice',
          displayOrder: 5,
          stepType: 'ISSUANCE_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-BENEFIT-DETERMINE',
          authorityActionType: 'ISSUE',
          consequenceLevel: 'CONSEQUENTIAL',
          isIssuanceStage: true,
        },
      ],
      completenessReview: {
        enabled: true,
        requiredEvidenceCodes: ['TEMPLATE-INCOME-PROOF', 'TEMPLATE-RESIDENCY-PROOF'],
      },
      slaRules: [
        {
          ruleCode: 'TEMPLATE-BENEFIT-SLA',
          label: 'Benefit determination SLA',
          targetDays: 28,
          clockStartsAtStageKey: 'intake',
        },
      ],
      fees: [],
      outputs: [
        {
          outputCode: 'TEMPLATE-BENEFIT-NOTICE',
          label: 'Entitlement notice',
          outputType: 'DECISION_NOTICE',
          deliveryChannel: 'PORTAL',
        },
      ],
      communications: [
        {
          communicationCode: 'TEMPLATE-BENEFIT-DECISION',
          triggerStageKey: 'decision',
          channel: 'EMAIL',
          templateCode: 'TEMPLATE-BENEFIT-DECISION-NOTICE',
        },
      ],
      dependencies: [
        {
          dependencyCode: 'TEMPLATE-ELIGIBILITY-ENGINE',
          dependencyType: 'ELIGIBILITY_RULES',
          description: 'Configured eligibility rule set',
        },
      ],
      decisionStages: [
        {
          stageKey: 'decision',
          decisionActorFunctionCode: 'TEMPLATE-AUTH-BENEFIT-DETERMINE',
          requiresSecondApproval: true,
        },
      ],
      issuance: {
        issuanceStageKey: 'issuance',
        issuanceFunctionCode: 'TEMPLATE-AUTH-BENEFIT-DETERMINE',
        outputCodes: ['TEMPLATE-BENEFIT-NOTICE'],
      },
      lifecycle: {
        supportsRenewal: true,
        renewalServiceCode: 'TEMPLATE-LICENSE-RENEWAL',
        validityPeriodDays: 365,
      },
      redress: [
        {
          routeCode: 'TEMPLATE-BENEFIT-APPEAL',
          label: 'Benefit appeal',
          routeType: 'APPEAL',
          description: 'Template benefit appeal route',
        },
        {
          routeCode: 'TEMPLATE-BENEFIT-COMPLAINT',
          label: 'Benefit complaint',
          routeType: 'COMPLAINT',
          description: 'Template benefit complaint route',
        },
      ],
      dashboardIndicators: [
        {
          indicatorCode: 'TEMPLATE-BENEFIT-PENDING',
          label: 'Pending determinations',
          metricType: 'QUEUE_DEPTH',
        },
        {
          indicatorCode: 'TEMPLATE-BENEFIT-SLA-RISK',
          label: 'SLA at-risk benefits',
          metricType: 'SLA_BREACH_RISK',
          threshold: 10,
        },
      ],
    },
  ),
);

export const BUSINESS_INVESTOR_TEMPLATE: ServicePackManifest = pack(
  'template-business-investor',
  'Business / Investor Service Template',
  'Canonical template for business and investor-facing services.',
  'TEMPLATE-FAMILY-INVESTOR',
  baseService(
    {
      serviceCode: 'TEMPLATE-BUSINESS-INVESTOR',
      serviceSlug: 'template-business-investor',
      serviceName: 'Template Business / Investor Service',
      serviceFamilyCode: 'TEMPLATE-FAMILY-INVESTOR',
      serviceType: 'APPLICATION',
      description: 'NON_PRODUCTION business/investor template.',
      applicantCategories: ['BUSINESS', 'INVESTOR', 'COMPANY'],
    },
    {
      authorityFunctions: [
        {
          functionCode: 'TEMPLATE-AUTH-INVESTOR-APPROVAL',
          publicStageLabel: 'Investor approval',
          authorityActionType: 'APPROVE',
          sequenceOrder: 1,
          isConsequential: true,
        },
        {
          functionCode: 'TEMPLATE-AUTH-INVESTOR-ISSUANCE',
          publicStageLabel: 'Issue investor authorization',
          authorityActionType: 'ISSUE',
          sequenceOrder: 2,
          isConsequential: true,
        },
      ],
      forms: [
        {
          formCode: 'TEMPLATE-INVESTOR-FORM',
          formName: 'Investor application',
          versionLabel: '1.0.0',
          sections: [
            {
              sectionKey: 'investment',
              label: 'Investment details',
              fields: [
                {
                  fieldKey: 'investmentAmount',
                  label: 'Investment amount',
                  fieldType: 'CURRENCY',
                  required: true,
                },
                { fieldKey: 'sector', label: 'Sector', fieldType: 'SELECT', required: true },
              ],
            },
          ],
        },
      ],
      evidenceRequirements: [
        {
          evidenceCode: 'TEMPLATE-BUSINESS-PLAN',
          label: 'Business plan',
          description: 'Template business plan evidence',
          required: true,
          verificationCategory: 'CONTENT_FACT',
        },
        {
          evidenceCode: 'TEMPLATE-SOURCE-OF-FUNDS',
          label: 'Source of funds',
          description: 'Template source-of-funds evidence',
          required: true,
          verificationCategory: 'ISSUER',
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
          stageKey: 'completeness',
          label: 'Completeness review',
          displayOrder: 2,
          stepType: 'COMPLETENESS_REVIEW',
          consequenceLevel: 'ADMINISTRATIVE',
        },
        {
          stageKey: 'substantive',
          label: 'Investment review',
          displayOrder: 3,
          stepType: 'SUBSTANTIVE_REVIEW',
          authorityFunctionCode: 'TEMPLATE-AUTH-INVESTOR-APPROVAL',
          authorityActionType: 'REVIEW',
          consequenceLevel: 'CONSEQUENTIAL',
        },
        {
          stageKey: 'decision',
          label: 'Approval decision',
          displayOrder: 4,
          stepType: 'DECISION_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-INVESTOR-APPROVAL',
          authorityActionType: 'APPROVE',
          consequenceLevel: 'CONSEQUENTIAL',
          isDecisionStage: true,
        },
        {
          stageKey: 'issuance',
          label: 'Issuance',
          displayOrder: 5,
          stepType: 'ISSUANCE_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-INVESTOR-ISSUANCE',
          authorityActionType: 'ISSUE',
          consequenceLevel: 'CONSEQUENTIAL',
          isIssuanceStage: true,
        },
      ],
      completenessReview: {
        enabled: true,
        requiredEvidenceCodes: ['TEMPLATE-BUSINESS-PLAN', 'TEMPLATE-SOURCE-OF-FUNDS'],
      },
      slaRules: [
        {
          ruleCode: 'TEMPLATE-INVESTOR-SLA',
          label: 'Investor approval SLA',
          targetDays: 40,
          clockStartsAtStageKey: 'intake',
        },
      ],
      fees: [
        {
          feeCode: 'TEMPLATE-INVESTOR-FEE',
          label: 'Application fee',
          amount: 500,
          currencyCode: 'USD',
          waivable: true,
        },
      ],
      outputs: [
        {
          outputCode: 'TEMPLATE-INVESTOR-AUTH',
          label: 'Investor authorization',
          outputType: 'AUTHORIZATION',
          deliveryChannel: 'PORTAL',
        },
      ],
      communications: [
        {
          communicationCode: 'TEMPLATE-INVESTOR-STATUS',
          triggerStageKey: 'substantive',
          channel: 'EMAIL',
          templateCode: 'TEMPLATE-INVESTOR-STATUS-NOTICE',
        },
      ],
      dependencies: [
        {
          dependencyCode: 'TEMPLATE-INVESTOR-REGISTRY',
          dependencyType: 'REGISTRY_LOOKUP',
          description: 'Investor registry lookup',
          externalIntegrationCode: 'TEMPLATE-INVESTOR-REGISTRY-API',
        },
      ],
      decisionStages: [
        {
          stageKey: 'decision',
          decisionActorFunctionCode: 'TEMPLATE-AUTH-INVESTOR-APPROVAL',
          requiresSecondApproval: true,
        },
      ],
      issuance: {
        issuanceStageKey: 'issuance',
        issuanceFunctionCode: 'TEMPLATE-AUTH-INVESTOR-ISSUANCE',
        outputCodes: ['TEMPLATE-INVESTOR-AUTH'],
      },
      lifecycle: {
        supportsRenewal: true,
        renewalServiceCode: 'TEMPLATE-LICENSE-RENEWAL',
        validityPeriodDays: 1095,
      },
      redress: [
        {
          routeCode: 'TEMPLATE-INVESTOR-APPEAL',
          label: 'Investor appeal',
          routeType: 'APPEAL',
          description: 'Template investor appeal route',
        },
      ],
      dashboardIndicators: [
        {
          indicatorCode: 'TEMPLATE-INVESTOR-PIPELINE',
          label: 'Investor pipeline value',
          metricType: 'AGGREGATE_VALUE',
        },
      ],
    },
  ),
);

export const HIGH_SENSITIVITY_TEMPLATE: ServicePackManifest = pack(
  'template-high-sensitivity',
  'High-Sensitivity Service Template',
  'Canonical template for high-sensitivity services with enhanced review gates.',
  'TEMPLATE-FAMILY-HIGH-SENSITIVITY',
  baseService(
    {
      serviceCode: 'TEMPLATE-HIGH-SENSITIVITY',
      serviceSlug: 'template-high-sensitivity',
      serviceName: 'Template High-Sensitivity Service',
      serviceFamilyCode: 'TEMPLATE-FAMILY-HIGH-SENSITIVITY',
      serviceType: 'APPLICATION',
      description: 'NON_PRODUCTION high-sensitivity template.',
      applicantCategories: ['GOVERNMENT_ENTITY', 'AUTHORIZED_REPRESENTATIVE'],
    },
    {
      authorityFunctions: [
        {
          functionCode: 'TEMPLATE-AUTH-HIGH-SENSITIVITY-REVIEW',
          publicStageLabel: 'Sensitivity review',
          authorityActionType: 'REVIEW',
          sequenceOrder: 1,
          isConsequential: false,
        },
        {
          functionCode: 'TEMPLATE-AUTH-HIGH-SENSITIVITY-APPROVE',
          publicStageLabel: 'Sensitivity approval',
          authorityActionType: 'APPROVE',
          sequenceOrder: 2,
          isConsequential: true,
        },
        {
          functionCode: 'TEMPLATE-AUTH-HIGH-SENSITIVITY-ISSUE',
          publicStageLabel: 'Controlled issuance',
          authorityActionType: 'ISSUE',
          sequenceOrder: 3,
          isConsequential: true,
        },
      ],
      forms: [
        {
          formCode: 'TEMPLATE-HIGH-SENS-FORM',
          formName: 'High-sensitivity application',
          versionLabel: '1.0.0',
          sections: [
            {
              sectionKey: 'classified',
              label: 'Classified details',
              fields: [
                {
                  fieldKey: 'securityClearanceLevel',
                  label: 'Clearance level',
                  fieldType: 'SELECT',
                  required: true,
                  dataClassification: 'RESTRICTED',
                },
                {
                  fieldKey: 'needToKnowJustification',
                  label: 'Need-to-know justification',
                  fieldType: 'TEXTAREA',
                  required: true,
                  dataClassification: 'HIGHLY_RESTRICTED',
                },
              ],
            },
          ],
        },
      ],
      evidenceRequirements: [
        {
          evidenceCode: 'TEMPLATE-SECURITY-CLEARANCE',
          label: 'Security clearance',
          description: 'Template security clearance evidence',
          required: true,
          verificationCategory: 'PROFESSIONAL',
          retentionPolicyCode: 'TEMPLATE-RETENTION-10Y',
        },
        {
          evidenceCode: 'TEMPLATE-AUTHORIZED-REQUEST',
          label: 'Authorized request letter',
          description: 'Template authorized request evidence',
          required: true,
          verificationCategory: 'SIGNATURE',
          retentionPolicyCode: 'TEMPLATE-RETENTION-10Y',
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
          stageKey: 'completeness',
          label: 'Completeness review',
          displayOrder: 2,
          stepType: 'COMPLETENESS_REVIEW',
          authorityFunctionCode: 'TEMPLATE-AUTH-HIGH-SENSITIVITY-REVIEW',
          authorityActionType: 'REVIEW',
          consequenceLevel: 'ADMINISTRATIVE',
        },
        {
          stageKey: 'sensitivity-review',
          label: 'Sensitivity review',
          displayOrder: 3,
          stepType: 'SUBSTANTIVE_REVIEW',
          authorityFunctionCode: 'TEMPLATE-AUTH-HIGH-SENSITIVITY-REVIEW',
          authorityActionType: 'REVIEW',
          consequenceLevel: 'CONSEQUENTIAL',
        },
        {
          stageKey: 'decision',
          label: 'Approval decision',
          displayOrder: 4,
          stepType: 'DECISION_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-HIGH-SENSITIVITY-APPROVE',
          authorityActionType: 'APPROVE',
          consequenceLevel: 'CONSEQUENTIAL',
          isDecisionStage: true,
        },
        {
          stageKey: 'issuance',
          label: 'Controlled issuance',
          displayOrder: 5,
          stepType: 'ISSUANCE_GATE',
          authorityFunctionCode: 'TEMPLATE-AUTH-HIGH-SENSITIVITY-ISSUE',
          authorityActionType: 'ISSUE',
          consequenceLevel: 'CONSEQUENTIAL',
          isIssuanceStage: true,
        },
      ],
      completenessReview: {
        enabled: true,
        deficiencyNoticeTemplateCode: 'TEMPLATE-HIGH-SENS-DEFICIENCY',
        requiredEvidenceCodes: ['TEMPLATE-SECURITY-CLEARANCE', 'TEMPLATE-AUTHORIZED-REQUEST'],
      },
      slaRules: [
        {
          ruleCode: 'TEMPLATE-HIGH-SENS-SLA',
          label: 'High-sensitivity SLA',
          targetDays: 14,
          clockStartsAtStageKey: 'intake',
        },
      ],
      fees: [],
      outputs: [
        {
          outputCode: 'TEMPLATE-HIGH-SENS-AUTH',
          label: 'Controlled authorization',
          outputType: 'AUTHORIZATION',
          deliveryChannel: 'SECURE_PORTAL',
        },
      ],
      communications: [
        {
          communicationCode: 'TEMPLATE-HIGH-SENS-NOTICE',
          triggerStageKey: 'decision',
          channel: 'SECURE_MESSAGE',
          templateCode: 'TEMPLATE-HIGH-SENS-DECISION-NOTICE',
        },
      ],
      dependencies: [
        {
          dependencyCode: 'TEMPLATE-SECURITY-CLEARANCE-VERIFY',
          dependencyType: 'SECURITY_VERIFICATION',
          description: 'Security clearance verification',
          externalIntegrationCode: 'TEMPLATE-SECURITY-API',
        },
      ],
      decisionStages: [
        {
          stageKey: 'decision',
          decisionActorFunctionCode: 'TEMPLATE-AUTH-HIGH-SENSITIVITY-APPROVE',
          requiresSecondApproval: true,
        },
      ],
      issuance: {
        issuanceStageKey: 'issuance',
        issuanceFunctionCode: 'TEMPLATE-AUTH-HIGH-SENSITIVITY-ISSUE',
        outputCodes: ['TEMPLATE-HIGH-SENS-AUTH'],
      },
      lifecycle: {
        supportsRenewal: true,
        renewalServiceCode: 'TEMPLATE-LICENSE-RENEWAL',
        validityPeriodDays: 180,
        supersessionPolicyCode: 'TEMPLATE-HIGH-SENS-SUPERSEDE',
      },
      redress: [
        {
          routeCode: 'TEMPLATE-HIGH-SENS-REVIEW',
          label: 'Restricted review route',
          routeType: 'ADMINISTRATIVE_REVIEW',
          description: 'Template high-sensitivity review route',
        },
      ],
      dashboardIndicators: [
        {
          indicatorCode: 'TEMPLATE-HIGH-SENS-PENDING',
          label: 'Pending high-sensitivity cases',
          metricType: 'QUEUE_DEPTH',
        },
        {
          indicatorCode: 'TEMPLATE-HIGH-SENS-ESCALATIONS',
          label: 'Escalated sensitivity reviews',
          metricType: 'ESCALATION_COUNT',
          threshold: 3,
        },
      ],
    },
  ),
);

export const CANONICAL_SERVICE_PACK_TEMPLATES: ServicePackManifest[] = [
  SIMPLE_REGISTRATION_TEMPLATE,
  LICENSE_PERMIT_TEMPLATE,
  RENEWAL_TEMPLATE,
  INSPECTION_DEPENDENT_TEMPLATE,
  EXTERNAL_AUTHORITY_TEMPLATE,
  PROFESSIONAL_REVIEW_TEMPLATE,
  MULTI_DEPARTMENT_TEMPLATE,
  BENEFIT_ENTITLEMENT_TEMPLATE,
  BUSINESS_INVESTOR_TEMPLATE,
  HIGH_SENSITIVITY_TEMPLATE,
];

export const CANONICAL_TEMPLATE_FILE_NAMES = [
  '01-simple-registration-service.pack.json',
  '02-license-permit-service.pack.json',
  '03-renewal-service.pack.json',
  '04-inspection-dependent-service.pack.json',
  '05-external-authority-dependent-service.pack.json',
  '06-professional-review-service.pack.json',
  '07-multi-department-workflow-service.pack.json',
  '08-benefit-entitlement-application.pack.json',
  '09-business-investor-service.pack.json',
  '10-high-sensitivity-service.pack.json',
] as const;
