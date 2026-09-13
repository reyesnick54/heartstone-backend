import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AuthenticationMethodType,
  DocumentAssociationTargetType,
  DocumentSecurityClassification,
  DocumentSourceType,
  IdentityType,
  MalwareScanStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type TestMalwareScanningAdapter } from '../../src/evidence-records/adapters/test-malware-scanning.adapter';
import { NON_PRODUCTION_EVIDENCE_RECORDS_FIXTURE_MARKER } from '../../src/evidence-records/evidence-records.constants';
import { MALWARE_SCANNING_PORT } from '../../src/evidence-records/ports/malware-scanning.port';
import { asDocumentRecordBody, asDocumentVersionBody } from './evidence-records-test-types';
import {
  asIdentityBody,
  asLoginResponseBody,
  asPersonBody,
  asUserAccountBody,
} from './identity-test-types';

export interface EvidenceRecordsFixture {
  applicantIdentityId: string;
  otherApplicantIdentityId: string;
  officialIdentityId: string;
  applicantSessionToken: string;
  otherApplicantSessionToken: string;
  officialSessionToken: string;
}

async function createIdentityWithSession(
  app: INestApplication<App>,
  loginIdentifier: string,
  displayName: string,
): Promise<{ identityId: string; sessionToken: string }> {
  const personRes = await request(app.getHttpServer())
    .post('/api/v1/identity/persons')
    .send({ givenName: displayName, familyName: NON_PRODUCTION_EVIDENCE_RECORDS_FIXTURE_MARKER })
    .expect(201);
  const person = asPersonBody(personRes.body);

  const accountRes = await request(app.getHttpServer())
    .post('/api/v1/identity/user-accounts')
    .send({
      loginIdentifier,
      personId: person.id,
      status: AccountStatus.ACTIVE,
    })
    .expect(201);
  const account = asUserAccountBody(accountRes.body);

  const identityRes = await request(app.getHttpServer())
    .post('/api/v1/identity/identities')
    .send({
      type: IdentityType.INDIVIDUAL,
      displayName,
      userAccountId: account.id,
      personId: person.id,
    })
    .expect(201);
  const identity = asIdentityBody(identityRes.body);

  await request(app.getHttpServer())
    .post('/api/v1/identity/credentials')
    .send({
      identityId: identity.id,
      type: 'PASSWORD',
      password: 'SecurePass123!',
    })
    .expect(201);

  await request(app.getHttpServer())
    .post('/api/v1/identity/authentication-methods')
    .send({
      identityId: identity.id,
      type: AuthenticationMethodType.PASSWORD,
    })
    .expect(201);

  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/identity/auth/login')
    .send({ loginIdentifier, password: 'SecurePass123!' })
    .expect(201);

  const login = asLoginResponseBody(loginRes.body);

  return { identityId: identity.id, sessionToken: login.sessionToken };
}

export async function seedEvidenceRecordsFixture(
  app: INestApplication<App>,
): Promise<EvidenceRecordsFixture> {
  const applicant = await createIdentityWithSession(
    app,
    'evidence-applicant@test.gov',
    'Evidence Applicant',
  );
  const otherApplicant = await createIdentityWithSession(
    app,
    'evidence-other@test.gov',
    'Other Applicant',
  );
  const official = await createIdentityWithSession(
    app,
    'evidence-official@test.gov',
    'Evidence Official',
  );

  return {
    applicantIdentityId: applicant.identityId,
    otherApplicantIdentityId: otherApplicant.identityId,
    officialIdentityId: official.identityId,
    applicantSessionToken: applicant.sessionToken,
    otherApplicantSessionToken: otherApplicant.sessionToken,
    officialSessionToken: official.sessionToken,
  };
}

export function getTestMalwareScanner(app: INestApplication<App>): TestMalwareScanningAdapter {
  return app.get<TestMalwareScanningAdapter>(MALWARE_SCANNING_PORT);
}

export async function uploadTestDocument(
  app: INestApplication<App>,
  sessionToken: string,
  content: Buffer,
  filename = 'submission.pdf',
  options?: {
    securityClassification?: DocumentSecurityClassification;
  },
): Promise<{ recordId: string; versionId: string; sha256: string }> {
  const recordRes = await request(app.getHttpServer())
    .post('/api/v1/documents')
    .set('Authorization', `Bearer ${sessionToken}`)
    .send({
      title: `${NON_PRODUCTION_EVIDENCE_RECORDS_FIXTURE_MARKER} ${filename}`,
      documentType: 'supporting_evidence',
      sourceType: DocumentSourceType.APPLICANT_UPLOAD,
    })
    .expect(201);

  const record = asDocumentRecordBody(recordRes.body);
  const versionRes = await request(app.getHttpServer())
    .post(`/api/v1/documents/${record.id}/versions`)
    .set('Authorization', `Bearer ${sessionToken}`)
    .send({
      contentBase64: content.toString('base64'),
      originalFilename: filename,
      contentType: 'application/pdf',
      securityClassification: options?.securityClassification,
    })
    .expect(201);
  const version = asDocumentVersionBody(versionRes.body);

  return {
    recordId: record.id,
    versionId: version.id,
    sha256: version.sha256,
  };
}

export async function associateDocumentToApplication(
  app: INestApplication<App>,
  sessionToken: string,
  versionId: string,
  applicationId: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post('/api/v1/documents/associations')
    .set('Authorization', `Bearer ${sessionToken}`)
    .send({
      documentVersionId: versionId,
      targetType: DocumentAssociationTargetType.APPLICATION,
      targetId: applicationId,
    })
    .expect(201);
}

export { DocumentAssociationTargetType, DocumentSecurityClassification, MalwareScanStatus };
