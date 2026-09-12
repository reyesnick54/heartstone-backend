import { type INestApplication } from '@nestjs/common';
import {
  DocumentAssociationTargetType,
  DocumentAuthenticityStatus,
  DocumentSecurityClassification,
  MalwareScanStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { type TestMalwareScanningAdapter } from '../src/evidence-records/adapters/test-malware-scanning.adapter';
import { hashDocumentContent } from '../src/evidence-records/common/document-hash.util';
import { MALWARE_SCANNING_PORT } from '../src/evidence-records/ports/malware-scanning.port';
import {
  associateDocumentToApplication,
  seedEvidenceRecordsFixture,
  uploadTestDocument,
} from './helpers/evidence-records-test-fixtures';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 7B evidence records (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fixture: Awaited<ReturnType<typeof seedEvidenceRecordsFixture>>;
  let malwareScanner: TestMalwareScanningAdapter;

  beforeAll(async () => {
    const integration = await createIntegrationApp();
    app = integration.app;
    prisma = integration.prisma;
    malwareScanner = app.get<TestMalwareScanningAdapter>(MALWARE_SCANNING_PORT);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    fixture = await seedEvidenceRecordsFixture(app);
    malwareScanner.reset();
    malwareScanner.setScanBehavior(() => MalwareScanStatus.CLEAN);
  });

  it('creates stable DocumentRecord and DocumentVersion on upload with server-side checksum', async () => {
    const content = Buffer.from('phase-7b immutable bytes');
    const uploaded = await uploadTestDocument(app, fixture.applicantSessionToken, content);

    const record = await prisma.documentRecord.findUnique({
      where: { id: uploaded.recordId },
      include: { versions: true },
    });

    expect(record).toBeTruthy();
    expect(record?.documentNumber).toMatch(/^DOC-/);
    expect(record?.versions).toHaveLength(1);
    const firstVersion = record?.versions[0];
    expect(firstVersion?.sha256).toBe(hashDocumentContent(content));
    expect(firstVersion?.authenticityStatus).toBe(DocumentAuthenticityStatus.NOT_EVALUATED);
  });

  it('preserves first version when uploading a second version', async () => {
    const first = await uploadTestDocument(
      app,
      fixture.applicantSessionToken,
      Buffer.from('version-one'),
      'same-name.pdf',
    );

    await request(app.getHttpServer())
      .post(`/api/v1/documents/${first.recordId}/versions`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        contentBase64: Buffer.from('version-two').toString('base64'),
        originalFilename: 'same-name.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const versions = await prisma.documentVersion.findMany({
      where: { documentRecordId: first.recordId },
      orderBy: { versionNumber: 'asc' },
    });

    expect(versions).toHaveLength(2);
    expect(versions[0]?.versionNumber).toBe(1);
    expect(versions[1]?.versionNumber).toBe(2);
    expect(versions[0]?.storageObjectKey).not.toBe(versions[1]?.storageObjectKey);
  });

  it('does not overwrite an existing record when the same filename is reused', async () => {
    const first = await uploadTestDocument(
      app,
      fixture.applicantSessionToken,
      Buffer.from('record-a'),
      'duplicate.pdf',
    );
    const second = await uploadTestDocument(
      app,
      fixture.applicantSessionToken,
      Buffer.from('record-b'),
      'duplicate.pdf',
    );

    expect(first.recordId).not.toBe(second.recordId);
  });

  it('rejects client-supplied storage metadata', async () => {
    const recordRes = await request(app.getHttpServer())
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        title: 'Blocked metadata',
        documentType: 'test',
        sourceType: 'APPLICANT_UPLOAD',
        storageObjectKey: 'client/evil/path',
      })
      .expect(403);
    expect((recordRes.body as { message: string }).message).toMatch(/storageObjectKey/i);
  });

  it('blocks download for quarantined content', async () => {
    malwareScanner.setScanBehavior(() => MalwareScanStatus.MALICIOUS);
    const uploaded = await uploadTestDocument(
      app,
      fixture.applicantSessionToken,
      Buffer.from('malware'),
      'infected.bin',
    );

    const version = await prisma.documentVersion.findUnique({
      where: { id: uploaded.versionId },
    });
    expect(version?.malwareScanStatus).toBe(MalwareScanStatus.QUARANTINED);

    await request(app.getHttpServer())
      .get(`/api/v1/documents/versions/${uploaded.versionId}/download`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(403);
  });

  it('denies unrelated applicants access to restricted documents', async () => {
    const uploaded = await uploadTestDocument(
      app,
      fixture.applicantSessionToken,
      Buffer.from('restricted content'),
      'restricted.pdf',
      { securityClassification: DocumentSecurityClassification.RESTRICTED },
    );

    await associateDocumentToApplication(
      app,
      fixture.applicantSessionToken,
      uploaded.versionId,
      '00000000-0000-4000-8000-000000000001',
    );

    await request(app.getHttpServer())
      .get(`/api/v1/documents/versions/${uploaded.versionId}/download`)
      .set('Authorization', `Bearer ${fixture.otherApplicantSessionToken}`)
      .expect(403);
  });

  it('allows officials to download restricted documents through server authorization', async () => {
    const uploaded = await uploadTestDocument(
      app,
      fixture.applicantSessionToken,
      Buffer.from('restricted official access'),
      'restricted-official.pdf',
      { securityClassification: DocumentSecurityClassification.RESTRICTED },
    );

    const downloadRes = await request(app.getHttpServer())
      .get(`/api/v1/documents/versions/${uploaded.versionId}/download?official=true`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(200);

    expect(downloadRes.text).toBe('restricted official access');
  });

  it('keeps superseded versions reconstructable from storage', async () => {
    const firstContent = Buffer.from('superseded-but-preserved');
    const uploaded = await uploadTestDocument(
      app,
      fixture.applicantSessionToken,
      firstContent,
      'lifecycle.pdf',
    );

    await request(app.getHttpServer())
      .post(`/api/v1/documents/${uploaded.recordId}/versions`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        contentBase64: Buffer.from('replacement').toString('base64'),
        originalFilename: 'lifecycle.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const versions = await prisma.documentVersion.findMany({
      where: { documentRecordId: uploaded.recordId },
      orderBy: { versionNumber: 'asc' },
    });

    const firstVersion = versions[0];
    expect(firstVersion).toBeDefined();
    if (!firstVersion) {
      throw new Error('Expected first document version to exist');
    }

    const firstDownload = await request(app.getHttpServer())
      .get(`/api/v1/documents/versions/${firstVersion.id}/download?official=true`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(200);

    expect(firstDownload.text).toBe('superseded-but-preserved');
  });

  it('records audit events for upload and download', async () => {
    const uploaded = await uploadTestDocument(
      app,
      fixture.applicantSessionToken,
      Buffer.from('audited'),
      'audit.pdf',
    );

    const uploadEvents = await prisma.documentAuditEvent.findMany({
      where: { documentRecordId: uploaded.recordId },
    });
    expect(uploadEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['DOCUMENT_UPLOADED', 'DOCUMENT_VERSION_CREATED']),
    );

    await request(app.getHttpServer())
      .get(`/api/v1/documents/versions/${uploaded.versionId}/download?official=true`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(200);

    const downloadEvents = await prisma.documentAuditEvent.findMany({
      where: {
        documentRecordId: uploaded.recordId,
        eventType: 'DOCUMENT_DOWNLOADED',
      },
    });
    expect(downloadEvents).toHaveLength(1);
  });

  it('does not treat object-store URLs as authorization', async () => {
    const uploaded = await uploadTestDocument(
      app,
      fixture.applicantSessionToken,
      Buffer.from('no direct url'),
      'protected.pdf',
    );

    const version = await prisma.documentVersion.findUnique({
      where: { id: uploaded.versionId },
    });
    expect(version?.storageObjectKey).toBeDefined();

    await request(app.getHttpServer())
      .get(`/api/v1/documents/versions/${version?.storageObjectKey ?? ''}/download`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(400);
  });

  it('associates a document version with an application without duplicating storage', async () => {
    const uploaded = await uploadTestDocument(
      app,
      fixture.applicantSessionToken,
      Buffer.from('associated once'),
      'assoc.pdf',
    );

    const applicationId = '00000000-0000-4000-8000-000000000099';
    await request(app.getHttpServer())
      .post('/api/v1/documents/associations')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        documentVersionId: uploaded.versionId,
        targetType: DocumentAssociationTargetType.APPLICATION,
        targetId: applicationId,
      })
      .expect(201);

    const associations = await prisma.documentAssociation.findMany({
      where: { targetId: applicationId },
    });
    expect(associations).toHaveLength(1);
    expect(associations[0]?.documentVersionId).toBe(uploaded.versionId);
  });
});
