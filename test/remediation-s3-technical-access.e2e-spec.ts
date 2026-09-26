import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  InstitutionType,
  JurisdictionType,
  TechnicalAccessScopeType,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { AuthorityBoundaryService } from '../src/identity/common/authority-boundary.service';
import { ACCESS_LEVEL_PERMISSIONS } from '../src/technical-access/config/access-level-policy.config';
import { TechnicalRoleCodes } from '../src/technical-access/config/technical-access-bootstrap.config';
import { PermissionCodes } from '../src/technical-access/constants/permission-codes.constants';
import {
  authHeader,
  createPasswordAuthenticationMethodViaPrisma,
  ensureIntegrationAdminSession,
  loginAndGetSessionToken,
  provisionIdentityViaPrisma,
} from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  assignTechnicalRole,
  grantIdentityPlatformAdministrator,
} from './helpers/technical-access.fixture';

describe('Remediation S3 technical access (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects anonymous administrative identity provisioning', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .send({ loginIdentifier: 'x@test.gov', status: AccountStatus.ACTIVE })
      .expect(401);
  });

  it('rejects authenticated user without permission on administrative routes', async () => {
    const citizen = await provisionIdentityViaPrisma(prisma, {
      loginIdentifier: 'citizen@test.gov',
      password: 'CitizenPass123!',
    });
    await createPasswordAuthenticationMethodViaPrisma(prisma, citizen.identityId);
    const token = await loginAndGetSessionToken(app, citizen.loginIdentifier, citizen.password);

    await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .set(authHeader(token))
      .send({ loginIdentifier: 'new@test.gov', status: AccountStatus.ACTIVE })
      .expect(403);
  });

  it('allows identity provisioning with correct platform administrator permission', async () => {
    const admin = await ensureIntegrationAdminSession(app, prisma);

    await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .set(authHeader(admin.sessionToken))
      .send({ loginIdentifier: 'provisioned@test.gov', status: AccountStatus.ACTIVE })
      .expect(201);
  });

  it('rejects institution update when assignment scope does not match', async () => {
    const admin = await ensureIntegrationAdminSession(app, prisma);

    const jurisdictionRes = await request(app.getHttpServer())
      .post('/api/v1/jurisdictions')
      .set(authHeader(admin.sessionToken))
      .send({ code: 'ABSEZ', name: 'ABSEZ', type: JurisdictionType.NATIONAL })
      .expect(201);

    const jurisdictionId = (jurisdictionRes.body as { id: string }).id;

    const instARes = await request(app.getHttpServer())
      .post('/api/v1/institutions')
      .set(authHeader(admin.sessionToken))
      .send({
        jurisdictionId,
        code: 'INST-A',
        name: 'Institution A',
        type: InstitutionType.MINISTRY,
      })
      .expect(201);

    const instBRes = await request(app.getHttpServer())
      .post('/api/v1/institutions')
      .set(authHeader(admin.sessionToken))
      .send({
        jurisdictionId,
        code: 'INST-B',
        name: 'Institution B',
        type: InstitutionType.MINISTRY,
      })
      .expect(201);

    const institutionAId = (instARes.body as { id: string }).id;
    const institutionBId = (instBRes.body as { id: string }).id;

    const scopedOperator = await provisionIdentityViaPrisma(prisma, {
      loginIdentifier: 'scoped.operator@test.gov',
      password: 'ScopedOp123!',
    });
    await createPasswordAuthenticationMethodViaPrisma(prisma, scopedOperator.identityId);
    await assignTechnicalRole(prisma, {
      identityId: scopedOperator.identityId,
      roleCode: TechnicalRoleCodes.INSTITUTION_SCOPED_OPERATOR,
      scopeType: TechnicalAccessScopeType.INSTITUTION,
      institutionId: institutionAId,
    });

    const scopedToken = await loginAndGetSessionToken(
      app,
      scopedOperator.loginIdentifier,
      scopedOperator.password,
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/institutions/${institutionAId}`)
      .set(authHeader(scopedToken))
      .send({ name: 'Institution A Updated' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/institutions/${institutionBId}`)
      .set(authHeader(scopedToken))
      .send({ name: 'Institution B Updated' })
      .expect(403);
  });

  it('rejects suspended account at session validation', async () => {
    const user = await provisionIdentityViaPrisma(prisma, {
      loginIdentifier: 'suspend.me@test.gov',
      password: 'SuspendMe123!',
    });
    await createPasswordAuthenticationMethodViaPrisma(prisma, user.identityId);
    await grantIdentityPlatformAdministrator(prisma, user.identityId);

    const admin = await ensureIntegrationAdminSession(app, prisma);
    await request(app.getHttpServer())
      .patch(`/api/v1/identity/user-accounts/${user.userAccountId}/suspend`)
      .set(authHeader(admin.sessionToken))
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/identity/auth/login')
      .send({ loginIdentifier: user.loginIdentifier, password: user.password })
      .expect(401);
  });

  it('does not confer government authority from technical permissions alone', async () => {
    const admin = await ensureIntegrationAdminSession(app, prisma);
    const boundary = app.get(AuthorityBoundaryService);

    const resolution = boundary.resolveGovernmentAuthority({
      identityId: admin.identityId,
      userAccountId: admin.userAccountId,
    });

    expect(resolution).toBeNull();
  });

  it('maps access level E to configured permissions including identity provisioning', () => {
    expect(ACCESS_LEVEL_PERMISSIONS.E).toContain(PermissionCodes.IDENTITY_USER_ACCOUNT_CREATE);
    expect(ACCESS_LEVEL_PERMISSIONS.F).toContain(PermissionCodes.AUDIT_READ);
    expect(ACCESS_LEVEL_PERMISSIONS.A).toHaveLength(0);
  });
});
