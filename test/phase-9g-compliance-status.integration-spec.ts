import { type INestApplication } from '@nestjs/common';
import {
  ComplianceDashboardAudience,
  ComplianceProjectionStatus,
  InspectionStatus,
  MonitoringRuleType,
  OfficialInstrumentStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { ComplianceMonitoringService } from '../src/compliance/oversight/compliance-monitoring.service';
import { ComplianceProjectionService } from '../src/compliance/oversight/compliance-projection.service';
import { ComplianceRevalidationService } from '../src/compliance/oversight/compliance-revalidation.service';
import { ComplianceStatusBoundaryService } from '../src/compliance/oversight/compliance-status-boundary.service';
import { type PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { type Phase8FixtureContext, seedPhase8Fixture } from './helpers/phase-8-test-fixtures';

describe('Phase 9G compliance status and oversight (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let projectionService: ComplianceProjectionService;
  let monitoringService: ComplianceMonitoringService;
  let revalidationService: ComplianceRevalidationService;
  let boundaryService: ComplianceStatusBoundaryService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    projectionService = app.get(ComplianceProjectionService);
    monitoringService = app.get(ComplianceMonitoringService);
    revalidationService = app.get(ComplianceRevalidationService);
    boundaryService = app.get(ComplianceStatusBoundaryService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('derives dashboard projection from authoritative records', async () => {
    const fixture = await seedComplianceContext(app, prisma);

    const projection = await projectionService.deriveProjection({
      audience: ComplianceDashboardAudience.HOLDER,
      subjectIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      officialInstrumentId: fixture.officialInstrumentId,
      underlyingAssessmentType: 'InspectionRecord',
      underlyingAssessmentId: fixture.inspectionId,
      evidenceCutoffAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(projection.status).not.toBe(ComplianceProjectionStatus.SATISFACTORY);
    expect(projection.indicators.length).toBeGreaterThan(0);
    const firstIndicator = projection.indicators[0];
    const drillDown = firstIndicator?.drillDownReferences;
    expect(Array.isArray(drillDown)).toBe(true);
    expect((drillDown as { id: string }[])[0]?.id).toEqual(expect.any(String));
    expect(projection.projectionDisclaimer).toContain('not a new legal determination');
  });

  it('rejects client attempts to set compliance status via API', async () => {
    const fixture = await seedComplianceContext(app, prisma);

    await request(app.getHttpServer())
      .post('/api/v1/compliance/status/projections/derive')
      .send({
        audience: ComplianceDashboardAudience.HOLDER,
        subjectIdentityId: fixture.applicantIdentityId,
        status: ComplianceProjectionStatus.SATISFACTORY,
      })
      .expect(400);
  });

  it('creates alerts that are not violations or enforcement decisions', async () => {
    const fixture = await seedComplianceContext(app, prisma);
    const projection = await projectionService.deriveProjection({
      audience: ComplianceDashboardAudience.OFFICIAL,
      subjectOfficeholderId: fixture.officialOfficeholderId,
      caseId: fixture.caseId,
    });

    const rule = await monitoringService.createRule({
      code: 'OPEN-FINDING-AGE',
      name: 'Open finding age',
      ruleType: MonitoringRuleType.OPEN_FINDING_AGE,
      structuredConfig: { maxOpenDays: 30 },
      warningDaysBefore: 1,
      criticalDaysBefore: 2,
    });
    await monitoringService.activateRule(rule.id);

    const alert = await monitoringService.evaluateRule({
      ruleId: rule.id,
      projectionId: projection.id,
      sourceDataRefs: [{ type: 'InspectionEvidenceItem', id: fixture.inspectionEvidenceItemId }],
      countValue: 2,
    });

    if (!alert) {
      throw new Error('Expected compliance alert to be created');
    }
    boundaryService.assertAlertIsNotViolation(alert);
    expect(alert.isViolation).toBe(false);
    expect(alert.isEnforcementDecision).toBe(false);
  });

  it('records risk score without creating sanctions', async () => {
    const fixture = await seedComplianceContext(app, prisma);
    const projection = await projectionService.deriveProjection({
      audience: ComplianceDashboardAudience.EXECUTIVE_OVERSIGHT,
      subjectInstitutionId: fixture.institutionId,
      caseId: fixture.caseId,
    });

    const alert = await monitoringService.recordRiskPrioritizationScore({
      projectionId: projection.id,
      score: 55,
      methodology: 'late-reporting-pattern-v1',
      methodologyVersion: '1.0.0',
      inputs: { lateReports: 2, patternConfidence: 0.62 },
      limitations: 'Advisory prioritization only; requires human review.',
      reviewedByIdentityId: fixture.officialIdentityId,
    });

    expect(alert.isViolation).toBe(false);
    expect(alert.humanReviewRequired).toBe(true);
  });

  it('shows expired evidence and suspended or revoked instruments', async () => {
    const fixture = await seedComplianceContext(app, prisma);

    await prisma.officialInstrument.update({
      where: { id: fixture.officialInstrumentId },
      data: { status: OfficialInstrumentStatus.SUSPENDED },
    });

    const suspendedProjection = await projectionService.deriveProjection({
      audience: ComplianceDashboardAudience.HOLDER,
      subjectIdentityId: fixture.applicantIdentityId,
      officialInstrumentId: fixture.officialInstrumentId,
      caseId: fixture.caseId,
    });
    expect(suspendedProjection.status).toBe(
      ComplianceProjectionStatus.SUSPENDED_BY_SEPARATE_DECISION,
    );

    await prisma.officialInstrument.update({
      where: { id: fixture.officialInstrumentId },
      data: {
        status: OfficialInstrumentStatus.REVOKED,
      },
    });

    const revokedProjection = await projectionService.deriveProjection({
      audience: ComplianceDashboardAudience.OFFICIAL,
      subjectOfficeholderId: fixture.officialOfficeholderId,
      officialInstrumentId: fixture.officialInstrumentId,
    });
    expect(revokedProjection.status).toBe(ComplianceProjectionStatus.REVOKED_BY_SEPARATE_DECISION);
  });

  it('invalidates projection cache on instrument change and preserves closed findings historically', async () => {
    const fixture = await seedComplianceContext(app, prisma);

    const initial = await projectionService.deriveProjection({
      audience: ComplianceDashboardAudience.OFFICIAL,
      subjectOfficeholderId: fixture.officialOfficeholderId,
      caseId: fixture.caseId,
      officialInstrumentId: fixture.officialInstrumentId,
    });

    await prisma.inspectionRecord.update({
      where: { id: fixture.inspectionId },
      data: { status: InspectionStatus.COMPLETED, followUpRequired: false },
    });

    const refreshed = await projectionService.deriveProjection({
      audience: ComplianceDashboardAudience.OFFICIAL,
      subjectOfficeholderId: fixture.officialOfficeholderId,
      caseId: fixture.caseId,
      officialInstrumentId: fixture.officialInstrumentId,
    });

    expect(refreshed.projectionVersion).toBeGreaterThan(initial.projectionVersion);

    const historicalInspection = await prisma.inspectionRecord.findUnique({
      where: { id: fixture.inspectionId },
    });
    expect(historicalInspection?.status).toBe(InspectionStatus.COMPLETED);
  });

  it('triggers revalidation on new material evidence without renewing instrument', async () => {
    const fixture = await seedComplianceContext(app, prisma);
    const projection = await projectionService.deriveProjection({
      audience: ComplianceDashboardAudience.HOLDER,
      subjectIdentityId: fixture.applicantIdentityId,
      officialInstrumentId: fixture.officialInstrumentId,
    });

    const before = await prisma.officialInstrument.findUniqueOrThrow({
      where: { id: fixture.officialInstrumentId },
    });

    const revalidation = await revalidationService.triggerFromMaterialEvidence(
      projection.id,
      fixture.expiredEvidenceId,
      fixture.officialIdentityId,
    );

    const after = await prisma.officialInstrument.findUniqueOrThrow({
      where: { id: fixture.officialInstrumentId },
    });

    expect(revalidation.doesNotRenewInstrument).toBe(true);
    expect(after.status).toBe(before.status);
  });

  it('holder dashboard excludes restricted internal fields', async () => {
    const fixture = await seedComplianceContext(app, prisma);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/compliance/status/dashboards/holder/${fixture.applicantIdentityId}`)
      .query({ caseId: fixture.caseId })
      .expect(200);

    const body = response.body as {
      restrictedFieldsExcluded?: unknown;
      internalPrivilegedNotes?: unknown;
      confidentialInvestigationStrategy?: unknown;
    };
    expect(body.restrictedFieldsExcluded).toBeDefined();
    expect(body.internalPrivilegedNotes).toBeUndefined();
    expect(body.confidentialInvestigationStrategy).toBeUndefined();
  });

  it('executive aggregate links back to underlying evidence', async () => {
    const fixture = await seedComplianceContext(app, prisma);

    await projectionService.deriveProjection({
      audience: ComplianceDashboardAudience.EXECUTIVE_OVERSIGHT,
      subjectInstitutionId: fixture.institutionId,
      caseId: fixture.caseId,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/v1/compliance/status/dashboards/executive/${fixture.institutionId}`)
      .expect(200);

    const body = response.body as {
      aggregates: { evidenceLinks: { openFindingRefs: unknown } }[];
    };
    expect(body.aggregates.length).toBeGreaterThan(0);
    const firstAggregate = body.aggregates[0];
    expect(firstAggregate?.evidenceLinks.openFindingRefs).toBeDefined();
  });
});

interface ComplianceFixtureContext extends Phase8FixtureContext {
  officialInstrumentId: string;
  inspectionId: string;
  inspectionEvidenceItemId: string;
  expiredEvidenceId: string;
}

async function seedComplianceContext(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<ComplianceFixtureContext> {
  const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });

  if (!fixture.governmentDecisionId) {
    throw new Error('Phase 8 fixture must include a pre-recorded government decision');
  }

  const officialInstrument = await prisma.officialInstrument.create({
    data: {
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      governmentDecisionId: fixture.governmentDecisionId,
      caseId: fixture.caseId,
      masterAdministrativeFileId: fixture.masterAdministrativeFileId,
      holderIdentityId: fixture.applicantIdentityId,
      issuerInstitutionId: fixture.institutionId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      scope: { activity: 'regulated' },
      status: OfficialInstrumentStatus.ISSUED,
      publicVerificationToken: `${fixture.marker}-verify`,
      publicVerificationStatus: 'CURRENT',
      effectiveUntil: new Date('2025-01-01'),
    },
  });

  const inspection = await prisma.inspectionRecord.create({
    data: {
      caseId: fixture.caseId,
      inspectionType: 'SITE',
      inspectionDate: new Date(),
      scope: 'Annual compliance inspection',
      status: InspectionStatus.IN_PROGRESS,
      followUpRequired: true,
    },
  });

  const evidenceRecord = await prisma.evidenceRecord.create({
    data: {
      evidenceNumber: `${fixture.marker}-EVD-001`,
      caseId: fixture.caseId,
      masterAdministrativeFileId: fixture.masterAdministrativeFileId,
      evidenceType: 'DOCUMENT',
      source: 'APPLICANT',
      submittingParty: fixture.applicantIdentityId,
      dateReceived: new Date('2024-01-01'),
      confidentialityClassification: 'OFFICIAL',
      integrityReference: `${fixture.marker}-integrity`,
      validUntil: new Date('2020-01-01'),
      title: 'Expired supporting evidence',
      description: 'Expired for compliance test',
    },
  });

  const inspectionEvidenceItem = await prisma.inspectionEvidenceItem.create({
    data: {
      inspectionId: inspection.id,
      evidenceRecordId: evidenceRecord.id,
      findingClassification: 'CONDITION',
      observationNotes: 'Expired supporting evidence observed',
    },
  });

  await prisma.decisionCondition.upsert({
    where: {
      governmentDecisionId_conditionNumber: {
        governmentDecisionId: fixture.governmentDecisionId,
        conditionNumber: 2,
      },
    },
    create: {
      governmentDecisionId: fixture.governmentDecisionId,
      conditionNumber: 2,
      conditionType: 'CONTINUING',
      status: 'PENDING',
      responsibleParty: 'Holder',
      requiredActionOrRestraint: 'Submit annual compliance report',
    },
    update: {
      conditionType: 'CONTINUING',
      status: 'PENDING',
      responsibleParty: 'Holder',
      requiredActionOrRestraint: 'Submit annual compliance report',
    },
  });

  return {
    ...fixture,
    officialInstrumentId: officialInstrument.id,
    inspectionId: inspection.id,
    inspectionEvidenceItemId: inspectionEvidenceItem.id,
    expiredEvidenceId: evidenceRecord.id,
  };
}
