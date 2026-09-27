import {
  FINANCIAL_SERVICES_AUTHORITY,
  FINANCIAL_SERVICES_DEPARTMENT_CODE,
  FINANCIAL_SERVICES_SERVICE_FAMILY_CODE,
  FINANCIAL_SERVICES_SERVICE_PACK_ID,
  FINANCIAL_TEMPLATE_SERVICE_DEFINITIONS,
} from '../../financial-services/financial-services.constants';
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

function financialTemplateService(
  key: string,
  name: string,
  serviceType: string,
  applicantCategories: string[],
  options?: { requiresExternal?: boolean; requiresDelegatedIssue?: boolean },
): ServicePackServiceDefinition {
  const serviceCode = `TEMPLATE-FS-${key}`;
  const issuanceFunction = options?.requiresDelegatedIssue
    ? FINANCIAL_SERVICES_AUTHORITY.delegatedIssue
    : FINANCIAL_SERVICES_AUTHORITY.issue;

  const workflowStages: ServicePackServiceDefinition['workflowStages'] = [
    {
      stageKey: 'intake',
      label: 'Financial services intake',
      displayOrder: 1,
      stepType: 'INTAKE',
      authorityFunctionCode: FINANCIAL_SERVICES_AUTHORITY.intake,
      authorityActionType: 'PREPARE',
      consequenceLevel: 'INFORMATIONAL',
    },
    {
      stageKey: 'completeness',
      label: 'Completeness review',
      displayOrder: 2,
      stepType: 'COMPLETENESS_REVIEW',
      authorityFunctionCode: FINANCIAL_SERVICES_AUTHORITY.intake,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'ADMINISTRATIVE',
    },
    {
      stageKey: 'due-diligence',
      label: 'Due diligence evidence review',
      displayOrder: 3,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: FINANCIAL_SERVICES_AUTHORITY.review,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    },
    {
      stageKey: 'substantive-review',
      label: 'Substantive regulatory review',
      displayOrder: 4,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: FINANCIAL_SERVICES_AUTHORITY.review,
      authorityActionType: 'REVIEW',
      consequenceLevel: 'CONSEQUENTIAL',
    },
  ];

  let displayOrder = 5;
  if (options?.requiresExternal) {
    workflowStages.push({
      stageKey: 'external-determination',
      label: 'Awaiting external / national regulator determination',
      displayOrder,
      stepType: 'EXTERNAL_REFERRAL',
      authorityFunctionCode: FINANCIAL_SERVICES_AUTHORITY.externalCoord,
      authorityActionType: 'VERIFY',
      consequenceLevel: 'CONSEQUENTIAL',
    });
    displayOrder += 1;
  }

  workflowStages.push({
    stageKey: 'decision',
    label: 'Human regulatory decision',
    displayOrder,
    stepType: 'DECISION_GATE',
    authorityFunctionCode: FINANCIAL_SERVICES_AUTHORITY.decide,
    authorityActionType: 'DECIDE',
    consequenceLevel: 'CONSEQUENTIAL',
    isDecisionStage: true,
  });

  return {
    serviceCode,
    serviceSlug: key.toLowerCase(),
    serviceName: name,
    serviceFamilyCode: FINANCIAL_SERVICES_SERVICE_FAMILY_CODE,
    serviceType,
    description: `${name} — NON_PRODUCTION financial services template; activity categories are configurable.`,
    applicantCategories,
    authorityFunctions: [
      {
        functionCode: FINANCIAL_SERVICES_AUTHORITY.intake,
        publicStageLabel: 'Intake',
        authorityActionType: 'PREPARE',
        sequenceOrder: 1,
        isConsequential: false,
      },
      {
        functionCode: FINANCIAL_SERVICES_AUTHORITY.decide,
        publicStageLabel: 'Regulatory decision',
        authorityActionType: 'DECIDE',
        sequenceOrder: 2,
        isConsequential: true,
      },
      {
        functionCode: issuanceFunction,
        publicStageLabel: 'Licence issuance (when delegated authority active)',
        authorityActionType: 'ISSUE',
        sequenceOrder: 3,
        isConsequential: true,
      },
    ],
    forms: [
      {
        formCode: `${serviceCode}-FORM`,
        formName: `${name} form`,
        versionLabel: '1.0.0-NON_PRODUCTION',
        sections: [
          {
            sectionKey: 'activity-category',
            label: 'Configurable activity category',
            fields: [
              {
                fieldKey: 'activityCategoryCode',
                label: 'Activity category code',
                fieldType: 'TEXT',
                required: true,
              },
            ],
          },
        ],
      },
    ],
    evidenceRequirements: [
      {
        evidenceCode: `${serviceCode}-DUE-DILIGENCE`,
        label: 'Due diligence evidence',
        description: 'NON_PRODUCTION due diligence evidence requirement',
        required: true,
        verificationCategory: 'CONTENT_FACT',
      },
    ],
    workflowStages,
    completenessReview: {
      enabled: true,
      requiredEvidenceCodes: [`${serviceCode}-DUE-DILIGENCE`],
    },
    slaRules: [
      {
        ruleCode: `${serviceCode}-SLA`,
        label: 'Placeholder SLA',
        targetDays: 45,
        clockStartsAtStageKey: 'intake',
      },
    ],
    fees: [],
    outputs: [
      {
        outputCode: `${serviceCode}-LICENCE-INSTRUMENT`,
        label: 'Licence instrument output',
        outputType: 'INSTRUMENT',
        deliveryChannel: 'PORTAL',
      },
    ],
    communications: [],
    dependencies: [
      {
        dependencyCode: `${serviceCode}-CORPORATE-REGISTRY`,
        dependencyType: 'REGISTRY_LOOKUP',
        description: 'Canonical organization / corporate registry lookup (no duplication)',
        externalIntegrationCode: 'TEMPLATE-CORP-REG-API',
      },
      ...(options?.requiresExternal
        ? [
            {
              dependencyCode: `${serviceCode}-NATIONAL-REGULATOR`,
              dependencyType: 'EXTERNAL_AUTHORITY',
              description: 'Retained national licensing determination — ABSEZ cannot substitute',
              externalIntegrationCode: 'TEMPLATE-NATIONAL-FIN-REG-API',
            },
          ]
        : []),
    ],
    decisionStages: [
      {
        stageKey: 'decision',
        decisionActorFunctionCode: FINANCIAL_SERVICES_AUTHORITY.decide,
        requiresSecondApproval: serviceType === 'APPLICATION' || serviceType === 'RENEWAL',
      },
    ],
    issuance: {
      issuanceStageKey: 'decision',
      issuanceFunctionCode: issuanceFunction,
      outputCodes: [`${serviceCode}-LICENCE-INSTRUMENT`],
    },
    lifecycle: {
      supportsRenewal: serviceType === 'RENEWAL' || serviceType === 'APPLICATION',
    },
    redress: [],
    dashboardIndicators: [
      {
        indicatorCode: `${serviceCode}-AWAITING-EXT`,
        label: 'Awaiting external determination',
        metricType: 'COUNT',
      },
    ],
  };
}

