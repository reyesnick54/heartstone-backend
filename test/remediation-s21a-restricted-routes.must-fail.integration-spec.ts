import { type INestApplication } from '@nestjs/common';
import { GoverningSourceStatus, IdentityType, LegalHoldTargetType } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import {
  authHeader,
  ensureIntegrationAdminSession,
  provisionAuthenticatedIdentity,
} from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  assignTechnicalRole,
  grantAuthorityAssuranceOfficer,
} from './helpers/technical-access.fixture';

const SOME_ID = '00000000-0000-4000-8000-000000000001';

/**
 * S21a: restricted administrative routes are deny-by-default and level-F assurance actions
 * are not available to ordinary platform administrators.
 */
describe('S21a restricted route permissions must-fail (integration)', () => {
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

  async function provisionCitizen(suffix = 'a') {
    return provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: `s21a-citizen-${suffix}@test.gov`,
      password: 'S21aCitizen123!',
    });
  }

  const restrictedRoutes: { method: 'get' | 'post' | 'patch'; path: string }[] = [
    { method: 'get', path: '/api/v1/authority/governing-sources' },
    { method: 'patch', path: `/api/v1/authority/governing-sources/${SOME_ID}/authenticate` },
    { method: 'post', path: '/api/v1/authority-dependencies/external-determinations' },
    { method: 'post', path: '/api/v1/authority-dependencies/institutional-acts' },
    { method: 'post', path: '/api/v1/departments' },
    { method: 'post', path: '/api/v1/offices' },
    { method: 'post', path: '/api/v1/evidence-records/legal-holds' },
    { method: 'post', path: `/api/v1/evidence-records/legal-holds/${SOME_ID}/release` },
    { method: 'post', path: '/api/v1/evidence-records/classifications' },
    { method: 'get', path: `/api/v1/redress/matters/${SOME_ID}` },
    { method: 'post', path: '/api/v1/service-catalog/services' },
    { method: 'patch', path: `/api/v1/forms/versions/${SOME_ID}/publish` },
    { method: 'post', path: `/api/v1/service-packs/${SOME_ID}/accept` },
    { method: 'post', path: '/api/v1/intelligence/consequential-use/live-transitions' },
    { method: 'post', path: '/api/v1/operational-support/integrations/acceptance' },
    { method: 'get', path: `/api/v1/operational-support/financial/invoices/INV-1` },
    { method: 'post', path: '/api/v1/operational-readiness/capabilities/definitions' },
  ];

  it.each(restrictedRoutes)(
    'denies a citizen with no technical role: $method $path',
    async ({ method, path }) => {
      const citizen = await provisionCitizen();
      await request(app.getHttpServer())
        [method](path)
        .set(authHeader(citizen.sessionToken))
        .send({})
        .expect(403);
    },
  );

  const assuranceRoutes: { method: 'post' | 'patch'; path: string }[] = [
    { method: 'patch', path: `/api/v1/authority/governing-sources/${SOME_ID}/authenticate` },
    { method: 'patch', path: `/api/v1/authority/governing-sources/${SOME_ID}/revoke` },
    { method: 'post', path: '/api/v1/authority-dependencies/external-determinations' },
    { method: 'post', path: `/api/v1/evidence-records/legal-holds/${SOME_ID}/release` },
    { method: 'post', path: `/api/v1/service-packs/${SOME_ID}/accept` },
    { method: 'post', path: '/api/v1/operational-support/integrations/acceptance' },
    { method: 'post', path: '/api/v1/intelligence/consequential-use/live-transitions' },
    {
      method: 'post',
      path: `/api/v1/operational-readiness/capabilities/maturity-assessments/${SOME_ID}/decision`,
    },
  ];

  it.each(assuranceRoutes)(
    'denies a level-E platform administrator a level-F assurance action: $method $path',
    async ({ method, path }) => {
      const admin = await ensureIntegrationAdminSession(app, prisma);
      await request(app.getHttpServer())
        [method](path)
        .set(authHeader(admin.sessionToken))
        .send({})
        .expect(403);
    },
  );

  it('records the signed-in assurance officer as the authenticator, not a request field', async () => {
    const admin = await ensureIntegrationAdminSession(app, prisma);
    await grantAuthorityAssuranceOfficer(prisma, admin.identityId);
    const someoneElse = await prisma.identity.create({
      data: { type: IdentityType.INDIVIDUAL, displayName: 'Not the authenticator' },
    });
    const source = await prisma.governingSource.create({
      data: {
        code: 'S21A-SRC',
        title: 'S21a source',
        versionLabel: '1',
        status: GoverningSourceStatus.DRAFT,
        effectiveFrom: new Date('2020-01-01'),
        contentHash: 'a'.repeat(64),
      },
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/authority/governing-sources/${source.id}/authenticate`)
      .set(authHeader(admin.sessionToken))
      .send({ authenticatedByIdentityId: someoneElse.id })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/v1/authority/governing-sources/${source.id}/authenticate`)
      .set(authHeader(admin.sessionToken))
      .send({ verificationReference: 'Official Gazette No. 14 of 2026' })
      .expect(200);

    const stored = await prisma.governingSource.findUniqueOrThrow({ where: { id: source.id } });
    expect(stored.authenticatedByIdentityId).toBe(admin.identityId);

    const ledger = await prisma.governmentAuditLedgerEntry.findFirst({
      where: { resourceType: 'GoverningSource', resourceId: source.id },
    });
    expect(ledger?.actorIdentityId).toBe(admin.identityId);
    expect(ledger?.action).toBe('AUTHENTICATE_GOVERNING_SOURCE');
  });

  it('does not let the officer who placed a legal hold release it', async () => {
    const admin = await ensureIntegrationAdminSession(app, prisma);
    await assignRecordsReleaseRole(admin.identityId);

    const placed = await request(app.getHttpServer())
      .post('/api/v1/evidence-records/legal-holds')
      .set(authHeader(admin.sessionToken))
      .send({
        holdNumber: 'S21A-HOLD-1',
        title: 'Litigation hold',
        authorityReference: 'Court order 2026/77',
        reason: 'Pending litigation',
        effectiveFrom: new Date().toISOString(),
        targets: [{ targetType: LegalHoldTargetType.CASE, targetReference: 'CASE-S21A' }],
      })
      .expect(201);
    const hold = placed.body as { id: string; issuedByIdentityId: string };
    expect(hold.issuedByIdentityId).toBe(admin.identityId);

    await request(app.getHttpServer())
      .post(`/api/v1/evidence-records/legal-holds/${hold.id}/release`)
      .set(authHeader(admin.sessionToken))
      .send({ releaseAuthorityReference: 'Court order 2026/78', releaseReason: 'Settled' })
      .expect(403);

    // A different officer with release permission can release it, and is recorded as releaser.
    const releaser = await provisionCitizen('releaser');
    await assignRecordsReleaseRole(releaser.identityId);
    await request(app.getHttpServer())
      .post(`/api/v1/evidence-records/legal-holds/${hold.id}/release`)
      .set(authHeader(releaser.sessionToken))
      .send({
        releaseAuthorityReference: 'Court order 2026/78',
        releaseReason: 'Settled',
        actorPermissions: ['records:legal-hold:release'],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/v1/evidence-records/legal-holds/${hold.id}/release`)
      .set(authHeader(releaser.sessionToken))
      .send({ releaseAuthorityReference: 'Court order 2026/78', releaseReason: 'Settled' })
      .expect(201);

    const release = await prisma.legalHoldReleaseRecord.findFirstOrThrow({
      where: { legalHoldId: hold.id },
    });
    expect(release.releasedByIdentityId).toBe(releaser.identityId);
  });

  /** Level-F role carrying legal-hold release (records officers are configured per institution). */
  async function assignRecordsReleaseRole(identityId: string) {
    await prisma.technicalRole.upsert({
      where: { code: 's21a-records-release-officer' },
      create: {
        code: 's21a-records-release-officer',
        name: 'S21a records release officer',
        isSystemRole: false,
        permissions: {
          create: [
            {
              permission: { connect: { code: 'records:legal-hold:release' } },
            },
            {
              permission: { connect: { code: 'records:legal-hold:place' } },
            },
          ],
        },
      },
      update: {},
    });
    await assignTechnicalRole(prisma, {
      identityId,
      roleCode: 's21a-records-release-officer',
    });
  }
});
