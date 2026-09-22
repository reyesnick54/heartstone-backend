import {
  SERVICE_PACK_NON_PRODUCTION_LABEL,
  SERVICE_PACK_SCHEMA_VERSION,
} from '../../service-catalog/service-packs/service-pack.constants';
import {
  type ServicePackManifest,
  type ServicePackServiceDefinition,
} from '../../service-catalog/service-packs/service-pack.types';
import {
  IMMIGRATION_DEPARTMENT_CODE,
  IMMIGRATION_INSTITUTION_CODE,
  IMMIGRATION_SERVICE_CODE_PREFIX,
  IMMIGRATION_SERVICE_FAMILY_CODE,
  IMMIGRATION_SERVICE_PACK_ID,
  IMMIGRATION_TEMPLATE_SERVICE_DEFINITIONS,
} from '../immigration.constants';

const DEPLOYMENT_INTENT = {
  targetMaturityStatus: 'DRAFT' as const,
  targetPublicAvailability: 'UNDER_DEVELOPMENT' as const,
  requiresInstitutionalAcceptance: true as const,
  requiresOperationalActivation: true as const,
};

interface ImmigrationServiceTemplateInput {
  key: string;
  name: string;
  serviceType: string;
}

function slugFromKey(key: string): string {
  return key.toLowerCase().replace(/_/g, '-');
}

