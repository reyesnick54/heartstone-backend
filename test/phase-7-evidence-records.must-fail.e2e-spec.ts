import { type INestApplication } from '@nestjs/common';
import { DocumentClassification, EvidencePurposeType, IdentityType } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { asLoginResponseBody } from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase7Fixture } from './helpers/phase-7-test-fixtures';

describe('Phase 7 must-fail invariants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. IDOR: applicant cannot access unrelated master file', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    const otherPerson = await prisma.person.create({
      data: { givenName: 'Other', familyName: 'Applicant' },
    });
    const otherAccount = await prisma.userAccount.create({
      data: { loginIdentifier: 'p7-other@test.gov', personId: otherPerson.id, status: 'ACTIVE' },
    });
    const otherIdentity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: 'Other Applicant',
        userAccountId: otherAccount.id,
        personId: otherPerson.id,
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({ identityId: otherIdentity.id, type: 'PASSWORD', password: 'Other123!' });

    await request(app.getHttpServer())
      .post('/api/v1/identity/authentication-methods')
      .send({ identityId: otherIdentity.id, type: 'PASSWORD' });

    const login = asLoginResponseBody(
      (
        await request(app.getHttpServer())
          .post('/api/v1/identity/auth/login')
          .send({ loginIdentifier: 'p7-other@test.gov', password: 'Other123!' })
      ).body,
    );

    await request(app.getHttpServer())
      .get(`/api/v1/master-files/${fixture.masterFileId}`)
      .set('Authorization', `Bearer ${login.sessionToken}`)
      .expect(403);
  });

  it('2. IDOR: applicant cannot access unrelated evidence record', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    const otherPerson = await prisma.person.create({
      data: { givenName: 'Other2', familyName: 'User' },
    });
    const otherAccount = await prisma.userAccount.create({
      data: { loginIdentifier: 'p7-other2@test.gov', personId: otherPerson.id, status: 'ACTIVE' },
    });
    const otherIdentity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: 'Other User',
        userAccountId: otherAccount.id,
        personId: otherPerson.id,
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({ identityId: otherIdentity.id, type: 'PASSWORD', password: 'Other123!' });
    await request(app.getHttpServer())
      .post('/api/v1/identity/authentication-methods')
      .send({ identityId: otherIdentity.id, type: 'PASSWORD' });

    const login = asLoginResponseBody(
      (
        await request(app.getHttpServer())
          .post('/api/v1/identity/auth/login')
          .send({ loginIdentifier: 'p7-other2@test.gov', password: 'Other123!' })
      ).body,
    );

    await request(app.getHttpServer())
      .get(`/api/v1/evidence/${fixture.evidenceId}`)
      .set('Authorization', `Bearer ${login.sessionToken}`)
      .expect(403);
  });

  it('3. mass assignment: client cannot set verified=true on evidence registration', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    await request(app.getHttpServer())
      .post(`/api/v1/master-files/${fixture.masterFileId}/evidence`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        title: 'Tampered Evidence',
        verified: true,
        status: 'VERIFIED',
      })
      .expect(403);
  });

  it('4. mass assignment: client cannot set accepted status on evidence registration', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    await request(app.getHttpServer())
      .post(`/api/v1/master-files/${fixture.masterFileId}/evidence`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        title: 'Tampered Evidence',
        status: 'ACCEPTED',
        accepted: true,
      })
      .expect(403);
  });

  it('5. mass assignment: client cannot set contentHash on document registration', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    await request(app.getHttpServer())
      .post(`/api/v1/master-files/${fixture.masterFileId}/documents`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        title: 'Tampered Document',
        content: 'content',
        contentHash: 'client-controlled-hash',
      })
      .expect(403);
  });

  it('6. mass assignment: client cannot set privileged classification', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    await request(app.getHttpServer())
      .post(`/api/v1/master-files/${fixture.masterFileId}/evidence`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        title: 'Privileged Evidence',
        classification: DocumentClassification.LEGALLY_PRIVILEGED,
      })
      .expect(403);
  });

  it('7. applicant cannot verify evidence', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    await request(app.getHttpServer())
      .post(`/api/v1/evidence/${fixture.evidenceId}/verify`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({ findings: 'Self-verified' })
      .expect(403);
  });

  it('8. applicant cannot accept evidence for purpose', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    await request(app.getHttpServer())
      .post(`/api/v1/evidence/${fixture.evidenceId}/accept`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({ purposeType: EvidencePurposeType.DECISION_SUPPORT })
      .expect(403);
  });

  it('9. evidence cannot be accepted before verification', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    await request(app.getHttpServer())
      .post(`/api/v1/evidence/${fixture.evidenceId}/accept`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        purposeType: EvidencePurposeType.DECISION_SUPPORT,
        officeholderId: fixture.officialOfficeholderId,
      })
      .expect(400);
  });

  it('10. client cannot set sealedAt on packet creation', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    await request(app.getHttpServer())
      .post(`/api/v1/master-files/${fixture.masterFileId}/packets`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        title: 'Tampered Packet',
        sealedAt: new Date().toISOString(),
        status: 'SEALED',
      })
      .expect(403);
  });

  it('11. non-accepted evidence cannot enter decision-support packet', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    const packet = (
      await request(app.getHttpServer())
        .post(`/api/v1/master-files/${fixture.masterFileId}/packets`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({ title: 'Decision Packet' })
        .expect(201)
    ).body as { id: string };

    await request(app.getHttpServer())
      .post(`/api/v1/packets/${packet.id}/items`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        evidenceRecordId: fixture.evidenceId,
        sequenceNumber: 1,
        purposeType: EvidencePurposeType.DECISION_SUPPORT,
      })
      .expect(400);
  });

  it('12. sealed packet cannot be modified', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    await request(app.getHttpServer())
      .post(`/api/v1/evidence/${fixture.evidenceId}/verify`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({ officeholderId: fixture.officialOfficeholderId })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/evidence/${fixture.evidenceId}/accept`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        purposeType: EvidencePurposeType.DECISION_SUPPORT,
        officeholderId: fixture.officialOfficeholderId,
      })
      .expect(201);

    const packet = (
      await request(app.getHttpServer())
        .post(`/api/v1/master-files/${fixture.masterFileId}/packets`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({ title: 'Sealed Packet' })
        .expect(201)
    ).body as { id: string };

    await request(app.getHttpServer())
      .post(`/api/v1/packets/${packet.id}/items`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        evidenceRecordId: fixture.evidenceId,
        sequenceNumber: 1,
        purposeType: EvidencePurposeType.DECISION_SUPPORT,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/packets/${packet.id}/freeze`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/packets/${packet.id}/items`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        evidenceRecordId: fixture.evidenceId,
        sequenceNumber: 2,
      })
      .expect(403);
  });

  it('13. applicant cannot access legal hold endpoint records', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    const hold = (
      await request(app.getHttpServer())
        .post('/api/v1/legal-holds')
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          title: 'Litigation Hold',
          reason: 'Court order',
          targetType: 'EVIDENCE',
          evidenceRecordId: fixture.evidenceId,
        })
        .expect(201)
    ).body as { id: string };

    await request(app.getHttpServer())
      .get(`/api/v1/master-files/${fixture.masterFileId}`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const { EvidenceRecordsBoundaryService } = await import(
      '../src/evidence-records/common/evidence-records-boundary.service'
    );
    const boundary = app.get(EvidenceRecordsBoundaryService);
    await expect(boundary.assertApplicantCannotAccessLegalHold(hold.id)).rejects.toThrow(/legal hold/i);
  });

  it('14. Phase 7 cannot issue license/permit/certificate tables', async () => {
    const tables = ['issued_licenses', 'issued_permits', 'issued_certificates', 'government_decisions'];
    for (const table of tables) {
      const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = '${table}'`,
      );
      expect(Number(result[0]?.count ?? 0)).toBe(0);
    }
  });

  it('15. record correction cannot be applied without approval', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    const correction = (
      await request(app.getHttpServer())
        .post('/api/v1/record-corrections')
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          targetRecordType: 'EvidenceRecord',
          targetRecordId: fixture.evidenceId,
          reason: 'Unauthorized apply attempt',
          correctionPayload: { title: 'Tampered' },
        })
        .expect(201)
    ).body as { id: string };

    await request(app.getHttpServer())
      .post(`/api/v1/record-corrections/${correction.id}/apply`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(403);
  });
});
