import {
  AccountStatus,
  AuthenticationMethodType,
  FormDefinitionStatus,
  FormFieldType,
  FormVersionStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  IdentityType,
  InstitutionType,
  JurisdictionType,
  WorkflowDefinitionStatus,
  WorkflowStepConsequenceLevel,
  WorkflowStepType,
  WorkflowVersionStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { NON_PRODUCTION_APPLICATION_PROCESSING_FIXTURE_MARKER } from '../../src/application-processing/application-processing.constants';
import { type CaseFoundationService } from '../../src/application-processing/cases/case-foundation.service';
import { type PrismaService } from '../../src/database/prisma.service';
import { buildServiceConfigurationFingerprint } from '../../src/service-catalog/common/service-configuration-hash.util';
import { asLoginResponseBody } from './identity-test-types';

export interface ApplicationProcessingFixtureContext {
  jurisdictionId: string;
  institutionId: string;
  departmentId: string;
  serviceFamilyId: string;
  governmentServiceId: string;
  governmentServiceVersionId: string;
  formDefinitionId: string;
  formVersionId: string;
  configurationFingerprint: string;
  applicantIdentityId: string;
  applicantSessionToken: string;
  officialIdentityId: string;
  officialSessionToken: string;
  officeholderId: string;
}

export async function seedApplicationProcessingFixture(
  app: { getHttpServer: () => App },
  prisma: PrismaService,
): Promise<ApplicationProcessingFixtureContext> {
  const marker = NON_PRODUCTION_APPLICATION_PROCESSING_FIXTURE_MARKER;

  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `${marker}-JUR`,
      name: 'NON_PRODUCTION Application Processing Jurisdiction',
      type: JurisdictionType.NATIONAL,
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${marker}-INST`,
      name: 'NON_PRODUCTION Application Processing Institution',
      type: InstitutionType.AGENCY,
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: `${marker}-DEPT`,
      name: 'NON_PRODUCTION Application Processing Department',
    },
  });

  const serviceFamily = await prisma.serviceFamily.create({
    data: {
      code: `${marker}-FAMILY`,
      name: 'Permits',
      description: 'NON_PRODUCTION test family',
    },
  });

  const service = await prisma.governmentService.create({
    data: {
      code: `${marker}-SERVICE`,
      slug: `${marker.toLowerCase()}-service`,
      officialName: 'NON_PRODUCTION Test Permit',
      publicName: 'Test Permit',
      responsibleInstitutionId: institution.id,
      responsibleDepartmentId: department.id,
      serviceFamilyId: serviceFamily.id,
    },
  });

  const serviceVersion = await prisma.governmentServiceVersion.create({
    data: {
      governmentServiceId: service.id,
      version: '1.0.0',
      maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
      publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
    },
  });

  const formDefinition = await prisma.formDefinition.create({
    data: {
      code: `${marker}-FORM`,
      name: 'Timeline Test Form',
      governmentServiceVersionId: serviceVersion.id,
      status: FormDefinitionStatus.ACTIVE,
    },
  });

  const formVersion = await prisma.formVersion.create({
    data: {
      formDefinitionId: formDefinition.id,
      version: 1,
      title: { en: 'Timeline Test Form' },
      status: FormVersionStatus.PUBLISHED,
      publishedAt: new Date(),
      sections: {
        create: {
          sectionKey: 'main',
          title: { en: 'Main' },
          displayOrder: 1,
          fields: {
            create: {
              fieldKey: 'name',
              label: { en: 'Name' },
              fieldType: FormFieldType.TEXT,
              required: true,
              displayOrder: 1,
            },
          },
        },
      },
    },
  });

  await prisma.governmentServiceVersion.update({
    where: { id: serviceVersion.id },
    data: { formDefinitionId: formDefinition.id, formVersionId: formVersion.id },
  });

  const configurationFingerprint = buildServiceConfigurationFingerprint({
    serviceVersionId: serviceVersion.id,
    formVersionId: formVersion.id,
    feeDefinitionIds: [],
    eligibilityRuleIds: [],
    checklistItemIds: [],
  });

  const workflowDefinition = await prisma.workflowDefinition.create({
    data: {
      code: `${marker}-WF`,
      name: 'Timeline Test Workflow',
      governmentServiceId: service.id,
      status: WorkflowDefinitionStatus.APPROVED,
    },
  });

  await prisma.workflowVersion.create({
    data: {
      workflowDefinitionId: workflowDefinition.id,
      version: '1.0.0',
      status: WorkflowVersionStatus.APPROVED,
      approvedAt: new Date(),
      stages: {
        create: [{ stageKey: 'intake', label: 'Intake', displayOrder: 1 }],
      },
      steps: {
        create: {
          stepKey: 'intake',
          label: 'Intake',
          stepType: WorkflowStepType.INTAKE,
          consequenceLevel: WorkflowStepConsequenceLevel.INFORMATIONAL,
          displayOrder: 1,
        },
      },
    },
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

  const officialPerson = await prisma.person.create({
    data: { givenName: 'Official', familyName: 'Reviewer' },
  });

  const officialAccount = await prisma.userAccount.create({
    data: {
      loginIdentifier: `${marker}-official@test.gov`,
      personId: officialPerson.id,
      status: AccountStatus.ACTIVE,
    },
  });

  const officialIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'Official Reviewer',
      userAccountId: officialAccount.id,
      personId: officialPerson.id,
    },
  });

  const officeholder = await prisma.officeholder.create({
    data: {
      code: `${marker}-OFFICIAL`,
      name: 'NON_PRODUCTION Case Manager',
    },
  });

  let applicantSessionToken = '';
  let officialSessionToken = '';

  for (const [identityId, password, login] of [
    [applicantIdentity.id, 'Applicant123!', `${marker}-applicant@test.gov`],
    [officialIdentity.id, 'Official123!', `${marker}-official@test.gov`],
  ] as const) {
    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({ identityId, type: 'PASSWORD', password })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/identity/authentication-methods')
      .send({ identityId, type: AuthenticationMethodType.PASSWORD })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/identity/auth/login')
      .send({ loginIdentifier: login, password })
      .expect(201);

    const body = asLoginResponseBody(loginResponse.body);
    if (identityId === applicantIdentity.id) {
      applicantSessionToken = body.sessionToken;
    } else {
      officialSessionToken = body.sessionToken;
    }
  }

  return {
    jurisdictionId: jurisdiction.id,
    institutionId: institution.id,
    departmentId: department.id,
    serviceFamilyId: serviceFamily.id,
    governmentServiceId: service.id,
    governmentServiceVersionId: serviceVersion.id,
    formDefinitionId: formDefinition.id,
    formVersionId: formVersion.id,
    configurationFingerprint,
    applicantIdentityId: applicantIdentity.id,
    applicantSessionToken,
    officialIdentityId: officialIdentity.id,
    officialSessionToken,
    officeholderId: officeholder.id,
  };
}

export async function seedCaseFromApplication(
  prisma: PrismaService,
  foundation: CaseFoundationService,
  fixture: ApplicationProcessingFixtureContext,
): Promise<{ applicationId: string; caseId: string }> {
  const application = await foundation.createApplication({
    applicationNumber: `${NON_PRODUCTION_APPLICATION_PROCESSING_FIXTURE_MARKER}-APP-001`,
    applicantIdentityId: fixture.applicantIdentityId,
    governmentServiceId: fixture.governmentServiceId,
    governmentServiceVersionId: fixture.governmentServiceVersionId,
    formDefinitionId: fixture.formDefinitionId,
    formVersionId: fixture.formVersionId,
    configurationFingerprint: fixture.configurationFingerprint,
  });

  const caseRecord = await foundation.openCaseFromApplication({
    applicationId: application.id,
    actorIdentityId: fixture.officialIdentityId,
  });

  return { applicationId: application.id, caseId: caseRecord.id };
}
