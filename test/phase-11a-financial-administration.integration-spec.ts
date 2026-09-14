import { FeeAssessmentStatus, FeeScheduleLifecycleStatus, InvoiceStatus } from '@prisma/client';
import request from 'supertest';

import { CaseFoundationService } from '../src/application-processing/cases/case-foundation.service';
import {
  seedApplicationProcessingFixture,
  seedCaseFromApplication,
} from './helpers/application-processing-test-fixtures';
import { resetFinancialData } from './helpers/financial-test-reset';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  NON_PRODUCTION_FINANCIAL_FIXTURE_MARKER,
  seedFinancialAuthorityFixture,
} from './helpers/phase-11a-test-fixtures';

describe('Phase 11A Financial Administration (integration)', () => {
  it('creates fee schedule, assessment, invoice, and indexes them in MAF section 14', async () => {
    const { app, prisma } = await createIntegrationApp();

    try {
      await resetAllTestData(prisma);
      const fixture = await seedApplicationProcessingFixture(app, prisma);
      const authority = await seedFinancialAuthorityFixture(prisma, fixture);
      const foundation = app.get(CaseFoundationService);
      const { caseId } = await seedCaseFromApplication(prisma, foundation, fixture);

      const masterFile = await prisma.masterAdministrativeFile.findUniqueOrThrow({
        where: { caseId },
      });

      const marker = NON_PRODUCTION_FINANCIAL_FIXTURE_MARKER;

      const scheduleResponse = await request(app.getHttpServer())
        .post('/api/v1/financial/fee-schedules')
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          code: `${marker}-SCHEDULE`,
          name: 'Test Fee Schedule',
          responsibleInstitutionId: fixture.institutionId,
          responsibleDepartmentId: fixture.departmentId,
          currency: 'XCD',
        })
        .expect(201);

      const scheduleId = (scheduleResponse.body as { id: string }).id;

      const versionResponse = await request(app.getHttpServer())
        .post(`/api/v1/financial/fee-schedules/${scheduleId}/versions`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          version: '1.0.0',
          governingSourceId: authority.governingSourceId,
          functionAuthorityRecordId: authority.functionAuthorityRecordId,
          effectiveFrom: '2020-01-01T00:00:00.000Z',
          items: [
            {
              serviceId: fixture.governmentServiceId,
              serviceVersionId: fixture.governmentServiceVersionId,
              feeCode: 'APPLICATION_FEE',
              description: 'Application processing fee',
              amountCents: 5000,
              currency: 'XCD',
              calculationMethod: 'FIXED',
              effectiveFrom: '2020-01-01T00:00:00.000Z',
            },
          ],
        })
        .expect(201);

      const versionId = (versionResponse.body as { id: string }).id;

      await request(app.getHttpServer())
        .post(`/api/v1/financial/fee-schedules/${scheduleId}/versions/${versionId}/activate`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          officeholderId: fixture.officeholderId,
          functionAuthorityRecordId: authority.functionAuthorityRecordId,
        })
        .expect(201);

      const assessmentResponse = await request(app.getHttpServer())
        .post('/api/v1/financial/fee-assessments')
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          feeScheduleVersionId: versionId,
          serviceId: fixture.governmentServiceId,
          serviceVersionId: fixture.governmentServiceVersionId,
          caseId,
          masterAdministrativeFileId: masterFile.id,
          feeCodes: ['APPLICATION_FEE'],
        })
        .expect(201);

      const assessmentBody = assessmentResponse.body as {
        id: string;
        feeScheduleVersionId: string;
        totalCents: number;
        status: FeeAssessmentStatus;
      };

      expect(assessmentBody.feeScheduleVersionId).toBe(versionId);
      expect(assessmentBody.totalCents).toBe(5000);
      expect(assessmentBody.status).toBe(FeeAssessmentStatus.CALCULATED);

      const invoiceResponse = await request(app.getHttpServer())
        .post('/api/v1/financial/invoices')
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          feeAssessmentId: assessmentBody.id,
          institutionId: fixture.institutionId,
          payerIdentityId: fixture.applicantIdentityId,
          caseId,
          masterAdministrativeFileId: masterFile.id,
        })
        .expect(201);

      const invoiceBody = invoiceResponse.body as {
        id: string;
        status: InvoiceStatus;
        totalCents: number;
      };

      expect(invoiceBody.status).toBe(InvoiceStatus.DRAFT);
      expect(invoiceBody.totalCents).toBe(5000);

      const caseRecord = await prisma.case.findUniqueOrThrow({ where: { id: caseId } });
      expect(caseRecord.status).toBe('RECEIVED');

      const lockedAssessment = await prisma.feeAssessment.findUniqueOrThrow({
        where: { id: assessmentBody.id },
      });
      expect(lockedAssessment.status).toBe(FeeAssessmentStatus.LOCKED_FOR_INVOICE);

      const indexResponse = await request(app.getHttpServer())
        .get(`/api/v1/records/master-files/${masterFile.id}/index`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .expect(200);

      const indexBody = indexResponse.body as {
        sections: {
          sectionType: string;
          references: { referenceType: string; referenceId: string }[];
        }[];
      };

      const financialSection = indexBody.sections.find(
        (section) => section.sectionType === 'FEES_AND_FINANCIAL_RECORDS',
      );

      expect(financialSection?.references).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            referenceType: 'FeeAssessment',
            referenceId: assessmentBody.id,
          }),
          expect.objectContaining({
            referenceType: 'Invoice',
            referenceId: invoiceBody.id,
          }),
        ]),
      );
    } finally {
      await resetFinancialData(prisma);
      await app.close();
    }
  });

  it('rejects fee assessment from inactive schedule version', async () => {
    const { app, prisma } = await createIntegrationApp();

    try {
      await resetAllTestData(prisma);
      const fixture = await seedApplicationProcessingFixture(app, prisma);
      const authority = await seedFinancialAuthorityFixture(prisma, fixture);
      const marker = NON_PRODUCTION_FINANCIAL_FIXTURE_MARKER;

      const schedule = await prisma.feeSchedule.create({
        data: {
          code: `${marker}-INACTIVE`,
          name: 'Inactive Schedule',
          responsibleInstitutionId: fixture.institutionId,
          responsibleDepartmentId: fixture.departmentId,
          currency: 'XCD',
          status: FeeScheduleLifecycleStatus.DRAFT,
        },
      });

      const version = await prisma.feeScheduleVersion.create({
        data: {
          feeScheduleId: schedule.id,
          version: '1.0.0',
          governingSourceId: authority.governingSourceId,
          effectiveFrom: new Date('2020-01-01'),
          status: FeeScheduleLifecycleStatus.DRAFT,
          items: {
            create: {
              serviceId: fixture.governmentServiceId,
              feeCode: 'TEST_FEE',
              description: 'Test',
              amountCents: 1000,
              currency: 'XCD',
              calculationMethod: 'FIXED',
              effectiveFrom: new Date('2020-01-01'),
            },
          },
        },
      });

      await request(app.getHttpServer())
        .post('/api/v1/financial/fee-assessments')
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          feeScheduleVersionId: version.id,
          serviceId: fixture.governmentServiceId,
        })
        .expect(400);
    } finally {
      await resetFinancialData(prisma);
      await app.close();
    }
  });
});