function buildImmigrationService(
  input: ImmigrationServiceTemplateInput,
): ServicePackServiceDefinition {
  const serviceCode = `${IMMIGRATION_SERVICE_CODE_PREFIX}${input.key}`;
  const slug = slugFromKey(input.key);
  const formCode = `${serviceCode}-FORM`;
  const isRenewal = input.serviceType === 'RENEWAL';
  const isRedress = input.serviceType === 'REDRESS';
  const isScheduling = input.serviceType === 'SCHEDULING';
  const requiresSponsor = ['DEPENDENT-RESIDENCY', 'WORK-LINKED-RESIDENCY', 'VISITOR-VISA'].includes(
    input.key,
  );
  const requiresBiometric = !isRedress && !isScheduling;
  const requiresInterview = [
    'CITIZENSHIP-APPLICATION',
    'LONG-TERM-RESIDENCY',
    'BIOMETRIC-INTERVIEW',
  ].includes(input.key);

  const evidenceRequirements = [
    {
      evidenceCode: `${serviceCode}-PASSPORT`,
      label: 'Passport or travel document',
      description: 'NON_PRODUCTION placeholder passport/travel document evidence',
      required: true,
      verificationCategory: 'INTEGRITY',
    },
    {
      evidenceCode: `${serviceCode}-PHOTO`,
      label: 'Identity photograph',
      description: 'NON_PRODUCTION identity photograph evidence',
      required: true,
      verificationCategory: 'INTEGRITY',
    },
  ];

  if (requiresSponsor) {
    evidenceRequirements.push({
      evidenceCode: `${serviceCode}-SPONSOR`,
      label: 'Sponsor support letter',
      description: 'NON_PRODUCTION sponsor requirement placeholder',
      required: true,
      verificationCategory: 'SIGNATURE',
    });
  }

  if (input.key === 'DEPENDENT-RESIDENCY') {
    evidenceRequirements.push({
      evidenceCode: `${serviceCode}-DEPENDENCY-PROOF`,
      label: 'Proof of dependency relationship',
      description: 'NON_PRODUCTION dependency check evidence placeholder',
      required: true,
      verificationCategory: 'INTEGRITY',
    });
  }

  const workflowStages: ServicePackServiceDefinition['workflowStages'] = [
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
      authorityFunctionCode: 'TEMPLATE-AUTH-IMMIGRATION-INTAKE',
      authorityActionType: 'REVIEW',
      consequenceLevel: 'ADMINISTRATIVE',
    },
    {
      stageKey: 'document-review',
      label: 'Document review',
      displayOrder: 3,
      stepType: 'SUBSTANTIVE_REVIEW',
      authorityFunctionCode: 'TEMPLATE-AUTH-IMMIGRATION-REVIEW',
      authorityActionType: 'REVIEW',
      consequenceLevel: 'ADMINISTRATIVE',
    },
  ];

  let displayOrder = 4;

  if (requiresBiometric) {
    workflowStages.push({
      stageKey: 'biometric',
      label: 'Biometric capture',
      displayOrder,
      stepType: 'INTERNAL_COORDINATION',
      authorityFunctionCode: 'TEMPLATE-AUTH-IMMIGRATION-BIOMETRIC',
      authorityActionType: 'VERIFY',
      consequenceLevel: 'ADMINISTRATIVE',
    });
    displayOrder += 1;
  }

  if (requiresInterview) {
    workflowStages.push({
      stageKey: 'interview',
      label: 'Interview',
      displayOrder,
      stepType: 'INTERNAL_COORDINATION',
      authorityFunctionCode: 'TEMPLATE-AUTH-IMMIGRATION-INTERVIEW',
      authorityActionType: 'REVIEW',
      consequenceLevel: 'ADMINISTRATIVE',
    });
    displayOrder += 1;
  }

  if (!isScheduling) {
    workflowStages.push({
      stageKey: 'external-checks',
      label: 'External coordination',
      displayOrder,
      stepType: 'EXTERNAL_REFERRAL',
      authorityFunctionCode: 'TEMPLATE-AUTH-EXTERNAL-REFERRAL',
      authorityActionType: 'PREPARE',
      consequenceLevel: 'ADMINISTRATIVE',
    });
    displayOrder += 1;
  }

  if (!isRedress && !isScheduling) {
    workflowStages.push({
      stageKey: 'decision',
      label: 'Decision',
      displayOrder,
      stepType: 'DECISION_GATE',
      authorityFunctionCode: 'TEMPLATE-AUTH-IMMIGRATION-DECIDE',
      authorityActionType: 'DECIDE',
      consequenceLevel: 'CONSEQUENTIAL',
      isDecisionStage: true,
    });
    displayOrder += 1;

    workflowStages.push({
      stageKey: 'issuance',
      label: 'Credential issuance',
      displayOrder,
      stepType: 'ISSUANCE_GATE',
      authorityFunctionCode: 'TEMPLATE-AUTH-IMMIGRATION-ISSUE',
      authorityActionType: 'ISSUE',
      consequenceLevel: 'CONSEQUENTIAL',
      isIssuanceStage: true,
    });
  }

  const dependencies: ServicePackServiceDefinition['dependencies'] = [
    {
      dependencyCode: `${serviceCode}-IDENTITY-VERIFY`,
      dependencyType: 'IDENTITY_PROVIDER',
      description: 'NON_PRODUCTION identity verification integration placeholder',
      externalIntegrationCode: 'TEMPLATE-IDENTITY-API',
    },
  ];

  if (!isScheduling) {
    dependencies.push({
      dependencyCode: `${serviceCode}-EXTERNAL-SECURITY`,
      dependencyType: 'EXTERNAL_SECURITY_CHECK',
      description: 'NON_PRODUCTION restricted external security check — official-only',
      externalIntegrationCode: 'TEMPLATE-IMM-SECURITY-API',
    });
  }

  if (input.key === 'WORK-LINKED-RESIDENCY') {
    dependencies.push({
      dependencyCode: `${serviceCode}-LABOUR-VERIFY`,
      dependencyType: 'EXTERNAL_REGISTRY',
      description: 'NON_PRODUCTION labour registry dependency check placeholder',
      externalIntegrationCode: 'TEMPLATE-LABOUR-REGISTRY',
    });
  }

  const outputs: ServicePackServiceDefinition['outputs'] = [];
  if (!isRedress && !isScheduling) {
    outputs.push({
      outputCode: `${serviceCode}-CREDENTIAL`,
      label: isRenewal ? 'Renewed immigration credential' : 'Immigration credential',
      outputType: isRenewal ? 'RENEWAL' : 'PERMIT',
      deliveryChannel: 'SECURE_PORTAL',
    });
  }
  if (isScheduling) {
    outputs.push({
      outputCode: `${serviceCode}-APPOINTMENT-CONFIRMATION`,
      label: 'Appointment confirmation',
      outputType: 'NOTICE',
      deliveryChannel: 'PORTAL',
    });
  }

  const redress: ServicePackServiceDefinition['redress'] = isRedress
    ? [
        {
          routeCode: `${serviceCode}-ADMIN-REVIEW`,
          label: 'Administrative review',
          routeType: 'ADMINISTRATIVE_REVIEW',
          description:
            'NON_PRODUCTION immigration appeal route — does not overwrite original decision',
        },
        {
          routeCode: `${serviceCode}-EXTERNAL-APPEAL`,
          label: 'External tribunal referral',
          routeType: 'EXTERNAL_REFERRAL',
          description: 'NON_PRODUCTION external appeal coordination placeholder',
        },
      ]
    : [
        {
          routeCode: `${serviceCode}-RECONSIDERATION`,
          label: 'Reconsideration request',
          routeType: 'RECONSIDERATION',
          description: 'NON_PRODUCTION reconsideration placeholder',
        },
      ];

  return {
    serviceCode,
    serviceSlug: slug,
    serviceName: input.name,
    serviceFamilyCode: IMMIGRATION_SERVICE_FAMILY_CODE,
    serviceType: input.serviceType,
    description: `NON_PRODUCTION template: ${input.name}. Placeholder only until jurisdiction supplies verified authority.`,
    applicantCategories: isRedress
      ? ['INDIVIDUAL', 'RESIDENT', 'AUTHORIZED_REPRESENTATIVE']
      : ['INDIVIDUAL', 'NON_RESIDENT', 'RESIDENT', 'AUTHORIZED_REPRESENTATIVE'],
    authorityFunctions: [
      {
        functionCode: 'TEMPLATE-AUTH-IMMIGRATION-INTAKE',
        publicStageLabel: 'Submit application',
        authorityActionType: 'PREPARE',
        sequenceOrder: 1,
        isConsequential: false,
      },
      {
        functionCode: 'TEMPLATE-AUTH-IMMIGRATION-REVIEW',
        publicStageLabel: 'Under review',
        authorityActionType: 'REVIEW',
        sequenceOrder: 2,
        isConsequential: false,
      },
      ...(requiresBiometric
        ? [
            {
              functionCode: 'TEMPLATE-AUTH-IMMIGRATION-BIOMETRIC',
              publicStageLabel: 'Biometric appointment',
              authorityActionType: 'VERIFY',
              sequenceOrder: 3,
              isConsequential: false,
            },
          ]
        : []),
      ...(requiresInterview
        ? [
            {
              functionCode: 'TEMPLATE-AUTH-IMMIGRATION-INTERVIEW',
              publicStageLabel: 'Interview scheduled',
              authorityActionType: 'REVIEW',
              sequenceOrder: 4,
              isConsequential: false,
            },
          ]
        : []),
      {
        functionCode: 'TEMPLATE-AUTH-EXTERNAL-REFERRAL',
        publicStageLabel: 'External coordination',
        authorityActionType: 'PREPARE',
        sequenceOrder: 5,
        isConsequential: false,
      },
      ...(isRedress || isScheduling
        ? []
        : [
            {
              functionCode: 'TEMPLATE-AUTH-IMMIGRATION-DECIDE',
              publicStageLabel: 'Decision',
              authorityActionType: 'DECIDE',
              sequenceOrder: 6,
              isConsequential: true,
            },
            {
              functionCode: 'TEMPLATE-AUTH-IMMIGRATION-ISSUE',
              publicStageLabel: 'Credential issued',
              authorityActionType: 'ISSUE',
              sequenceOrder: 7,
              isConsequential: true,
            },
          ]),
    ],
    forms: [
      {
        formCode,
        formName: `${input.name} intake`,
        versionLabel: '1.0.0',
        sections: [
          {
            sectionKey: 'applicant',
            label: 'Applicant details',
            fields: [
              { fieldKey: 'fullName', label: 'Full legal name', fieldType: 'TEXT', required: true },
              {
                fieldKey: 'passportNumber',
                label: 'Passport or travel document number',
                fieldType: 'IDENTIFIER',
                required: true,
              },
              {
                fieldKey: 'nationality',
                label: 'Nationality',
                fieldType: 'TEXT',
                required: true,
              },
            ],
          },
          ...(requiresSponsor
            ? [
                {
                  sectionKey: 'sponsor',
                  label: 'Sponsor details',
                  fields: [
                    {
                      fieldKey: 'sponsorName',
                      label: 'Sponsor name',
                      fieldType: 'TEXT',
                      required: true,
                    },
                    {
                      fieldKey: 'sponsorRelationship',
                      label: 'Relationship to applicant',
                      fieldType: 'TEXT',
                      required: true,
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    ],
    evidenceRequirements,
    workflowStages,
    completenessReview: {
      enabled: true,
      deficiencyNoticeTemplateCode: `${serviceCode}-DEFICIENCY-NOTICE`,
      requiredEvidenceCodes: evidenceRequirements
        .filter((e) => e.required)
        .map((e) => e.evidenceCode),
    },
    slaRules: [
      {
        ruleCode: `${serviceCode}-SLA`,
        label: `${input.name} processing SLA`,
        targetDays: isScheduling ? 7 : isRedress ? 30 : 45,
        clockStartsAtStageKey: 'intake',
        pauseConditions: ['WAITING_APPLICANT', 'WAITING_EXTERNAL'],
      },
    ],
    fees: isScheduling
      ? []
      : [
          {
            feeCode: `${serviceCode}-APPLICATION-FEE`,
            label: 'Application fee',
            amount: 150,
            currencyCode: 'USD',
            waivable: true,
          },
        ],
    outputs,
    communications: [
      {
        communicationCode: `${serviceCode}-ACK`,
        triggerStageKey: 'intake',
        channel: 'PORTAL',
        templateCode: `${serviceCode}-ACK-TEMPLATE`,
      },
      {
        communicationCode: `${serviceCode}-DECISION-NOTICE`,
        triggerStageKey: isRedress ? 'document-review' : 'decision',
        channel: 'SECURE_MESSAGE',
        templateCode: `${serviceCode}-DECISION-TEMPLATE`,
      },
    ],
    dependencies,
    decisionStages:
      isRedress || isScheduling
        ? []
        : [
            {
              stageKey: 'decision',
              decisionActorFunctionCode: 'TEMPLATE-AUTH-IMMIGRATION-DECIDE',
              requiresSecondApproval: input.key === 'CITIZENSHIP-APPLICATION',
            },
          ],
    issuance:
      isRedress || isScheduling
        ? {
            issuanceStageKey: 'document-review',
            issuanceFunctionCode: 'TEMPLATE-AUTH-IMMIGRATION-REVIEW',
            outputCodes: outputs.map((o) => o.outputCode),
          }
        : {
            issuanceStageKey: 'issuance',
            issuanceFunctionCode: 'TEMPLATE-AUTH-IMMIGRATION-ISSUE',
            outputCodes: outputs.map((o) => o.outputCode),
          },
    lifecycle: {
      supportsRenewal: isRenewal || input.key === 'RESIDENCY-APPLICATION',
      renewalServiceCode: isRenewal
        ? undefined
        : `${IMMIGRATION_SERVICE_CODE_PREFIX}RESIDENCY-RENEWAL`,
      validityPeriodDays: isScheduling ? undefined : input.key.includes('VISA') ? 90 : 365,
      supersessionPolicyCode: `${serviceCode}-SUPERSEDE`,
    },
    redress,
    dashboardIndicators: [
      {
        indicatorCode: `${serviceCode}-INTAKE-QUEUE`,
        label: `${input.name} intake queue`,
        metricType: 'QUEUE_DEPTH',
      },
      {
        indicatorCode: `${serviceCode}-SLA-RISK`,
        label: `${input.name} SLA risk`,
        metricType: 'SLA_BREACH_RISK',
        threshold: 5,
      },
      {
        indicatorCode: `${serviceCode}-EXTERNAL-PENDING`,
        label: `${input.name} unresolved external determinations`,
        metricType: 'EXTERNAL_PENDING',
      },
    ],
  };
}

export function buildImmigrationGovernmentServicePack(): ServicePackManifest {
  return {
    schemaVersion: SERVICE_PACK_SCHEMA_VERSION,
    packLabel: SERVICE_PACK_NON_PRODUCTION_LABEL,
    packId: IMMIGRATION_SERVICE_PACK_ID,
    packVersion: '1.0.0',
    packName: 'Immigration, Residency & Citizenship Government Service Pack',
    description:
      'NON_PRODUCTION reusable immigration vertical template pack covering visas, residency, citizenship, appeals, and biometric/interview scheduling. TEMPLATE ONLY — not verified law, policy, or authority assignments.',
    institutionCode: IMMIGRATION_INSTITUTION_CODE,
    departmentCode: IMMIGRATION_DEPARTMENT_CODE,
    deploymentIntent: DEPLOYMENT_INTENT,
    services: IMMIGRATION_TEMPLATE_SERVICE_DEFINITIONS.map((definition) =>
      buildImmigrationService(definition),
    ),
  };
}

export const IMMIGRATION_GOVERNMENT_SERVICE_PACK = buildImmigrationGovernmentServicePack();
