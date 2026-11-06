import { type INestApplication } from '@nestjs/common';
import {
  CaseStatus,
  DocumentAuthenticityStatus,
  DocumentSourceType,
  GovernmentDecisionStatus,
  HealthcareConsentType,
  RecordCorrectionStatus,
  RedressRouteVersionStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import {
  type CitizenExperienceFixtureContext,
  createOtherCitizenSession,
  seedCitizenExperienceFixture,
} from './helpers/citizen-experience-test-fixtures';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

const BASE = '/api/v1/experience/citizen';

/** Rows these tests create that the shared reset helpers do not remove. */
async function removeSelfServiceArtifacts(prisma: PrismaService): Promise<void> {
  await prisma.redressMatter.deleteMany();
  await prisma.decisionReviewReference.deleteMany();
  await prisma.redressRouteVersion.deleteMany();
  await prisma.governmentServiceRedressRoute.deleteMany();
  await prisma.recordCorrection.deleteMany();
}

describe('Citizen self-service routes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fixture: CitizenExperienceFixtureContext;

  const asCitizen = (token: string) => ({ Authorization: `Bearer ${token}` });
  const pdf = (text: string) => ({
    title: 'Proof of address',
    documentType: 'PROOF_OF_ADDRESS',
    originalFilename: 'address.pdf',
    contentType: 'application/pdf',
    contentBase64: Buffer.from(`%PDF-1.7 ${text}`).toString('base64'),
  });

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await removeSelfServiceArtifacts(prisma);
    await resetAllTestData(prisma);
    fixture = await seedCitizenExperienceFixture(app, prisma);
  });

  afterEach(async () => {
    await removeSelfServiceArtifacts(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('application document upload', () => {
    it('refuses uploads while the case is not waiting for the applicant', async () => {
      await prisma.case.update({
        where: { id: fixture.caseId },
        data: { status: CaseStatus.SUBSTANTIVE_REVIEW },
      });

      const response = await request(app.getHttpServer())
        .post(`${BASE}/applications/${fixture.applicationId}/documents`)
        .set(asCitizen(fixture.applicantSessionToken))
        .send(pdf('closed'))
        .expect(409);

      expect((response.body as { code?: string }).code).toBe('APPLICATION_CLOSED_FOR_UPLOADS');
    });

    it('stores an unverified applicant upload and returns the first upload on retry', async () => {
      await prisma.case.update({
        where: { id: fixture.caseId },
        data: { status: CaseStatus.WAITING_APPLICANT },
      });

      const first = await request(app.getHttpServer())
        .post(`${BASE}/applications/${fixture.applicationId}/documents`)
        .set(asCitizen(fixture.applicantSessionToken))
        .send(pdf('open'))
        .expect(201);
      const body = first.body as {
        documentId: string;
        documentVersionId: string;
        authenticityStatus: string;
        duplicate: boolean;
      };
      expect(body.authenticityStatus).toBe(DocumentAuthenticityStatus.NOT_EVALUATED);
      expect(body.duplicate).toBe(false);

      const stored = await prisma.documentVersion.findUniqueOrThrow({
        where: { id: body.documentVersionId },
        include: { documentRecord: true, associations: true },
      });
      expect(stored.receivedFromIdentityId).toBe(fixture.applicantIdentityId);
      expect(stored.documentRecord.sourceType).toBe(DocumentSourceType.APPLICANT_UPLOAD);
      expect(stored.authenticityStatus).toBe(DocumentAuthenticityStatus.NOT_EVALUATED);
      expect(stored.associations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ targetType: 'APPLICATION', targetId: fixture.applicationId }),
        ]),
      );

      const retry = await request(app.getHttpServer())
        .post(`${BASE}/applications/${fixture.applicationId}/documents`)
        .set(asCitizen(fixture.applicantSessionToken))
        .send(pdf('open'))
        .expect(201);
      expect(retry.body).toMatchObject({ documentId: body.documentId, duplicate: true });
    });

    it('another citizen cannot upload to my application', async () => {
      await prisma.case.update({
        where: { id: fixture.caseId },
        data: { status: CaseStatus.WAITING_APPLICANT },
      });
      const other = await createOtherCitizenSession(app, prisma);

      await request(app.getHttpServer())
        .post(`${BASE}/applications/${fixture.applicationId}/documents`)
        .set(asCitizen(other.sessionToken))
        .send(pdf('intruder'))
        .expect(404);
    });

    it('rejects client-asserted verification fields', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/applications/${fixture.applicationId}/documents`)
        .set(asCitizen(fixture.applicantSessionToken))
        .send({ ...pdf('forged'), authenticityStatus: 'AUTHENTICATED' })
        .expect(400);
    });
  });

  describe('request for review', () => {
    beforeEach(async () => {
      await prisma.governmentDecision.update({
        where: { id: fixture.governmentDecisionId },
        data: { decisionStatus: GovernmentDecisionStatus.EFFECTIVE, caseId: fixture.caseId },
      });
      const route = await prisma.governmentServiceRedressRoute.create({
        data: {
          governmentServiceVersionId: fixture.governmentServiceVersionId,
          routeCode: 'CITIZEN_E2E_REVIEW',
          label: 'Internal review',
        },
      });
      await prisma.redressRouteVersion.create({
        data: {
          governmentServiceRedressRouteId: route.id,
          routeCode: 'CITIZEN_E2E_REVIEW',
          versionNumber: 1,
          status: RedressRouteVersionStatus.ACTIVE,
          functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        },
      });
    });

    const fileReview = (token: string) =>
      request(app.getHttpServer())
        .post(`${BASE}/cases/${fixture.caseId}/review-requests`)
        .set(asCitizen(token))
        .send({
          decisionId: fixture.governmentDecisionId,
          routeCode: 'CITIZEN_E2E_REVIEW',
          groundsStatement: 'The decision did not consider the documents I provided.',
        });

    it('files once, leaves the decision unchanged, and refuses a second filing', async () => {
      const before = await prisma.governmentDecision.findUniqueOrThrow({
        where: { id: fixture.governmentDecisionId },
      });

      const filed = await fileReview(fixture.applicantSessionToken).expect(201);
      expect(filed.body).toMatchObject({ status: 'FILED', routeCode: 'CITIZEN_E2E_REVIEW' });

      const matter = await prisma.redressMatter.findUniqueOrThrow({
        where: { id: (filed.body as { id: string }).id },
      });
      expect(matter.appellantIdentityId).toBe(fixture.applicantIdentityId);

      const after = await prisma.governmentDecision.findUniqueOrThrow({
        where: { id: fixture.governmentDecisionId },
      });
      expect(after.decisionStatus).toBe(before.decisionStatus);
      expect(after.outcome).toBe(before.outcome);

      const again = await fileReview(fixture.applicantSessionToken).expect(409);
      expect((again.body as { code?: string }).code).toBe('REVIEW_ALREADY_REQUESTED');
      expect(await prisma.redressMatter.count()).toBe(1);
    });

    it('another citizen cannot file against my case', async () => {
      const other = await createOtherCitizenSession(app, prisma);

      await fileReview(other.sessionToken).expect(404);
      await request(app.getHttpServer())
        .get(`${BASE}/cases/${fixture.caseId}/review-requests`)
        .set(asCitizen(other.sessionToken))
        .expect(404);
      expect(await prisma.redressMatter.count()).toBe(0);
    });
  });

  describe('profile correction request', () => {
    it('records a request for review without changing the person record', async () => {
      const identity = await prisma.identity.findUniqueOrThrow({
        where: { id: fixture.applicantIdentityId },
        include: { person: true },
      });
      const before =
        identity.person ??
        (await prisma.person.create({ data: { givenName: 'Original', familyName: 'Citizen' } }));
      if (!identity.person) {
        await prisma.identity.update({
          where: { id: identity.id },
          data: { personId: before.id },
        });
      }

      const response = await request(app.getHttpServer())
        .post(`${BASE}/profile/correction-requests`)
        .set(asCitizen(fixture.applicantSessionToken))
        .send({ givenName: 'Corrected', reason: 'My given name is misspelled on file' })
        .expect(201);
      expect(response.body).toMatchObject({
        status: RecordCorrectionStatus.REQUESTED,
        requestedChanges: { givenName: 'Corrected' },
      });

      const after = await prisma.person.findUniqueOrThrow({ where: { id: before.id } });
      expect(after.givenName).toBe(before.givenName);

      const list = await request(app.getHttpServer())
        .get(`${BASE}/profile/correction-requests`)
        .set(asCitizen(fixture.applicantSessionToken))
        .expect(200);
      expect((list.body as { items: unknown[] }).items).toHaveLength(1);
    });
  });

  describe('communication preferences', () => {
    it('saves preferences for the session identity only', async () => {
      const saved = await request(app.getHttpServer())
        .put(`${BASE}/preferences/communications`)
        .set(asCitizen(fixture.applicantSessionToken))
        .send({ preferences: [{ channelType: 'SMS', isEnabled: false, locale: 'en' }] })
        .expect(200);
      const items = (saved.body as { items: { channelType: string; isEnabled: boolean }[] }).items;
      expect(items.find((item) => item.channelType === 'SMS')?.isEnabled).toBe(false);

      const other = await createOtherCitizenSession(app, prisma);
      const otherPrefs = await request(app.getHttpServer())
        .get(`${BASE}/preferences/communications`)
        .set(asCitizen(other.sessionToken))
        .expect(200);
      const otherItems = (
        otherPrefs.body as { items: { channelType: string; isEnabled: boolean }[] }
      ).items;
      expect(otherItems.find((item) => item.channelType === 'SMS')?.isEnabled).toBe(true);
    });
  });

  describe('message read receipt', () => {
    it('marks a portal message read idempotently and hides it from other citizens', async () => {
      const first = await request(app.getHttpServer())
        .post(`${BASE}/messages/${fixture.portalMessageId}/read`)
        .set(asCitizen(fixture.applicantSessionToken))
        .expect(200);
      const second = await request(app.getHttpServer())
        .post(`${BASE}/messages/${fixture.portalMessageId}/read`)
        .set(asCitizen(fixture.applicantSessionToken))
        .expect(200);
      expect((second.body as { readAt: string }).readAt).toBe(
        (first.body as { readAt: string }).readAt,
      );

      const list = await request(app.getHttpServer())
        .get(`${BASE}/messages`)
        .set(asCitizen(fixture.applicantSessionToken))
        .expect(200);
      const message = (list.body as { id: string; read: boolean; acknowledged: boolean }[]).find(
        (item) => item.id === fixture.portalMessageId,
      );
      expect(message).toMatchObject({ read: true, acknowledged: false });

      const other = await createOtherCitizenSession(app, prisma);
      await request(app.getHttpServer())
        .post(`${BASE}/messages/${fixture.portalMessageId}/read`)
        .set(asCitizen(other.sessionToken))
        .expect(404);
    });
  });

  describe('health consent', () => {
    it('grants, refuses withdrawal by another citizen, and withdraws once', async () => {
      await prisma.healthcarePatientReference.create({
        data: {
          patientReference: 'CITIZEN-E2E-PATIENT',
          patientIdentityId: fixture.applicantIdentityId,
        },
      });
      const purpose = await prisma.healthcareConsentPurposeDefinition.create({
        data: { purposeCode: 'CITIZEN_E2E_CARE', displayName: 'Care coordination' },
      });
      await prisma.healthcareConsentVersion.create({
        data: {
          versionCode: 'CITIZEN_E2E_CARE_V1',
          purposeId: purpose.id,
          effectiveFrom: new Date('2020-01-01'),
        },
      });

      const granted = await request(app.getHttpServer())
        .post(`${BASE}/healthcare/consents`)
        .set(asCitizen(fixture.applicantSessionToken))
        .send({
          purposeCode: 'CITIZEN_E2E_CARE',
          consentVersionCode: 'CITIZEN_E2E_CARE_V1',
          consentType: HealthcareConsentType.DATA_SHARING,
        })
        .expect(201);
      const grantId = (granted.body as { grantId: string; isActive: boolean }).grantId;
      expect((granted.body as { isActive: boolean }).isActive).toBe(true);

      const other = await createOtherCitizenSession(app, prisma);
      await request(app.getHttpServer())
        .post(`${BASE}/healthcare/consents/${grantId}/withdraw`)
        .set(asCitizen(other.sessionToken))
        .send({})
        .expect(404);

      const withdrawn = await request(app.getHttpServer())
        .post(`${BASE}/healthcare/consents/${grantId}/withdraw`)
        .set(asCitizen(fixture.applicantSessionToken))
        .send({ reasonSummary: 'No longer needed' })
        .expect(201);
      expect(withdrawn.body).toMatchObject({ isActive: false });
      expect(await prisma.healthcareConsent.count()).toBe(1);

      await request(app.getHttpServer())
        .post(`${BASE}/healthcare/consents/${grantId}/withdraw`)
        .set(asCitizen(fixture.applicantSessionToken))
        .send({})
        .expect(409);
    });
  });
});
