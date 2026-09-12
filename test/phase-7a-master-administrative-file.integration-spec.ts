import {
  CaseEventPublicVisibility,
  CaseEventType,
  CaseLegalStatus,
  CaseStatus,
  IdentityType,
  MasterAdministrativeFileLifecycleStatus,
} from '@prisma/client';
import request from 'supertest';

import { CaseFoundationService } from '../src/application-processing/cases/case-foundation.service';
import { MasterAdministrativeFileService } from '../src/records/master-administrative-file.service';
import {
  createIntegrationApp,
  resetAllTestData,
} from './helpers/integration-app';
import {
  seedApplicationProcessingFixture,
  seedCaseFromApplication,
} from './helpers/application-processing-test-fixtures';

describe('Phase 7A Master Administrative File (integration)', () => {
  it('creates exactly one master file per case with institutional ownership and index references', async () => {
    const { app, prisma } = await createIntegrationApp();

    try {
      await resetAllTestData(prisma);
      const fixture = await seedApplicationProcessingFixture(app, prisma);
      const foundation = app.get(CaseFoundationService);
      const masterFileService = app.get(MasterAdministrativeFileService);

      const { applicationId, caseId } = await seedCaseFromApplication(prisma, foundation, fixture);

      const files = await prisma.masterAdministrativeFile.findMany({ where: { caseId } });
      expect(files).toHaveLength(1);

      const file = files[0]!;
      expect(file.fileNumber).toMatch(/^MAF-/);
      expect(file.administrativeOwnerOfficeId).toBe(fixture.administrativeOwnerOfficeId);
      expect(file.recordsCustodianOfficeId).toBe(fixture.recordsCustodianOfficeId);
      expect(file.lifecycleStatus).toBe(MasterAdministrativeFileLifecycleStatus.OPEN);
      expect(file.lifecycleStatus).not.toBe(CaseStatus.RECEIVED);
      expect(file.lifecycleStatus).not.toBe(CaseLegalStatus.NONE);

      const sections = await prisma.masterAdministrativeFileSection.findMany({
        where: { masterAdministrativeFileId: file.id },
        orderBy: { sectionNumber: 'asc' },
      });
      expect(sections).toHaveLength(20);

      const caseRecord = await prisma.case.findUniqueOrThrow({ where: { id: caseId } });
      expect(caseRecord.masterAdministrativeFileReference).toBe(file.id);

      await prisma.caseEvent.create({
        data: {
          caseId,
          eventType: CaseEventType.APPLICATION_RECEIVED,
          occurredAt: new Date(),
          publicVisibility: CaseEventPublicVisibility.APPLICANT_VISIBLE,
        },
      });

      const indexResponse = await request(app.getHttpServer())
        .get(`/api/v1/records/master-files/${file.id}/index`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .expect(200);

      expect(indexResponse.body.sections).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sectionType: 'APPLICATION_HISTORY',
            references: expect.arrayContaining([
              expect.objectContaining({
                referenceType: 'Application',
                referenceId: applicationId,
              }),
            ]),
          }),
          expect.objectContaining({
            sectionType: 'AUDIT_AND_TECHNICAL_HISTORY',
            references: expect.arrayContaining([
              expect.objectContaining({ referenceType: 'CaseEvent' }),
            ]),
          }),
        ]),
      );

      await expect(
        masterFileService.initializeForCase({
          caseId,
          actorIdentityId: fixture.officialIdentityId,
        }),
      ).resolves.toMatchObject({ id: file.id, fileNumber: file.fileNumber });

      const serviceIdentity = await prisma.identity.create({
        data: { type: IdentityType.SERVICE, displayName: 'AI Records Bot' },
      });

      await expect(
        masterFileService.initializeForCase({
          caseId: '00000000-0000-4000-8000-000000000099',
          actorIdentityId: serviceIdentity.id,
        }),
      ).rejects.toThrow('Service, AI, and automated identities cannot initialize');
    } finally {
      await app.close();
    }
  });

  it('rejects vendor offices as institutional owners', async () => {
    const { app, prisma } = await createIntegrationApp();
    const masterFileService = app.get(MasterAdministrativeFileService);

    try {
      await resetAllTestData(prisma);
      const fixture = await seedApplicationProcessingFixture(app, prisma);
      const foundation = app.get(CaseFoundationService);
      const { caseId } = await seedCaseFromApplication(prisma, foundation, fixture);

      await prisma.masterAdministrativeFile.deleteMany({ where: { caseId } });

      const vendorOffice = await prisma.office.create({
        data: {
          departmentId: fixture.departmentId,
          code: 'VENDOR-OPS',
          name: 'Vendor Operations',
        },
      });

      await expect(
        masterFileService.initializeForCase({
          caseId,
          administrativeOwnerOfficeId: vendorOffice.id,
          recordsCustodianOfficeId: fixture.recordsCustodianOfficeId,
        }),
      ).rejects.toThrow('Vendor, service, AI, or technical administrator offices cannot hold');
    } finally {
      await app.close();
    }
  });

  it('keeps historical case reference stable after master file creation', async () => {
    const { app, prisma } = await createIntegrationApp();

    try {
      await resetAllTestData(prisma);
      const fixture = await seedApplicationProcessingFixture(app, prisma);
      const foundation = app.get(CaseFoundationService);
      const { caseId } = await seedCaseFromApplication(prisma, foundation, fixture);

      const before = await prisma.case.findUniqueOrThrow({ where: { id: caseId } });
      const file = await prisma.masterAdministrativeFile.findUniqueOrThrow({ where: { caseId } });

      const after = await prisma.case.findUniqueOrThrow({ where: { id: caseId } });
      expect(after.caseNumber).toBe(before.caseNumber);
      expect(after.applicationId).toBe(before.applicationId);
      expect(after.masterAdministrativeFileReference).toBe(file.id);

      await request(app.getHttpServer())
        .get(`/api/v1/records/master-files/by-case/${caseId}`)
        .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.id).toBe(file.id);
          expect(body.archiveLocationReference).toBeNull();
        });
    } finally {
      await app.close();
    }
  });
});
