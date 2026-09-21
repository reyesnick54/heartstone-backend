import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AppointmentStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  PlatformAdministrativeAccessScope,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import { PLATFORM_ADMINISTRATIVE_PERMISSION_CODE } from '../../src/experience/platform-admin/platform-admin.constants';
import {
  createPasswordAuthenticationMethodViaPrisma,
  createPasswordCredentialViaPrisma,
  loginAndGetSessionToken,
} from './identity-provisioning.fixture';

export interface PlatformAdminFixtureContext {
  institutionId: string;
  departmentId: string;
  platformAdminIdentityId: string;
  platformAdminSessionToken: string;
  citizenIdentityId: string;
  citizenSessionToken: string;
  officialIdentityId: string;
  officialSessionToken: string;
  policyId: string;
}

export async function seedPlatformAdminFixture(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<PlatformAdminFixtureContext> {
  const jurisdiction = await prisma.jurisdiction.create({
    data: { code: 'PA-JUR', name: 'Platform Admin Jurisdiction', type: 'NATIONAL' },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: 'PA-INST',
      name: 'Platform Admin Institution',
      type: 'MINISTRY',
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: 'PA-DEPT',
      name: 'Platform Admin Department',
    },
  });

  const createIdentityWithAccount = async (name: string, login: string) => {
    const person = await prisma.person.create({
      data: { givenName: name, familyName: 'PlatformAdmin' },
    });
    const account = await prisma.userAccount.create({
      data: {
        loginIdentifier: login,
        personId: person.id,
        status: AccountStatus.ACTIVE,
      },
    });
    return prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: name,
        userAccountId: account.id,
        personId: person.id,
      },
    });
  };

  const platformAdmin = await createIdentityWithAccount(
    'Platform Admin',
    'platform-admin@test.local',
  );
  const citizen = await createIdentityWithAccount('Citizen User', 'citizen@test.local');
  const official = await createIdentityWithAccount('Government Official', 'official@test.local');

  const password = 'PlatformAdmin123!';
  for (const identity of [platformAdmin, citizen, official]) {
    await createPasswordCredentialViaPrisma(prisma, identity.id, password);
    await createPasswordAuthenticationMethodViaPrisma(prisma, identity.id);
  }

  const platformAdminSessionToken = await loginAndGetSessionToken(
    app,
    'platform-admin@test.local',
    password,
  );
  const citizenSessionToken = await loginAndGetSessionToken(app, 'citizen@test.local', password);
  const officialSessionToken = await loginAndGetSessionToken(app, 'official@test.local', password);

  const office = await prisma.office.create({
    data: { departmentId: department.id, code: 'PA-OFF', name: 'Official Office' },
  });
  const officeholder = await prisma.officeholder.create({
    data: { code: 'PA-OH', name: 'Official Officeholder' },
  });
  await prisma.appointment.create({
    data: {
      officeId: office.id,
      officeholderId: officeholder.id,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });
  await prisma.identityOfficeholderLink.create({
    data: {
      identityId: official.id,
      officeholderId: officeholder.id,
      status: IdentityOfficeholderLinkStatus.ACTIVE,
    },
  });

  const policy = await prisma.platformAdministrativeAccessPolicy.create({
    data: {
      identityId: platformAdmin.id,
      permissionCode: PLATFORM_ADMINISTRATIVE_PERMISSION_CODE,
      scope: PlatformAdministrativeAccessScope.PLATFORM_WIDE,
      substantiveAccessDenied: true,
    },
  });

  return {
    institutionId: institution.id,
    departmentId: department.id,
    platformAdminIdentityId: platformAdmin.id,
    platformAdminSessionToken,
    citizenIdentityId: citizen.id,
    citizenSessionToken,
    officialIdentityId: official.id,
    officialSessionToken,
    policyId: policy.id,
  };
}

export async function grantPlatformAdminPolicy(
  prisma: PrismaService,
  identityId: string,
): Promise<string> {
  const policy = await prisma.platformAdministrativeAccessPolicy.create({
    data: {
      identityId,
      permissionCode: PLATFORM_ADMINISTRATIVE_PERMISSION_CODE,
      scope: PlatformAdministrativeAccessScope.PLATFORM_WIDE,
      substantiveAccessDenied: true,
    },
  });
  return policy.id;
}
