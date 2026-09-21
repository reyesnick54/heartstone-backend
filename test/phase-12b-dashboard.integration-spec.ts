import { ForbiddenException } from '@nestjs/common';
import { type INestApplication } from '@nestjs/common';
import {
  DashboardAccessPurpose,
  DashboardDataQuality,
  DashboardDrilldownReferenceType,
  DashboardSensitivityLevel,
  DashboardSourceAvailability,
  DashboardStalenessState,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { DashboardAccessPolicyService } from '../src/intelligence/command-console/dashboard-access-policy.service';
import { DashboardBoundaryService } from '../src/intelligence/command-console/dashboard-boundary.service';
import { DashboardDefinitionService } from '../src/intelligence/command-console/dashboard-definition.service';
import { DashboardIndicatorProjectionService } from '../src/intelligence/command-console/dashboard-indicator-projection.service';
import { DashboardQueryService } from '../src/intelligence/command-console/dashboard-query.service';
import { DashboardSnapshotService } from '../src/intelligence/command-console/dashboard-snapshot.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { toDashboardActor } from './helpers/phase-12b-actor.util';
import {
  createStaleProjection,
  type Phase12BFixtureContext,
  seedPhase12BFixture,
} from './helpers/phase-12b-test-fixtures';

describe('Phase 12B executive command console and departmental intelligence (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let boundaryService: DashboardBoundaryService;
  let projectionService: DashboardIndicatorProjectionService;
  let accessPolicyService: DashboardAccessPolicyService;
  let queryService: DashboardQueryService;
  let snapshotService: DashboardSnapshotService;
  let definitionService: DashboardDefinitionService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    boundaryService = app.get(DashboardBoundaryService);
    projectionService = app.get(DashboardIndicatorProjectionService);
    accessPolicyService = app.get(DashboardAccessPolicyService);
    queryService = app.get(DashboardQueryService);
    snapshotService = app.get(DashboardSnapshotService);
    definitionService = app.get(DashboardDefinitionService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks green indicator without required evidence', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await expect(
      projectionService.deriveProjection({
        indicatorDefinitionId: fixture.evidenceRequiredIndicatorId,
        dashboardVersionId: fixture.executiveVersionId,
        institutionId: fixture.institutionId,
        countValue: 1,
        dataQuality: DashboardDataQuality.VERIFIED,
        drilldowns: [
          {
            referenceType: DashboardDrilldownReferenceType.UNDERLYING_RECORD,
            referenceId: fixture.authoritativeRecordId,
            referenceLabel: 'Case without evidence',
            sourceStatus: 'ACTIVE',
            ownerReference: 'dept-a',
          },
        ],
      }),
    ).rejects.toThrow(/evidence packet is missing/i);
  });

  it('proves dashboard status cannot create authority', async () => {
    expect(() => {
      boundaryService.assertStatusDoesNotCreateAuthority('This status grants permission to decide');
    }).toThrow();

    const fixture = await seedPhase12BFixture(prisma, app);
    const projection = await projectionService.deriveProjection({
      indicatorDefinitionId: fixture.indicatorDefinitionId,
      dashboardVersionId: fixture.executiveVersionId,
      institutionId: fixture.institutionId,
      countValue: 2,
      dataQuality: DashboardDataQuality.VERIFIED,
      drilldowns: [
        {
          referenceType: DashboardDrilldownReferenceType.UNDERLYING_RECORD,
          referenceId: fixture.authoritativeRecordId,
          referenceLabel: 'Authoritative Case Record',
          sourceStatus: 'ACTIVE',
          ownerReference: 'dept-a',
        },
      ],
    });

    expect(projection.disclaimers.visibilityDoesNotCreateAuthority).toBe(true);
    expect(projection.disclaimers.statusIsDerived).toBe(true);
    expect(projection.status.meaning).not.toMatch(/grants permission|creates authority/i);
  });

  it('prevents executive user bypassing case sensitivity without assignment', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await expect(
      accessPolicyService.evaluateAccess({
        actor: toDashboardActor(fixture.executiveIdentityId),
        dashboardDefinitionId: fixture.departmentalDashboardId,
        institutionId: fixture.institutionId,
        departmentId: fixture.departmentBId,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
        sensitivityScope: DashboardSensitivityLevel.HIGHLY_RESTRICTED,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('prevents department user seeing another department restricted data without purpose', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await createDepartmentalProjection(prisma, fixture, fixture.departmentBId);

    await expect(
      queryService.queryDepartmentalConsole({
        actor: toDashboardActor(fixture.deptAIdentityId),
        dashboardDefinitionId: fixture.departmentalDashboardId,
        institutionId: fixture.institutionId,
        departmentId: fixture.departmentBId,
        purpose: DashboardAccessPurpose.DEPARTMENT_MANAGEMENT,
        sensitivityScope: DashboardSensitivityLevel.HIGHLY_RESTRICTED,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('prevents technical admin from automatic substantive access', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await expect(
      accessPolicyService.evaluateAccess({
        actor: toDashboardActor(fixture.technicalAdminIdentityId),
        dashboardDefinitionId: fixture.executiveDashboardId,
        institutionId: fixture.institutionId,
        purpose: DashboardAccessPurpose.TECHNICAL_OPERATIONS,
        sensitivityScope: DashboardSensitivityLevel.RESTRICTED,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('keeps stale status visible with explicit markers', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);
    const projection = await createStaleProjection(
      prisma,
      fixture,
      DashboardDataQuality.STALE_CACHED,
    );

    const response = await queryService.queryExecutiveConsole({
      actor: toDashboardActor(fixture.executiveIdentityId),
      dashboardDefinitionId: fixture.executiveDashboardId,
      institutionId: fixture.institutionId,
      purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
      sensitivityScope: DashboardSensitivityLevel.RESTRICTED,
    });

    const staleIndicator = response.indicators.find((item) => item.id === projection.id);
    expect(staleIndicator).toBeDefined();
    expect(staleIndicator?.staleness.isStale).toBe(true);
    expect(staleIndicator?.staleness.staleDataVisible).toBe(true);
    expect(staleIndicator?.staleness.neverPresentedAsLive).toBe(true);
    expect(staleIndicator?.staleness.currentStaleness).toBe(DashboardStalenessState.STALE);
  });

  it('shows estimated, disputed, modeled, and external-reported data distinctly', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);
    const qualities = [
      DashboardDataQuality.ESTIMATED,
      DashboardDataQuality.DISPUTED,
      DashboardDataQuality.MODELED,
      DashboardDataQuality.EXTERNAL_REPORTED,
    ];

    for (const quality of qualities) {
      const scopedIndicator = await prisma.dashboardIndicatorDefinition.create({
        data: {
          code: `QUALITY_${quality}`,
          label: `Quality ${quality}`,
          category: 'SERVICE_VOLUMES',
          statusDictionaryEntryId: fixture.statusEntryId,
          calculationRuleRef: `quality.${quality.toLowerCase()}`,
        },
      });

      await projectionService.deriveProjection({
        indicatorDefinitionId: scopedIndicator.id,
        dashboardVersionId: fixture.executiveVersionId,
        institutionId: fixture.institutionId,
        countValue: 1,
        dataQuality: quality,
        sourceAvailability: DashboardSourceAvailability.PARTIALLY_AVAILABLE,
        drilldowns: [
          {
            referenceType: DashboardDrilldownReferenceType.UNDERLYING_RECORD,
            referenceId: fixture.authoritativeRecordId,
            referenceLabel: `${quality} record`,
            sourceStatus: quality,
            ownerReference: 'dept-a',
          },
        ],
      });
    }

    const response = await queryService.queryExecutiveConsole({
      actor: toDashboardActor(fixture.executiveIdentityId),
      dashboardDefinitionId: fixture.executiveDashboardId,
      institutionId: fixture.institutionId,
      purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
      sensitivityScope: DashboardSensitivityLevel.RESTRICTED,
    });

    for (const quality of qualities) {
      expect(response.indicators.some((item) => item.dataQuality === quality)).toBe(true);
    }
    expect(response.metadata.dataQualityBreakdown.ESTIMATED).toBeGreaterThan(0);
    expect(response.metadata.dataQualityBreakdown.DISPUTED).toBeGreaterThan(0);
    expect(response.metadata.dataQualityBreakdown.MODELED).toBeGreaterThan(0);
    expect(response.metadata.dataQualityBreakdown.EXTERNAL_REPORTED).toBeGreaterThan(0);
  });

  it('drilldown reaches authoritative record', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    const projection = await projectionService.deriveProjection({
      indicatorDefinitionId: fixture.indicatorDefinitionId,
      dashboardVersionId: fixture.executiveVersionId,
      institutionId: fixture.institutionId,
      countValue: 4,
      dataQuality: DashboardDataQuality.VERIFIED,
      drilldowns: [
        {
          referenceType: DashboardDrilldownReferenceType.METRIC_DEFINITION,
          referenceId: fixture.indicatorDefinitionId,
          referenceLabel: 'Metric Definition',
          sourceStatus: 'ACTIVE',
          ownerReference: 'platform',
        },
        {
          referenceType: DashboardDrilldownReferenceType.UNDERLYING_RECORD,
          referenceId: fixture.authoritativeRecordId,
          referenceLabel: 'Authoritative Record',
          sourceStatus: 'ACTIVE',
          ownerReference: 'dept-a',
        },
      ],
    });

    expect(projection.drilldown).toHaveLength(2);
    expect(projection.drilldown.some((d) => d.id === fixture.authoritativeRecordId)).toBe(true);
    expect(projection.drilldown.every((d) => d.owner && d.sourceStatus)).toBe(true);
  });

  it('snapshot is immutable and replayable', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    const projection = await projectionService.deriveProjection({
      indicatorDefinitionId: fixture.indicatorDefinitionId,
      dashboardVersionId: fixture.executiveVersionId,
      institutionId: fixture.institutionId,
      countValue: 1,
      dataQuality: DashboardDataQuality.VERIFIED,
      drilldowns: [
        {
          referenceType: DashboardDrilldownReferenceType.UNDERLYING_RECORD,
          referenceId: fixture.authoritativeRecordId,
          referenceLabel: 'Record',
          sourceStatus: 'ACTIVE',
          ownerReference: 'dept-a',
        },
      ],
    });

    const snapshot = await snapshotService.captureSnapshot({
      actor: toDashboardActor(fixture.executiveIdentityId),
      dashboardVersionId: fixture.executiveVersionId,
      projectionIds: [projection.id],
    });

    expect(snapshot.isImmutable).toBe(true);
    expect(snapshot.capturedByIdentityId).toBe(fixture.executiveIdentityId);

    const replay = await snapshotService.replaySnapshot(
      snapshot.replayToken,
      toDashboardActor(fixture.executiveIdentityId),
    );
    expect(replay.payload).toEqual(snapshot.snapshotPayload);
    expect(replay.snapshotHash).toBe(snapshot.snapshotHash);

    await expect(snapshotService.rejectMutationAttempt(snapshot.id)).rejects.toThrow(/immutable/i);
  });

  it('widget cannot invent unsupported status', () => {
    expect(() => {
      boundaryService.assertWidgetUsesSupportedStatus('INVENTED_STATUS', ['ATTENTION_REQUIRED']);
    }).toThrow();
  });

  it('dashboard cannot collapse recommended/approved/issued', () => {
    expect(() => {
      boundaryService.assertStatusCodesNotCollapsed(['RECOMMENDED', 'APPROVED', 'ISSUED']);
    }).toThrow();
    expect(() => {
      boundaryService.assertStatusCodesNotCollapsed(['RECOMMENDED', 'ISSUED']);
    }).toThrow();
  });

  it('dashboard cannot collapse reported/verified/achieved', () => {
    expect(() => {
      boundaryService.assertStatusCodesNotCollapsed(['REPORTED', 'VERIFIED', 'ACHIEVED']);
    }).toThrow();
    expect(() => {
      boundaryService.assertStatusCodesNotCollapsed(['REPORTED', 'VERIFIED']);
    }).toThrow();
  });

  it('rejects client attempts to set dashboard projection via API', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/command-console/projections/derive')
      .set('Authorization', `Bearer ${fixture.executiveSessionToken}`)
      .send({
        indicatorDefinitionId: fixture.indicatorDefinitionId,
        dashboardVersionId: fixture.executiveVersionId,
        countValue: 5,
        dataQuality: DashboardDataQuality.VERIFIED,
        currentStaleness: DashboardStalenessState.FRESH,
        drilldowns: [],
      })
      .expect(400);
  });

  it('requires authentication for command console endpoints', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/command-console/executive/query')
      .send({
        dashboardDefinitionId: fixture.executiveDashboardId,
        institutionId: fixture.institutionId,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
        sensitivityScope: DashboardSensitivityLevel.RESTRICTED,
      })
      .expect(401);
  });

  it('publishes dashboard version without collapsing distinct statuses', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);
    const version = await definitionService.publishVersion(fixture.executiveVersionId);
    expect(version.status).toBe('PUBLISHED');
  });
});

async function createDepartmentalProjection(
  prisma: PrismaService,
  fixture: Phase12BFixtureContext,
  departmentId: string,
) {
  return prisma.dashboardIndicatorProjection.create({
    data: {
      indicatorDefinitionId: fixture.indicatorDefinitionId,
      dashboardVersionId: fixture.departmentalVersionId,
      statusDictionaryEntryId: fixture.statusEntryId,
      departmentId,
      countValue: 7,
      displayLabel: 'Restricted Department Cases',
      dataQuality: DashboardDataQuality.VERIFIED,
      currentStaleness: DashboardStalenessState.FRESH,
    },
  });
}
