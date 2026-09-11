import {
  ApplicantCategory,
  CatalogServiceType,
  FormVersionStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  InstitutionType,
  JurisdictionType,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { type PrismaService } from '../../src/database/prisma.service';
import { NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER } from '../../src/service-catalog/service-catalog.constants';

export interface SeededPublicServiceContext {
  departmentId: string;
  familyCode: string;
  activeServiceId: string;
  activeServiceSlug: string;
  activeServiceVersionId: string;
  suspendedServiceSlug: string;
  pilotServiceSlug: string;
  informationServiceSlug: string;
  formDefinitionId: string;
  formVersionId: string;
}

export async function seedPublicServiceDiscoveryFixture(
  prisma: PrismaService,
): Promise<SeededPublicServiceContext> {
  const marker = `${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}-PUBLIC`;

  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `${marker}-JUR`,
      name: 'Public Discovery Jurisdiction',
      type: JurisdictionType.NATIONAL,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${marker}-INST`,
      name: 'Public Discovery Institution',
      type: InstitutionType.AGENCY,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: `${marker}-DEPT`,
      name: 'Licensing Department',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const family = await prisma.serviceFamily.create({
    data: {
      code: `${marker}-FAMILY`,
      name: 'Business Licensing',
      description: 'Business licensing services',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const formDefinition = await prisma.formDefinition.create({
    data: {
      code: `${marker}-FORM`,
      name: 'Business Licence Application',
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
          businessName: { type: 'string' },
        },
        required: ['businessName'],
      },
      activatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  });

  const activeService = await createPublishedService(prisma, {
    marker,
    slug: 'business-operating-licence',
    code: `${marker}-ACTIVE`,
    institutionId: institution.id,
    departmentId: department.id,
    familyId: family.id,
    catalogServiceType: CatalogServiceType.LICENCE,
    publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
    publicName: 'Business Operating Licence',
    purpose: 'Apply to operate a business within the special economic zone.',
    formDefinitionId: formDefinition.id,
    formVersionId: formVersion.id,
  });

  await createPublishedService(prisma, {
    marker,
    slug: 'suspended-export-permit',
    code: `${marker}-SUSP`,
    institutionId: institution.id,
    departmentId: department.id,
    familyId: family.id,
    catalogServiceType: CatalogServiceType.PERMIT,
    publicAvailability: GovernmentServicePublicAvailability.SUSPENDED,
    publicName: 'Export Permit',
    purpose: 'Permit for exporting regulated goods.',
    formDefinitionId: formDefinition.id,
    formVersionId: formVersion.id,
  });

  const pilotService = await createPublishedService(prisma, {
    marker,
    slug: 'investor-fast-track',
    code: `${marker}-PILOT`,
    institutionId: institution.id,
    departmentId: department.id,
    familyId: family.id,
    catalogServiceType: CatalogServiceType.APPLICATION,
    publicAvailability: GovernmentServicePublicAvailability.PILOT_ONLY,
    publicName: 'Investor Fast Track Registration',
    purpose: 'Pilot registration pathway for qualified investors.',
    formDefinitionId: formDefinition.id,
    formVersionId: formVersion.id,
  });

  const informationService = await createPublishedService(prisma, {
    marker,
    slug: 'business-setup-guide',
    code: `${marker}-INFO`,
    institutionId: institution.id,
    departmentId: department.id,
    familyId: family.id,
    catalogServiceType: CatalogServiceType.INFORMATION,
    publicAvailability: GovernmentServicePublicAvailability.INFORMATION_ONLY,
    publicName: 'Business Setup Guide',
    purpose: 'Information about setting up a business in the zone.',
    formDefinitionId: formDefinition.id,
    formVersionId: formVersion.id,
  });

  return {
    departmentId: department.id,
    familyCode: family.code,
    activeServiceId: activeService.serviceId,
    activeServiceSlug: activeService.slug,
    activeServiceVersionId: activeService.serviceVersionId,
    suspendedServiceSlug: 'suspended-export-permit',
    pilotServiceSlug: pilotService.slug,
    informationServiceSlug: informationService.slug,
    formDefinitionId: formDefinition.id,
    formVersionId: formVersion.id,
  };
}

async function createPublishedService(
  prisma: PrismaService,
  input: {
    marker: string;
    slug: string;
    code: string;
    institutionId: string;
    departmentId: string;
    familyId: string;
    catalogServiceType: CatalogServiceType;
    publicAvailability: GovernmentServicePublicAvailability;
    publicName: string;
    purpose: string;
    formDefinitionId: string;
    formVersionId: string;
  },
): Promise<{ serviceId: string; slug: string; serviceVersionId: string }> {
  const service = await prisma.governmentService.create({
    data: {
      slug: input.slug,
      code: input.code,
      officialName: input.publicName,
      publicName: input.publicName,
      summary: input.purpose,
      catalogServiceType: input.catalogServiceType,
      internalNotes: 'Internal-only operational note',
      sensitiveConfig: { integrationSecret: 'must-not-leak' },
      responsibleInstitutionId: input.institutionId,
      responsibleDepartmentId: input.departmentId,
      serviceFamilyId: input.familyId,
    },
  });

  const isPublic =
    input.publicAvailability !== GovernmentServicePublicAvailability.SUSPENDED &&
    input.publicAvailability !== GovernmentServicePublicAvailability.HIDDEN;

  const version = await prisma.governmentServiceVersion.create({
    data: {
      governmentServiceId: service.id,
      version: '1.0.0',
      purpose: input.purpose,
      coveredActivities: 'operate business, trade goods',
      excludedActivities: 'banking, gambling',
      geographicScope: 'Special Economic Zone',
      publicDescription: input.purpose,
      typicalValidityDescription: '1 year',
      informationLastVerifiedAt: new Date('2026-09-01T00:00:00.000Z'),
      publicDisclaimer: 'Fees and timelines are indicative only.',
      authorityClassificationSummary: 'ABSEZ delegated licensing function',
      majorDependencies: [{ label: 'Professional qualification review', type: 'PROFESSIONAL' }],
      internalGoverningSourceMaterial: 'Restricted governing source bundle',
      restrictedSecurityNotes: 'Do not expose integration credentials',
      maturityStatus: isPublic
        ? GovernmentServiceMaturityStatus.ACTIVE
        : GovernmentServiceMaturityStatus.SUSPENDED,
      publicAvailability: input.publicAvailability,
      formDefinitionId: input.formDefinitionId,
      formVersionId: input.formVersionId,
      applicantCategories: {
        create: [{ category: ApplicantCategory.BUSINESS }, { category: ApplicantCategory.INVESTOR }],
      },
      fees: {
        create: [
          {
            code: 'APPLICATION_FEE',
            label: 'Application fee',
            amountCents: 25000,
            currency: 'XCD',
            sortOrder: 1,
          },
        ],
      },
      eligibilityRules: {
        create: [
          {
            ruleCode: 'REGISTERED_BUSINESS',
            label: 'Registered business',
            description: 'Applicant must represent a registered business entity.',
            configuration: { requiredAttribute: 'registeredBusiness', requiresTruthyAttribute: true },
            sortOrder: 1,
          },
        ],
      },
      checklistItems: {
        create: [
          {
            itemCode: 'ID_DOCUMENT',
            label: 'Identification document',
            description: 'Valid government-issued identification.',
            sortOrder: 1,
          },
        ],
      },
      outputs: {
        create: [
          {
            outputCode: 'LICENCE_CERTIFICATE',
            label: 'Operating licence certificate',
            validityLabel: '1 year',
            sortOrder: 1,
          },
        ],
      },
      redressRoutes: {
        create: [
          {
            routeCode: 'COMPLAINTS',
            label: 'Licensing complaints desk',
            contactReference: 'licensing-complaints@example.gov',
            sortOrder: 1,
          },
        ],
      },
    },
  });

  return {
    serviceId: service.id,
    slug: service.slug,
    serviceVersionId: version.id,
  };
}
