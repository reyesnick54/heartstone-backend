import { type INestApplication } from '@nestjs/common';
import { RedressMatterStatus, RedressRouteCategory } from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { RedressBoundaryService } from '../src/redress/common/redress-boundary.service';
import { AdministrativeCorrectionService } from '../src/redress/correction/administrative-correction.service';
import { RedressDecisionService } from '../src/redress/decisions/redress-decision.service';
import { RedressFilingService } from '../src/redress/filings/redress-filing.service';
import { RedressMatterService } from '../src/redress/matters/redress-matter.service';
import { RedressRouteCatalogService } from '../src/redress/routing/redress-route-catalog.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  createRedressFiling,
  openRedressMatter,
  requireRoute,
  seedPhase10Fixture,
} from './helpers/phase-10-test-fixtures';

describe('Phase 10 redress (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let matters: RedressMatterService;
  let filings: RedressFilingService;
  let boundary: RedressBoundaryService;
  let corrections: AdministrativeCorrectionService;
  let decisions: RedressDecisionService;
  let routeCatalog: RedressRouteCatalogService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    matters = app.get(RedressMatterService);
    filings = app.get(RedressFilingService);
    boundary = app.get(RedressBoundaryService);
    corrections = app.get(AdministrativeCorrectionService);
    decisions = app.get(RedressDecisionService);
    routeCatalog = app.get(RedressRouteCatalogService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('filing submission does not establish standing or final disposition', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'serviceComplaint' });
    const filing = await createRedressFiling(app, fixture, matter.id, 'serviceComplaint', {
      submit: true,
    });

    const storedMatter = await prisma.redressMatter.findUniqueOrThrow({
      where: { id: matter.id },
      include: { standingAssessments: true, redressDecisions: true },
    });

    expect(filing.status).toBe('SUBMITTED');
    expect(storedMatter.standingAssessments).toHaveLength(0);
    expect(storedMatter.redressDecisions).toHaveLength(0);
    expect(storedMatter.status).toBe(RedressMatterStatus.INTAKE);
  });

  it('classification does not equal disposition', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
      routeVersionId: requireRoute(fixture, 'serviceComplaint').routeVersionId,
    });

    const filing = await filings.createDraft({
      matterId: matter.id,
      routeVersionId: requireRoute(fixture, 'serviceComplaint').routeVersionId,
      filerIdentityId: fixture.applicantIdentityId,
      requestedRouteCategory: RedressRouteCategory.SERVICE_COMPLAINT,
    });
    await filings.submitFiling(filing.id);
    await filings.classifyFiling({
      filingId: filing.id,
      classifiedRouteCategory: RedressRouteCategory.SERVICE_COMPLAINT,
    });

    const decisionsBefore = await prisma.redressDecision.count({ where: { matterId: matter.id } });
    expect(decisionsBefore).toBe(0);
  });

  it('administrative correction rejects substantive outcome mutation', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
      routeVersionId: requireRoute(fixture, 'administrativeCorrection').routeVersionId,
    });

    await expect(
      corrections.createCorrection({
        matterId: matter.id,
        originalNoticeReference: 'NOTICE-001',
        errorDescription: 'Typo in applicant name',
        altersSubstantiveOutcome: true,
      }),
    ).rejects.toThrow('Administrative correction cannot alter substantive outcome');
  });

  it('recommendation cannot be recorded as final disposition', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
      routeVersionId: requireRoute(fixture, 'reconsideration').routeVersionId,
    });

    await expect(
      decisions.recordDecision({
        matterId: matter.id,
        outcome: 'RECOMMENDATION',
        deciderIdentityId: fixture.reviewerIdentityId,
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
        isRecommendation: true,
        isFinalDisposition: true,
      }),
    ).rejects.toThrow('Recommendation does not equal final redress disposition');
  });

  it('inactive route version cannot accept new filings', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const route = requireRoute(fixture, 'serviceComplaint');
    await prisma.redressRouteVersion.update({
      where: { id: route.routeVersionId },
      data: { status: 'DRAFT' },
    });

    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });

    await expect(
      filings.createDraft({
        matterId: matter.id,
        routeVersionId: route.routeVersionId,
        filerIdentityId: fixture.applicantIdentityId,
      }),
    ).rejects.toThrow('Route version is not active');
  });

  it('lists applicable routes for institution and matter type', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const routes = await routeCatalog.listApplicableRoutes({
      institutionId: fixture.institutionId,
      matterTypeCode: 'LICENSE_APPLICATION',
    });

    expect(routes.length).toBeGreaterThanOrEqual(6);
    expect(routes.every((route) => route.status === 'ACTIVE')).toBe(true);
  });

  it('boundary service rejects protected client fields on matter creation payloads', () => {
    expect(() => {
      boundary.rejectClientProtectedFields({ status: RedressMatterStatus.CLOSED });
    }).toThrow('Client may not set "status"');
  });
});
