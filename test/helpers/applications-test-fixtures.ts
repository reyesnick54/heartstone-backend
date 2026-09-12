import {
  AccountStatus,
  ApplicantCategory,
  AuthenticationMethodType,
  CatalogServiceType,
  FormFieldType,
  FormVersionStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  IdentityType,
  InstitutionType,
  JurisdictionType,
  RepresentativeAuthorityStatus,
  StructuralLifecycleStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import { buildServiceConfigurationFingerprint } from '../../src/service-catalog/common/service-configuration-hash.util';
import { NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER } from '../../src/applications/common/applications.constants';
import { asLoginResponseBody } from './identity-test-types';

export interface ApplicationsFixtureContext {
  applicantIdentityId: string;
  applicantSessionToken: string;
  otherIdentityId: string;
  otherSessionToken: string;
  governmentServiceId: string;
  governmentServiceVersionId: string;
  formDefinitionId: string;
  formVersionId: string;
  configurationFingerprint: string;
  validAnswers: Record<string, unknown>;
  institutionId: string;
  organizationId: string;
  representativeAuthorityId: string;
}

export async function seedApplicationsFixture(
  app: { getHttpServer: () => App },
  prisma: PrismaService,
): Promise<ApplicationsFixtureContext> {
  const marker = NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER;

  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `${marker}-JUR`,
      name: 'Applications Test Jurisdiction',
      type: JurisdictionType.NATIONAL,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${marker}-INST`,
      name: 'Applications Test Institution',
      type: InstitutionType.AGENCY,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: `${marker}-DEPT`,
      name: 'Applications Test Department',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const serviceFamily = await prisma.serviceFamily.create({
    data: {
      code: `${marker}-FAMILY`,
      name: 'Applications Test Family',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const service = await prisma.governmentService.create({
    data: {
      code: `${marker}-SERVICE`,
      slug: `${marker.toLowerCase()}-service`,
      officialName: 'Business Registration Application',
      publicName: 'Business Registration Application',
      summary: 'Apply to register a business',
      responsibleInstitutionId: institution.id,
      responsibleDepartmentId: department.id,
      serviceFamilyId: serviceFamily.id,
      catalogServiceType: CatalogServiceType.APPLICATION,
    },
  });

  const serviceVersion = await prisma.governmentServiceVersion.create({
    data: {
      governmentServiceId: service.id,
      version: '1.0.0',
      purpose: 'Business registration intake',
      publicDescription: 'Submit a business registration application',
      maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
      publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
      institutionallyAccepted: true,
      applicantCategories: {
        create: [{ category: ApplicantCategory.INDIVIDUAL }],
      },
    },
  });

  const formDefinition = await prisma.formDefinition.create({
    data: {
      code: `${marker}-FORM`,
      name: 'Business Registration Form',
      purpose: 'Collect applicant details',
      governmentServiceVersionId: serviceVersion.id,
    },
  });

  const formVersion = await prisma.formVersion.create({
    data: {
      formDefinitionId: formDefinition.id,
      version: 1,
      title: { default: 'Business Registration v1' },
      status: FormVersionStatus.PUBLISHED,
      publishedAt: new Date(),
      sections: {
        create: [
          {
            sectionKey: 'applicant',
            title: { default: 'Applicant Details' },
            displayOrder: 1,
            fields: {
              create: [
                {
                  fieldKey: 'full_name',
                  label: { default: 'Full Name' },
                  fieldType: FormFieldType.TEXT,
                  required: true,
                  displayOrder: 1,
                  validationDefinition: { minLength: 2, maxLength: 100 },
                },
                {
                  fieldKey: 'business_name',
                  label: { default: 'Business Name' },
                  fieldType: FormFieldType.TEXT,
                  required: true,
                  displayOrder: 2,
                  validationDefinition: { minLength: 2, maxLength: 200 },
                },
                {
                  fieldKey: 'declaration',
                  label: { default: 'Declaration' },
                  fieldType: FormFieldType.DECLARATION,
                  required: true,
                  displayOrder: 3,
                  options: {
                    declarationVersion: '1.0.0',
                    declarationText: {
                      en: 'I declare that the information provided is true and complete.',
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  const checklistItem = await prisma.governmentServiceChecklistItem.create({
    data: {
      governmentServiceVersionId: serviceVersion.id,
      itemCode: 'ID_COPY',
      label: 'Government-issued identification',
      description: 'Copy of valid ID',
      isRequired: true,
      sortOrder: 1,
    },
  });

  const feeDefinition = await prisma.governmentServiceFeeDefinition.create({
    data: {
      governmentServiceVersionId: serviceVersion.id,
      code: 'APPLICATION_FEE',
      label: 'Application Fee',
      amountCents: 5000,
      currency: 'XCD',
      sortOrder: 1,
    },
  });

  const eligibilityRule = await prisma.governmentServiceEligibilityRule.create({
    data: {
      governmentServiceVersionId: serviceVersion.id,
      ruleCode: 'AGE_18',
      label: 'Minimum age',
      description: 'Applicant must be at least 18 years old',
      configuration: { minAge: 18 },
      isRequired: true,
      sortOrder: 1,
    },
  });

  await prisma.governmentServiceVersion.update({
    where: { id: serviceVersion.id },
    data: {
      formDefinitionId: formDefinition.id,
      formVersionId: formVersion.id,
    },
  });

  const configurationFingerprint = buildServiceConfigurationFingerprint({
    serviceVersionId: serviceVersion.id,
    formVersionId: formVersion.id,
    feeDefinitionIds: [feeDefinition.id],
    eligibilityRuleIds: [eligibilityRule.id],
    checklistItemIds: [checklistItem.id],
  });

  const applicantPerson = await prisma.person.create({
    data: { givenName: 'Applicant', familyName: 'Tester' },
  });

  const applicantAccount = await prisma.userAccount.create({
    data: {
      loginIdentifier: `${marker}-applicant@test.gov`,
      personId: applicantPerson.id,
      status: AccountStatus.ACTIVE,
    },
  });

  const applicantIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'Applicant Tester',
      userAccountId: applicantAccount.id,
      personId: applicantPerson.id,
    },
  });

  const otherPerson = await prisma.person.create({
    data: { givenName: 'Other', familyName: 'User' },
  });

  const otherAccount = await prisma.userAccount.create({
    data: {
      loginIdentifier: `${marker}-other@test.gov`,
      personId: otherPerson.id,
      status: AccountStatus.ACTIVE,
    },
  });

  const otherIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'Other User',
      userAccountId: otherAccount.id,
      personId: otherPerson.id,
    },
  });

  const organization = await prisma.organization.create({
    data: {
      code: `${marker}-ORG`,
      name: 'Test Business Organization',
      status: 'ACTIVE',
    },
  });

  const representativeAuthority = await prisma.representativeAuthority.create({
    data: {
      organizationId: organization.id,
      identityId: applicantIdentity.id,
      scopeDescription: 'File business registration applications',
      status: RepresentativeAuthorityStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  for (const [account, password, loginId] of [
    [applicantAccount, 'ApplicantPass123!', `${marker}-applicant@test.gov`],
    [otherAccount, 'OtherPass123!', `${marker}-other@test.gov`],
  ] as const) {
    const identity = account.id === applicantAccount.id ? applicantIdentity : otherIdentity;
    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({ identityId: identity.id, type: 'PASSWORD', password })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/identity/authentication-methods')
      .send({ identityId: identity.id, type: AuthenticationMethodType.PASSWORD })
      .expect(201);
  }

  const applicantLogin = asLoginResponseBody(
    (
      await request(app.getHttpServer())
        .post('/api/v1/identity/auth/login')
        .send({
          loginIdentifier: `${marker}-applicant@test.gov`,
          password: 'ApplicantPass123!',
        })
        .expect(201)
    ).body,
  );

  const otherLogin = asLoginResponseBody(
    (
      await request(app.getHttpServer())
        .post('/api/v1/identity/auth/login')
        .send({
          loginIdentifier: `${marker}-other@test.gov`,
          password: 'OtherPass123!',
        })
        .expect(201)
    ).body,
  );

  const validAnswers = {
    full_name: 'Jane Applicant',
    business_name: 'Island Ventures Ltd',
    declaration: true,
  };

  return {
    applicantIdentityId: applicantIdentity.id,
    applicantSessionToken: applicantLogin.sessionToken,
    otherIdentityId: otherIdentity.id,
    otherSessionToken: otherLogin.sessionToken,
    governmentServiceId: service.id,
    governmentServiceVersionId: serviceVersion.id,
    formDefinitionId: formDefinition.id,
    formVersionId: formVersion.id,
    configurationFingerprint,
    validAnswers,
    institutionId: institution.id,
    organizationId: organization.id,
    representativeAuthorityId: representativeAuthority.id,
  };
}
