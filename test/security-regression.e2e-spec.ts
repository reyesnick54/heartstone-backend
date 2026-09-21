import * as fs from 'node:fs';
import * as path from 'node:path';

import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  CredentialStatus,
  IdentityType,
  RepresentativeAuthorityStatus,
  SessionStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { CaseFoundationService } from '../src/application-processing/cases/case-foundation.service';
import { type PrismaService } from '../src/database/prisma.service';

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../security/protected-route-manifest.json'), 'utf8'),
) as {
  routeCount: number;
  summary: Record<string, number>;
  routes: { path: string; isPublic: boolean; authenticationRequired: boolean }[];
};
import {
  seedApplicationProcessingFixture,
  seedCaseFromApplication,
} from './helpers/application-processing-test-fixtures';
import {
  associateDocumentToApplication,
  seedEvidenceRecordsFixture,
  uploadTestDocument,
} from './helpers/evidence-records-test-fixtures';
import {
  authHeader,
  createPasswordAuthenticationMethodViaPrisma,
  createPasswordCredentialViaPrisma,
  loginAndGetSessionToken,
  provisionAuthenticatedIdentity,
  provisionIdentityViaPrisma,
} from './helpers/identity-provisioning.fixture';
import { asProtectedProfileBody } from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Security regression suite (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let foundation: CaseFoundationService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    foundation = app.get(CaseFoundationService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('route manifest integrity', () => {
    it('documents every controller route with authentication expectations', () => {
      expect(manifest.routeCount).toBeGreaterThan(200);
      expect(manifest.summary.public).toBeGreaterThan(0);
      expect(manifest.summary.restrictedAdministrative).toBeGreaterThan(0);

      const publicRoutes = manifest.routes.filter((route) => route.isPublic);
      for (const route of publicRoutes) {
        expect(route.authenticationRequired).toBe(false);
      }

      const protectedRoutes = manifest.routes.filter((route) => !route.isPublic);
      for (const route of protectedRoutes) {
        expect(route.authenticationRequired).toBe(true);
      }
    });

    it('preserves explicitly public discovery and verification endpoints', () => {
      const paths = manifest.routes.filter((route) => route.isPublic).map((route) => route.path);

      expect(paths).toEqual(
        expect.arrayContaining([
          '/public/services',
          '/public/service-families',
          '/public/instruments/verify/:verificationCode',
          '/identity/auth/login',
          '/health',
          '/ready',
          '/version',
        ]),
      );
    });
  });

  describe('unauthenticated access failures', () => {
    it('rejects anonymous administrative configuration calls', async () => {
      await request(app.getHttpServer()).get('/api/v1/institutions').expect(401);
      await request(app.getHttpServer()).post('/api/v1/identity/persons').send({}).expect(401);
      await request(app.getHttpServer()).post('/api/v1/forms/definitions').send({}).expect(401);
      await request(app.getHttpServer()).get('/api/v1/intelligence/boundary').expect(401);
      await request(app.getHttpServer()).get('/api/v1/redress/boundary').expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/evidence-records/classifications')
        .send({})
        .expect(401);
    });

    it('rejects anonymous institutional and self-service reads', async () => {
      await request(app.getHttpServer()).get('/api/v1/identity/me').expect(401);
      await request(app.getHttpServer())
        .get('/api/v1/applications/00000000-0000-0000-0000-000000000001')
        .expect(401);
      await request(app.getHttpServer())
        .get('/api/v1/compliance/status/dashboards/holder/00000000-0000-0000-0000-000000000001')
        .expect(401);
    });

    it('allows public service discovery without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/public/services').expect(200);
      await request(app.getHttpServer()).get('/api/v1/public/service-families').expect(200);
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    });
  });

  describe('forged identity failures', () => {
    it('rejects forged decisionMakerIdentityId on decision execution', async () => {
      const actor = await provisionAuthenticatedIdentity(app, prisma, {
        loginIdentifier: 'decision-actor@test.gov',
        password: 'DecisionActor123!',
      });
      const other = await provisionIdentityViaPrisma(prisma, {
        loginIdentifier: 'other-decision@test.gov',
        password: 'OtherDecision123!',
      });

      await request(app.getHttpServer())
        .post('/api/v1/decisions/execute')
        .set(authHeader(actor.sessionToken))
        .send({
          caseId: '00000000-0000-0000-0000-000000000001',
          decisionTypeVersionId: '00000000-0000-0000-0000-000000000002',
          decisionMakerIdentityId: other.identityId,
          explicitIntentConfirmed: true,
        })
        .expect((response) => {
          expect([400, 403]).toContain(response.status);
        });
    });
  });

  describe('cross-citizen and cross-institution IDOR', () => {
    it('prevents cross-citizen case reads', async () => {
      const fixture = await seedApplicationProcessingFixture(app, prisma);
      const { caseId } = await seedCaseFromApplication(prisma, foundation, fixture);
      const intruder = await provisionAuthenticatedIdentity(app, prisma, {
        loginIdentifier: 'intruder-citizen@test.gov',
        password: 'IntruderCitizen123!',
      });

      await request(app.getHttpServer())
        .get(`/api/v1/cases/${caseId}`)
        .set(authHeader(intruder.sessionToken))
        .expect(403);
    });

    it('prevents cross-citizen document metadata reads', async () => {
      const fixture = await seedEvidenceRecordsFixture(app, prisma);
      const content = Buffer.from('restricted applicant document');
      const uploaded = await uploadTestDocument(app, fixture.applicantSessionToken, content);

      await request(app.getHttpServer())
        .get(`/api/v1/documents/${uploaded.recordId}`)
        .set(authHeader(fixture.otherApplicantSessionToken))
        .expect(403);
    });

    it('prevents applicant access to official case dashboard', async () => {
      const fixture = await seedApplicationProcessingFixture(app, prisma);
      const { caseId } = await seedCaseFromApplication(prisma, foundation, fixture);

      await request(app.getHttpServer())
        .get(`/api/v1/cases/${caseId}/dashboard`)
        .set(authHeader(fixture.applicantSessionToken))
        .expect(403);
    });

    it('prevents cross-institution official timeline access', async () => {
      const fixture = await seedApplicationProcessingFixture(app, prisma);
      const { caseId } = await seedCaseFromApplication(prisma, foundation, fixture);
      const outsider = await provisionAuthenticatedIdentity(app, prisma, {
        loginIdentifier: 'outside-institution@test.gov',
        password: 'OutsideInstitution123!',
      });

      await request(app.getHttpServer())
        .get(`/api/v1/cases/${caseId}/timeline`)
        .set(authHeader(outsider.sessionToken))
        .expect(403);
    });
  });

  describe('session and account lifecycle', () => {
    it('rejects suspended accounts at login', async () => {
      const identity = await provisionIdentityViaPrisma(prisma, {
        loginIdentifier: 'suspended-user@test.gov',
        password: 'SuspendedUser123!',
      });
      await createPasswordAuthenticationMethodViaPrisma(prisma, identity.identityId);

      await prisma.userAccount.update({
        where: { id: identity.userAccountId },
        data: { status: AccountStatus.SUSPENDED },
      });

      await request(app.getHttpServer())
        .post('/api/v1/identity/auth/login')
        .send({ loginIdentifier: identity.loginIdentifier, password: identity.password })
        .expect(401);
    });

    it('rejects revoked sessions on protected routes', async () => {
      const actor = await provisionAuthenticatedIdentity(app, prisma, {
        loginIdentifier: 'revoked-session@test.gov',
        password: 'RevokedSession123!',
      });

      await prisma.session.updateMany({
        where: { identityId: actor.identityId },
        data: { status: SessionStatus.REVOKED, revokedAt: new Date() },
      });

      await request(app.getHttpServer())
        .get('/api/v1/identity/me')
        .set(authHeader(actor.sessionToken))
        .expect(401);
    });

    it('rejects revoked credentials at login', async () => {
      const identity = await provisionIdentityViaPrisma(prisma, {
        loginIdentifier: 'revoked-cred@test.gov',
        password: 'RevokedCred123!',
      });
      await createPasswordAuthenticationMethodViaPrisma(prisma, identity.identityId);

      await prisma.credential.updateMany({
        where: { identityId: identity.identityId },
        data: { status: CredentialStatus.REVOKED, revokedAt: new Date() },
      });

      await request(app.getHttpServer())
        .post('/api/v1/identity/auth/login')
        .send({ loginIdentifier: identity.loginIdentifier, password: identity.password })
        .expect(401);
    });
  });

  describe('authority and access invariants', () => {
    it('does not confer government authority from authentication alone', async () => {
      const actor = await provisionAuthenticatedIdentity(app, prisma, {
        loginIdentifier: 'no-authority@test.gov',
        password: 'NoAuthority123!',
      });

      const profile = await request(app.getHttpServer())
        .get('/api/v1/identity/me')
        .set(authHeader(actor.sessionToken))
        .expect(200);

      expect(asProtectedProfileBody(profile.body).hasGovernmentAuthority).toBe(false);
    });

    it('rejects unauthenticated issuance attempts', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/decisions-issuance/issue')
        .send({
          caseId: '00000000-0000-0000-0000-000000000001',
          instrumentTypeCode: 'TEST',
        })
        .expect(401);
    });

    it('prevents client-controlled official document download bypass', async () => {
      const fixture = await seedEvidenceRecordsFixture(app, prisma);
      const content = Buffer.from('applicant-only download');
      const uploaded = await uploadTestDocument(app, fixture.applicantSessionToken, content);

      await request(app.getHttpServer())
        .get(`/api/v1/documents/versions/${uploaded.versionId}/download`)
        .set(authHeader(fixture.otherApplicantSessionToken))
        .expect(403);
    });
  });

  describe('representative authority and service identity boundaries', () => {
    it('rejects revoked representative authority for application actions', async () => {
      const fixture = await seedApplicationProcessingFixture(app, prisma);
      const organization = await prisma.organization.create({
        data: { code: 'REVOKED-ORG-001', name: 'Revoked Rep Org' },
      });

      const representative = await provisionAuthenticatedIdentity(app, prisma, {
        loginIdentifier: 'revoked-rep@test.gov',
        password: 'RevokedRep123!',
      });

      const representativeAuthority = await prisma.representativeAuthority.create({
        data: {
          identityId: representative.identityId,
          organizationId: organization.id,
          scopeDescription: 'Revoked representative scope',
          status: RepresentativeAuthorityStatus.REVOKED,
          effectiveFrom: new Date('2020-01-01'),
          effectiveUntil: new Date(),
        },
      });

      await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set(authHeader(representative.sessionToken))
        .send({
          applicantCategory: 'AUTHORIZED_REPRESENTATIVE',
          organizationId: organization.id,
          representativeAuthorityId: representativeAuthority.id,
          governmentServiceId: fixture.governmentServiceId,
          governmentServiceVersionId: fixture.governmentServiceVersionId,
          formDefinitionId: fixture.formDefinitionId,
          formVersionId: fixture.formVersionId,
          configurationFingerprint: fixture.configurationFingerprint,
        })
        .expect((response) => {
          expect([400, 403]).toContain(response.status);
        });
    });

    it('rejects service identities from master administrative file access', async () => {
      const fixture = await seedApplicationProcessingFixture(app, prisma);
      const { caseId } = await seedCaseFromApplication(prisma, foundation, fixture);

      const account = await prisma.userAccount.create({
        data: {
          loginIdentifier: 'service-bot@test.gov',
          status: AccountStatus.ACTIVE,
        },
      });
      const serviceIdentity = await prisma.identity.create({
        data: {
          type: IdentityType.SERVICE,
          displayName: 'Integration Bot',
          userAccountId: account.id,
        },
      });
      await createPasswordCredentialViaPrisma(prisma, serviceIdentity.id, 'ServiceIdentity123!');
      await createPasswordAuthenticationMethodViaPrisma(prisma, serviceIdentity.id);
      const serviceToken = await loginAndGetSessionToken(
        app,
        'service-bot@test.gov',
        'ServiceIdentity123!',
      );

      await request(app.getHttpServer())
        .get(`/api/v1/records/master-files/by-case/${caseId}`)
        .set(authHeader(serviceToken))
        .expect(403);
    });
  });

  describe('restricted evidence and records access', () => {
    it('blocks cross-applicant restricted document download', async () => {
      const fixture = await seedEvidenceRecordsFixture(app, prisma);
      const content = Buffer.from('restricted content');
      const uploaded = await uploadTestDocument(
        app,
        fixture.applicantSessionToken,
        content,
        'restricted.pdf',
        {
          securityClassification: 'RESTRICTED',
        },
      );

      await request(app.getHttpServer())
        .get(`/api/v1/documents/versions/${uploaded.versionId}/download`)
        .set(authHeader(fixture.applicantSessionToken))
        .expect(403);
    });

    it('blocks unrelated applicant document association listing', async () => {
      const processingFixture = await seedApplicationProcessingFixture(app, prisma);
      const evidenceFixture = await seedEvidenceRecordsFixture(app, prisma);
      const content = Buffer.from('association restricted');
      const uploaded = await uploadTestDocument(
        app,
        evidenceFixture.applicantSessionToken,
        content,
      );

      const application = await foundation.createApplication({
        applicationNumber: 'SEC-APP-001',
        applicantIdentityId: evidenceFixture.applicantIdentityId,
        governmentServiceId: processingFixture.governmentServiceId,
        governmentServiceVersionId: processingFixture.governmentServiceVersionId,
        formDefinitionId: processingFixture.formDefinitionId,
        formVersionId: processingFixture.formVersionId,
        configurationFingerprint: processingFixture.configurationFingerprint,
      });

      await associateDocumentToApplication(
        app,
        evidenceFixture.applicantSessionToken,
        uploaded.versionId,
        application.id,
      );

      await request(app.getHttpServer())
        .get('/api/v1/documents/associations')
        .query({ targetType: 'APPLICATION', targetId: application.id })
        .set(authHeader(evidenceFixture.otherApplicantSessionToken))
        .expect((response) => {
          expect([400, 403]).toContain(response.status);
        });
    });
  });
});
