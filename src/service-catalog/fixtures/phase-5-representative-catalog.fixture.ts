/**
 * NON_PRODUCTION SAMPLE representative service catalog for Phase 5H scenarios.
 * Seeds eight service families with function mappings, eligibility, forms, fees,
 * dependencies, outputs, and redress routes.
 */
import {
  ApplicantCategory,
  CatalogServiceType,
  FormVersionStatus,
  FunctionAuthorityLifecycleStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  InstitutionType,
  JurisdictionType,
  ServiceFunctionMappingStatus,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { type PrismaService } from '../../database/prisma.service';
import { NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER } from '../service-catalog.constants';

export interface RepresentativeServiceSeed {
  familyCode: string;
  familyName: string;
  slug: string;
  serviceId: string;
  serviceVersionId: string;
  formDefinitionId: string;
  formVersionId: string;
  functionAuthorityRecordId: string;
}

export interface Phase5RepresentativeCatalogContext {
  institutionId: string;
  departmentId: string;
  services: RepresentativeServiceSeed[];
}

interface FamilyDefinition {
  codeSuffix: string;
  name: string;
  slug: string;
  publicName: string;
  purpose: string;
  catalogServiceType: CatalogServiceType;
  applicantCategories: ApplicantCategory[];
  feeCode: string;
  outputCode: string;
  ruleCode: string;
  checklistCode: string;
  redressCode: string;
  dependencyLabel: string;
  formField: string;
  conditionalChecklist?: {
    itemCode: string;
    label: string;
    conditionExpression: Record<string, unknown>;
  };
}

const FAMILY_DEFINITIONS: FamilyDefinition[] = [
  {
    codeSuffix: 'CORP-REG',
    name: 'Corporate Registration',
    slug: 'corporate-registration',
    publicName: 'Register a Company',
    purpose: 'Register a new corporate entity within the special economic zone.',
    catalogServiceType: CatalogServiceType.APPLICATION,
    applicantCategories: [ApplicantCategory.BUSINESS, ApplicantCategory.INVESTOR],
    feeCode: 'INCORPORATION_FEE',
    outputCode: 'CERTIFICATE_OF_INCORPORATION',
    ruleCode: 'REGISTERED_AGENT',
    checklistCode: 'ARTICLES_OF_ASSOCIATION',
    redressCode: 'REGISTRY_APPEALS',
    dependencyLabel: 'Name reservation clearance',
    formField: 'companyName',
  },
  {
    codeSuffix: 'BUS-LIC',
    name: 'Business Licensing',
    slug: 'business-operating-licence',
    publicName: 'Business Operating Licence',
    purpose: 'Apply to operate a business within the special economic zone.',
    catalogServiceType: CatalogServiceType.LICENCE,
    applicantCategories: [ApplicantCategory.BUSINESS],
    feeCode: 'LICENCE_FEE',
    outputCode: 'OPERATING_LICENCE',
    ruleCode: 'REGISTERED_BUSINESS',
    checklistCode: 'ID_DOCUMENT',
    redressCode: 'LICENSING_COMPLAINTS',
    dependencyLabel: 'Fire safety inspection',
    formField: 'businessName',
    conditionalChecklist: {
      itemCode: 'RESTRICTED_ACTIVITY_DETAIL',
      label: 'Restricted activity detail',
      conditionExpression: { field: 'activityType', equals: 'RESTRICTED' },
    },
  },
  {
    codeSuffix: 'INV-INTAKE',
    name: 'Investor Intake',
    slug: 'investor-intake',
    publicName: 'Investor Intake Registration',
    purpose: 'Register qualified investors for expedited business establishment.',
    catalogServiceType: CatalogServiceType.APPLICATION,
    applicantCategories: [ApplicantCategory.INVESTOR],
    feeCode: 'INTAKE_FEE',
    outputCode: 'INVESTOR_ACKNOWLEDGEMENT',
    ruleCode: 'MINIMUM_INVESTMENT',
    checklistCode: 'INVESTMENT_PLAN',
    redressCode: 'INVESTOR_SERVICES',
    dependencyLabel: 'Investment screening review',
    formField: 'investmentAmount',
  },
  {
    codeSuffix: 'DEV-CONST',
    name: 'Development/Construction',
    slug: 'development-construction-permit',
    publicName: 'Development and Construction Permit',
    purpose: 'Permit development and construction activities in the zone.',
    catalogServiceType: CatalogServiceType.PERMIT,
    applicantCategories: [ApplicantCategory.BUSINESS, ApplicantCategory.PROFESSIONAL],
    feeCode: 'PERMIT_FEE',
    outputCode: 'CONSTRUCTION_PERMIT',
    ruleCode: 'SITE_PLAN_APPROVED',
    checklistCode: 'SITE_PLAN',
    redressCode: 'PLANNING_APPEALS',
    dependencyLabel: 'Environmental impact screening',
    formField: 'projectName',
  },
  {
    codeSuffix: 'LABOUR-WP',
    name: 'Labour/Work Permit',
    slug: 'labour-work-permit',
    publicName: 'Labour Work Permit',
    purpose: 'Authorize foreign workers to be employed within the zone.',
    catalogServiceType: CatalogServiceType.PERMIT,
    applicantCategories: [ApplicantCategory.EMPLOYER, ApplicantCategory.EMPLOYEE],
    feeCode: 'WORK_PERMIT_FEE',
    outputCode: 'WORK_PERMIT_CERTIFICATE',
    ruleCode: 'VALID_EMPLOYMENT_OFFER',
    checklistCode: 'EMPLOYMENT_CONTRACT',
    redressCode: 'LABOUR_COMPLAINTS',
    dependencyLabel: 'Employer registration verification',
    formField: 'workerName',
  },
  {
    codeSuffix: 'IMM-RES',
    name: 'Immigration/Residency',
    slug: 'immigration-residency',
    publicName: 'Residency Authorization',
    purpose: 'Apply for residency authorization linked to zone employment or investment.',
    catalogServiceType: CatalogServiceType.APPLICATION,
    applicantCategories: [ApplicantCategory.RESIDENT, ApplicantCategory.NON_RESIDENT],
    feeCode: 'RESIDENCY_FEE',
    outputCode: 'RESIDENCY_AUTHORIZATION',
    ruleCode: 'PASSPORT_VALID',
    checklistCode: 'PASSPORT_COPY',
    redressCode: 'IMMIGRATION_APPEALS',
    dependencyLabel: 'Security clearance check',
    formField: 'passportNumber',
  },
  {
    codeSuffix: 'LAND-PROP',
    name: 'Land/Property',
    slug: 'land-property-registration',
    publicName: 'Land and Property Registration',
    purpose: 'Register land or property interests within the zone.',
    catalogServiceType: CatalogServiceType.REGISTRATION,
    applicantCategories: [ApplicantCategory.BUSINESS, ApplicantCategory.INDIVIDUAL],
    feeCode: 'REGISTRATION_FEE',
    outputCode: 'TITLE_CERTIFICATE',
    ruleCode: 'CLEAR_TITLE',
    checklistCode: 'SURVEY_REPORT',
    redressCode: 'LAND_REGISTRY_APPEALS',
    dependencyLabel: 'Cadastral survey verification',
    formField: 'parcelIdentifier',
  },
  {
    codeSuffix: 'CUSTOMS-TRADE',
    name: 'Customs/Trade',
    slug: 'customs-trade-clearance',
    publicName: 'Customs and Trade Clearance',
    purpose: 'Clear goods for import or export through zone customs controls.',
    catalogServiceType: CatalogServiceType.PERMIT,
    applicantCategories: [ApplicantCategory.BUSINESS, ApplicantCategory.AUTHORIZED_REPRESENTATIVE],
    feeCode: 'CLEARANCE_FEE',
    outputCode: 'CUSTOMS_RELEASE',
    ruleCode: 'REGISTERED_IMPORTER',
    checklistCode: 'COMMERCIAL_INVOICE',
    redressCode: 'CUSTOMS_APPEALS',
    dependencyLabel: 'Tariff classification review',
    formField: 'shipmentReference',
  },
];

export async function seedPhase5RepresentativeCatalog(
  prisma: PrismaService,
  functionAuthorityRecordId: string,
): Promise<Phase5RepresentativeCatalogContext> {
  const marker = `${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}-REP`;

  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `${marker}-JUR`,
      name: 'Representative Catalog Jurisdiction',
      type: JurisdictionType.NATIONAL,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${marker}-INST`,
      name: 'Representative Catalog Institution',
      type: InstitutionType.AGENCY,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: `${marker}-DEPT`,
      name: 'Representative Services Department',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  await prisma.functionAuthorityRecord.update({
    where: { id: functionAuthorityRecordId },
    data: { lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE },
  });

  const services: RepresentativeServiceSeed[] = [];

  for (const familyDef of FAMILY_DEFINITIONS) {
    const family = await prisma.serviceFamily.create({
      data: {
        code: `${marker}-${familyDef.codeSuffix}`,
        name: familyDef.name,
        description: `${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER} representative family`,
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });

    const formDefinition = await prisma.formDefinition.create({
      data: {
        code: `${marker}-${familyDef.codeSuffix}-FORM`,
        name: `${familyDef.name} Application Form`,
      },
    });

    const formVersion = await prisma.formVersion.create({
      data: {
        formDefinitionId: formDefinition.id,
        versionNumber: 1,
        status: FormVersionStatus.ACTIVE,
        schema: {
          type: 'object',
          properties: {
            [familyDef.formField]: { type: 'string' },
            activityType: { type: 'string', enum: ['GENERAL', 'RESTRICTED'] },
            restrictedActivityDetail: { type: 'string' },
          },
          required: [familyDef.formField],
          'x-non-production-marker': NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER,
        },
        activatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    const service = await prisma.governmentService.create({
      data: {
        slug: familyDef.slug,
        code: `${marker}-${familyDef.codeSuffix}`,
        officialName: familyDef.publicName,
        publicName: familyDef.publicName,
        summary: familyDef.purpose,
        catalogServiceType: familyDef.catalogServiceType,
        internalNotes: `${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER} internal note`,
        sensitiveConfig: { integrationSecret: 'must-not-leak' },
        responsibleInstitutionId: institution.id,
        responsibleDepartmentId: department.id,
        serviceFamilyId: family.id,
      },
    });

    const version = await prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: service.id,
        version: '1.0.0',
        purpose: familyDef.purpose,
        coveredActivities: familyDef.purpose,
        publicDescription: familyDef.purpose,
        typicalValidityDescription: '1 year',
        informationLastVerifiedAt: new Date('2026-09-01T00:00:00.000Z'),
        publicDisclaimer: 'Fees and timelines are indicative only.',
        authorityClassificationSummary: 'ABSEZ delegated function',
        majorDependencies: [{ label: familyDef.dependencyLabel, type: 'INSTITUTIONAL' }],
        internalGoverningSourceMaterial: `${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER} governing source`,
        restrictedSecurityNotes: 'Do not expose integration credentials',
        maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
        publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
        formDefinitionId: formDefinition.id,
        formVersionId: formVersion.id,
        applicantCategories: {
          create: familyDef.applicantCategories.map((category) => ({ category })),
        },
        fees: {
          create: [
            {
              code: familyDef.feeCode,
              label: `${familyDef.name} fee`,
              amountCents: 25000,
              currency: 'XCD',
              sortOrder: 1,
            },
          ],
        },
        eligibilityRules: {
          create: [
            {
              ruleCode: familyDef.ruleCode,
              label: familyDef.ruleCode.replace(/_/g, ' '),
              description: `Applicant must satisfy ${familyDef.ruleCode}.`,
              configuration: {
                requiredAttribute: familyDef.formField,
                requiresTruthyAttribute: true,
              },
              sortOrder: 1,
            },
          ],
        },
        checklistItems: {
          create: [
            {
              itemCode: familyDef.checklistCode,
              label: familyDef.checklistCode.replace(/_/g, ' '),
              description: `Provide ${familyDef.checklistCode.replace(/_/g, ' ').toLowerCase()}.`,
              sortOrder: 1,
            },
            ...(familyDef.conditionalChecklist
              ? [
                  {
                    itemCode: familyDef.conditionalChecklist.itemCode,
                    label: familyDef.conditionalChecklist.label,
                    description: 'Required when activity is restricted.',
                    conditionExpression: familyDef.conditionalChecklist.conditionExpression,
                    isRequired: true,
                    sortOrder: 2,
                  },
                ]
              : []),
          ],
        },
        outputs: {
          create: [
            {
              outputCode: familyDef.outputCode,
              label: familyDef.outputCode.replace(/_/g, ' '),
              validityLabel: '1 year',
              sortOrder: 1,
            },
          ],
        },
        redressRoutes: {
          create: [
            {
              routeCode: familyDef.redressCode,
              label: `${familyDef.name} appeals desk`,
              contactReference: `${familyDef.redressCode.toLowerCase()}@example.gov`,
              sortOrder: 1,
            },
          ],
        },
      },
    });

    await prisma.serviceFunctionMapping.create({
      data: {
        governmentServiceVersionId: version.id,
        functionAuthorityRecordId,
        sequenceOrder: 1,
        isConsequential: true,
        publicStageLabel: `${familyDef.name} review`,
        status: ServiceFunctionMappingStatus.ACTIVE,
      },
    });

    services.push({
      familyCode: family.code,
      familyName: family.name,
      slug: service.slug,
      serviceId: service.id,
      serviceVersionId: version.id,
      formDefinitionId: formDefinition.id,
      formVersionId: formVersion.id,
      functionAuthorityRecordId,
    });
  }

  return {
    institutionId: institution.id,
    departmentId: department.id,
    services,
  };
}
