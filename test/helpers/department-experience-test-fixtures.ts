import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  DashboardAccessPurpose,
  DashboardConsoleType,
  DashboardSensitivityLevel,
  IdentityOfficeholderLinkStatus,
  IdentityType,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import {
  createPasswordAuthenticationMethodViaPrisma,
  createPasswordCredentialViaPrisma,
  loginAndGetSessionToken,
} from './identity-provisioning.fixture';
import { type Phase6FixtureContext, seedPhase6Fixture } from './phase-6-test-fixtures';

export interface DepartmentExperienceFixtureContext extends Phase6FixtureContext {
  departmentHeadSessionToken: string;
  departmentHeadIdentityId: string;
  departmentalDashboardId: string;
  otherDepartmentId: string;
  otherDepartmentOfficialSessionToken: string;
  otherDepartmentOfficialIdentityId: string;
}

export async function grantDepartmentManagementAccess(
  prisma: PrismaService,
  input: {
    identityId: string;
    institutionId: string;
    departmentId: string;
    dashboardDefinitionId?: string;
  },
): Promise<string> {
  const dashboard =
    input.dashboardDefinitionId !== undefined
      ? await prisma.dashboardDefinition.findUniqueOrThrow({
          where: { id: input.dashboardDefinitionId },
        })
      : await prisma.dashboardDefinition.create({
          data: {
            code: `DEPT-MGMT-${input.departmentId.slice(0, 8)}`,
            name: 'Department Management Console',
            consoleType: DashboardConsoleType.DEPARTMENTAL,
            institutionId: input.institutionId,
            departmentId: input.departmentId,
            status: 'ACTIVE',
          },
        });

  await prisma.dashboardAccessPolicy.create({
    data: {
      dashboardDefinitionId: dashboard.id,
      identityId: input.identityId,
      institutionId: input.institutionId,
      departmentId: input.departmentId,
      purpose: DashboardAccessPurpose.DEPARTMENT_MANAGEMENT,
      sensitivityLevel: DashboardSensitivityLevel.RESTRICTED,
      substantiveAccessRequired: true,
    },
  });

  return dashboard.id;
}

export async function seedDepartmentExperienceFixture(
  app: INestApplication<App> | { getHttpServer: () => App },
  prisma: PrismaService,
): Promise<DepartmentExperienceFixtureContext> {
  const base = await seedPhase6Fixture(app, prisma);

  const departmentHeadPerson = await prisma.person.create({
    data: { givenName: 'Department', familyName: 'Head' },
  });

  const departmentHeadAccount = await prisma.userAccount.create({
    data: {
      loginIdentifier: 'dept-head-mgmt@test.gov',
      personId: departmentHeadPerson.id,
      status: AccountStatus.ACTIVE,
    },
  });

  const departmentHeadIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'Department Head',
      userAccountId: departmentHeadAccount.id,
      personId: departmentHeadPerson.id,
    },
  });

  await createPasswordCredentialViaPrisma(prisma, departmentHeadIdentity.id, 'DeptHeadPass123!');
  await createPasswordAuthenticationMethodViaPrisma(prisma, departmentHeadIdentity.id);
  const departmentHeadSessionToken = await loginAndGetSessionToken(
    app,
    'dept-head-mgmt@test.gov',
    'DeptHeadPass123!',
  );

  await prisma.identityOfficeholderLink.create({
    data: {
      identityId: departmentHeadIdentity.id,
      officeholderId: base.officeholderId,
      status: IdentityOfficeholderLinkStatus.ACTIVE,
    },
  });

  const departmentalDashboardId = await grantDepartmentManagementAccess(prisma, {
    identityId: departmentHeadIdentity.id,
    institutionId: base.institutionId,
    departmentId: base.departmentId,
  });

  const otherDepartment = await prisma.department.create({
    data: {
      institutionId: base.institutionId,
      code: 'OTHER-DEPT-MGMT',
      name: 'Other Management Department',
    },
  });

  const otherOffice = await prisma.office.create({
    data: {
      departmentId: otherDepartment.id,
      code: 'OTHER-OFF-MGMT',
      name: 'Other Management Office',
    },
  });

  const otherOfficeholder = await prisma.officeholder.create({
    data: { code: 'OTHER-OH-MGMT', name: 'Other Department Official' },
  });

  await prisma.appointment.create({
    data: {
      officeId: otherOffice.id,
      officeholderId: otherOfficeholder.id,
      status: 'ACTIVE',
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  const otherOfficialPerson = await prisma.person.create({
    data: { givenName: 'Other', familyName: 'DepartmentOfficial' },
  });

  const otherOfficialAccount = await prisma.userAccount.create({
    data: {
      loginIdentifier: 'other-dept-official@test.gov',
      personId: otherOfficialPerson.id,
      status: AccountStatus.ACTIVE,
    },
  });

  const otherDepartmentOfficialIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'Other Department Official Identity',
      userAccountId: otherOfficialAccount.id,
      personId: otherOfficialPerson.id,
    },
  });

  await createPasswordCredentialViaPrisma(
    prisma,
    otherDepartmentOfficialIdentity.id,
    'OtherDeptPass123!',
  );
  await createPasswordAuthenticationMethodViaPrisma(prisma, otherDepartmentOfficialIdentity.id);
  const otherDepartmentOfficialSessionToken = await loginAndGetSessionToken(
    app,
    'other-dept-official@test.gov',
    'OtherDeptPass123!',
  );

  await prisma.identityOfficeholderLink.create({
    data: {
      identityId: otherDepartmentOfficialIdentity.id,
      officeholderId: otherOfficeholder.id,
      status: IdentityOfficeholderLinkStatus.ACTIVE,
    },
  });

  await grantDepartmentManagementAccess(prisma, {
    identityId: otherDepartmentOfficialIdentity.id,
    institutionId: base.institutionId,
    departmentId: otherDepartment.id,
  });

  return {
    ...base,
    departmentHeadSessionToken,
    departmentHeadIdentityId: departmentHeadIdentity.id,
    departmentalDashboardId,
    otherDepartmentId: otherDepartment.id,
    otherDepartmentOfficialSessionToken,
    otherDepartmentOfficialIdentityId: otherDepartmentOfficialIdentity.id,
  };
}
