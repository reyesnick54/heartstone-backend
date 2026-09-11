import { type INestApplication } from '@nestjs/common';
import {
  IdentityOfficeholderLinkStatus,
  IdentityOfficeholderVerificationMethod,
  UserAccountKind,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetGovernmentData } from './helpers/integration-app';

interface OfficeholderLinkBody {
  id: string;
  status: IdentityOfficeholderLinkStatus;
  officeholderId: string;
  isCurrent: boolean;
}

interface LoginBody {
  token: string;
  principal: {
    verifiedOfficeholderLinkId?: string;
    verifiedOfficeholderId?: string;
  };
}

describe('Identity officeholder linkage (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await resetGovernmentData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createOfficeholder(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/officeholders')
      .send({
        code: 'AG-MIN-001',
        name: 'Minister of Finance',
      })
      .expect(201);

    const body = response.body as { id: string };
    return body.id;
  }

  async function createUser(
    username: string,
    password: string,
    kind: UserAccountKind = UserAccountKind.STANDARD,
  ): Promise<LoginBody> {
    await request(app.getHttpServer())
      .post('/api/v1/identity/accounts')
      .send({ username, password, kind, displayName: username })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/identity/auth/login')
      .send({ username, password })
      .expect(200);

    return loginResponse.body as LoginBody;
  }

  it('supports request, admin activation, principal exposure, and lifecycle controls', async () => {
    const officeholderId = await createOfficeholder();
    const user = await createUser('citizen1', 'password123');
    const admin = await createUser(
      'identity-admin',
      'password123',
      UserAccountKind.IDENTITY_ADMINISTRATOR,
    );

    const requestResponse = await request(app.getHttpServer())
      .post('/api/v1/identity/officeholder-links/request')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ officeholderId, evidenceReference: 'case-42' })
      .expect(201);

    const requestedLink = requestResponse.body as OfficeholderLinkBody;

    expect(requestedLink).toMatchObject({
      status: IdentityOfficeholderLinkStatus.PENDING,
      officeholderId,
      isCurrent: false,
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/identity/officeholder-links/${requestedLink.id}/activate`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        verificationMethod: IdentityOfficeholderVerificationMethod.ADMIN_VERIFICATION,
      })
      .expect(403);

    const activateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/identity/officeholder-links/${requestedLink.id}/activate`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        verificationMethod: IdentityOfficeholderVerificationMethod.ADMIN_VERIFICATION,
      })
      .expect(200);

    const activatedLink = activateResponse.body as OfficeholderLinkBody;

    expect(activatedLink).toMatchObject({
      status: IdentityOfficeholderLinkStatus.VERIFIED,
      isCurrent: true,
    });

    const meResponse = await request(app.getHttpServer())
      .get('/api/v1/identity/auth/me')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(meResponse.body).toMatchObject({
      verifiedOfficeholderLinkId: requestedLink.id,
      verifiedOfficeholderId: officeholderId,
    });
    expect(meResponse.body).not.toHaveProperty('canApprove');

    await request(app.getHttpServer())
      .patch(`/api/v1/identity/officeholder-links/${requestedLink.id}/suspend`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/identity/officeholder-links/current')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(404);

    const auditCount = await prisma.securityAuditEvent.count({
      where: {
        subjectId: requestedLink.id,
      },
    });

    expect(auditCount).toBeGreaterThanOrEqual(3);
  });
});
