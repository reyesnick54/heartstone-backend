import {
  AccountStatus,
  AppointmentStatus,
  AuthenticationMethodType,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  StructuralLifecycleStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER } from '../../src/applications/common/applications.constants';
import { type PrismaService } from '../../src/database/prisma.service';
import {
  type ApplicationsFixtureContext,
  seedApplicationsFixture,
} from './applications-test-fixtures';
import { asApplicationBody, asSubmissionAcknowledgmentBody } from './applications-test-types';
import { asLoginResponseBody } from './identity-test-types';

export interface CasesFixtureContext extends ApplicationsFixtureContext {
  responsibleDepartmentId: string;
  responsibleOfficeId: string;
  responsibleOfficialIdentityId: string;
  responsibleOfficialSessionToken: string;
  responsibleOfficialOfficeholderId: string;
  wrongDepartmentId: string;
  wrongDeptOfficialIdentityId: string;
  wrongDeptOfficialSessionToken: string;
  wrongDeptOfficialOfficeholderId: string;
}

export async function seedCasesFixture(
  app: { getHttpServer: () => App },
  prisma: PrismaService,
): Promise<CasesFixtureContext> {
  const applicationsFixture = await seedApplicationsFixture(app, prisma);
  const marker = NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER;

  const service = await prisma.governmentService.findUniqueOrThrow({
    where: { id: applicationsFixture.governmentServiceId },
    select: { responsibleDepartmentId: true, responsibleInstitutionId: true },
  });

  const responsibleOffice = await prisma.office.create({
    data: {
      departmentId: service.responsibleDepartmentId,
      code: `${marker}-RESP-OFF`,
      name: 'Responsible Case Office',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const wrongDepartment = await prisma.department.create({
    data: {
      institutionId: service.responsibleInstitutionId,
      code: `${marker}-WRONG-DEPT`,
      name: 'Wrong Department',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const wrongOffice = await prisma.office.create({
    data: {
      departmentId: wrongDepartment.id,
      code: `${marker}-WRONG-OFF`,
      name: 'Wrong Department Office',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const responsibleOfficeholder = await prisma.officeholder.create({
    data: {
      code: `${marker}-RESP-OH`,
      name: 'Responsible Department Official',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const wrongDeptOfficeholder = await prisma.officeholder.create({
    data: {
      code: `${marker}-WRONG-OH`,
      name: 'Wrong Department Official',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  await prisma.appointment.create({
    data: {
      officeId: responsibleOffice.id,
      officeholderId: responsibleOfficeholder.id,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  await prisma.appointment.create({
    data: {
      officeId: wrongOffice.id,
      officeholderId: wrongDeptOfficeholder.id,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  const responsibleOfficialPerson = await prisma.person.create({
    data: { givenName: 'Responsible', familyName: 'Official' },
  });

  const responsibleOfficialAccount = await prisma.userAccount.create({
    data: {
      loginIdentifier: `${marker}-official@test.gov`,
      personId: responsibleOfficialPerson.id,
      status: AccountStatus.ACTIVE,
    },
  });

  const responsibleOfficialIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'Responsible Official',
      userAccountId: responsibleOfficialAccount.id,
      personId: responsibleOfficialPerson.id,
    },
  });

  const wrongDeptOfficialPerson = await prisma.person.create({
    data: { givenName: 'Wrong', familyName: 'Official' },
  });

  const wrongDeptOfficialAccount = await prisma.userAccount.create({
    data: {
      loginIdentifier: `${marker}-wrong-official@test.gov`,
      personId: wrongDeptOfficialPerson.id,
      status: AccountStatus.ACTIVE,
    },
  });

  const wrongDeptOfficialIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'Wrong Department Official',
      userAccountId: wrongDeptOfficialAccount.id,
      personId: wrongDeptOfficialPerson.id,
    },
  });

  await prisma.identityOfficeholderLink.create({
    data: {
      identityId: responsibleOfficialIdentity.id,
      officeholderId: responsibleOfficeholder.id,
      status: IdentityOfficeholderLinkStatus.ACTIVE,
    },
  });

  await prisma.identityOfficeholderLink.create({
    data: {
      identityId: wrongDeptOfficialIdentity.id,
      officeholderId: wrongDeptOfficeholder.id,
      status: IdentityOfficeholderLinkStatus.ACTIVE,
    },
  });

  for (const credentialSetup of [
    {
      identity: responsibleOfficialIdentity,
      password: 'OfficialPass123!',
    },
    {
      identity: wrongDeptOfficialIdentity,
      password: 'WrongOfficialPass123!',
    },
  ]) {
    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({
        identityId: credentialSetup.identity.id,
        type: 'PASSWORD',
        password: credentialSetup.password,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/identity/authentication-methods')
      .send({
        identityId: credentialSetup.identity.id,
        type: AuthenticationMethodType.PASSWORD,
      })
      .expect(201);
  }

  const responsibleOfficialLogin = asLoginResponseBody(
    (
      await request(app.getHttpServer())
        .post('/api/v1/identity/auth/login')
        .send({
          loginIdentifier: `${marker}-official@test.gov`,
          password: 'OfficialPass123!',
        })
        .expect(201)
    ).body,
  );

  const wrongDeptOfficialLogin = asLoginResponseBody(
    (
      await request(app.getHttpServer())
        .post('/api/v1/identity/auth/login')
        .send({
          loginIdentifier: `${marker}-wrong-official@test.gov`,
          password: 'WrongOfficialPass123!',
        })
        .expect(201)
    ).body,
  );

  return {
    ...applicationsFixture,
    responsibleDepartmentId: service.responsibleDepartmentId,
    responsibleOfficeId: responsibleOffice.id,
    responsibleOfficialIdentityId: responsibleOfficialIdentity.id,
    responsibleOfficialSessionToken: responsibleOfficialLogin.sessionToken,
    responsibleOfficialOfficeholderId: responsibleOfficeholder.id,
    wrongDepartmentId: wrongDepartment.id,
    wrongDeptOfficialIdentityId: wrongDeptOfficialIdentity.id,
    wrongDeptOfficialSessionToken: wrongDeptOfficialLogin.sessionToken,
    wrongDeptOfficialOfficeholderId: wrongDeptOfficeholder.id,
  };
}

export async function createReceivedApplication(
  app: { getHttpServer: () => App },
  fixture: CasesFixtureContext,
): Promise<{
  application: ReturnType<typeof asApplicationBody>;
  acknowledgment: ReturnType<typeof asSubmissionAcknowledgmentBody>;
}> {
  const draftResponse = await request(app.getHttpServer())
    .post('/api/v1/applications')
    .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
    .send({ governmentServiceVersionId: fixture.governmentServiceVersionId })
    .expect(201);

  const application = asApplicationBody(draftResponse.body);

  await request(app.getHttpServer())
    .patch(`/api/v1/applications/${application.id}/draft`)
    .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
    .send({
      formVersionId: fixture.formVersionId,
      configurationFingerprint: fixture.configurationFingerprint,
      answers: fixture.validAnswers,
    })
    .expect(200);

  const submitResponse = await request(app.getHttpServer())
    .post(`/api/v1/applications/${application.id}/submit`)
    .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
    .send({
      formVersionId: fixture.formVersionId,
      configurationFingerprint: fixture.configurationFingerprint,
      answers: fixture.validAnswers,
    })
    .expect(201);

  return {
    application,
    acknowledgment: asSubmissionAcknowledgmentBody(submitResponse.body),
  };
}