export const FINANCIAL_SERVICES_SERVICES: ServicePackServiceDefinition[] =
  FINANCIAL_TEMPLATE_SERVICE_DEFINITIONS.map((definition) =>
    financialTemplateService(
      definition.key,
      definition.name,
      definition.serviceType,
      ['BUSINESS', 'COMPANY', 'INDIVIDUAL'],
      {
        requiresExternal: Boolean(definition.requiresExternal),
        requiresDelegatedIssue: definition.serviceType === 'APPLICATION' || definition.serviceType === 'RENEWAL',
      },
    ),
  );

export const FINANCIAL_SERVICES_SERVICE_PACK_TEMPLATE: ServicePackManifest = {
  schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
  packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
  packId: FINANCIAL_SERVICES_SERVICE_PACK_ID,
  packVersion: '1.0.0',
  packName: 'Financial Services Administration Service Pack',
  description:
    'NON_PRODUCTION / TEMPLATE ONLY — Financial services regulated entity profiles, licence applications, delegated ABSEZ functions (inactive without instrument), external national determinations, compliance, inspections, and structured operational metrics.',
  institutionCode: 'TEMPLATE-INSTITUTION',
  departmentCode: FINANCIAL_SERVICES_DEPARTMENT_CODE,
  deploymentIntent: DEPLOYMENT_INTENT,
  services: FINANCIAL_SERVICES_SERVICES,
};
