import { randomUUID } from 'node:crypto';

import { ForbiddenException, UnauthorizedException, type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AuthorityClassification,
  AuthorityEvaluationOutcome,
  ControlledFunctionClass,
  DashboardAccessPurpose,
  DashboardQueryAuditResult,
  DashboardSensitivityLevel,
  FunctionAuthorityLifecycleStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AuthorityEvaluationService } from '../src/authority/evaluation/authority-evaluation.service';
import { type PrismaService } from '../src/database/prisma.service';
import { DashboardAccessPolicyService } from '../src/intelligence/command-console/dashboard-access-policy.service';
import { DashboardBoundaryService } from '../src/intelligence/command-console/dashboard-boundary.service';
import { DashboardQueryService } from '../src/intelligence/command-console/dashboard-query.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { toDashboardActor } from './helpers/phase-12b-actor.util';
import { seedPhase12BFixture } from './helpers/phase-12b-test-fixtures';

describe('Phase 12B command console actor-context must-fail invariants (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let boundaryService: DashboardBoundaryService;
  let accessPolicyService: DashboardAccessPolicyService;
  let queryService: DashboardQueryService;
  let authorityEvaluationService: AuthorityEvaluationService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    boundaryService = app.get(DashboardBoundaryService);
    accessPolicyService = app.get(DashboardAccessPolicyService);
    queryService = app.get(DashboardQueryService);
    authorityEvaluationService = app.get(AuthorityEvaluationService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('must-fail: user cannot query another institution merely by changing institutionId', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);
    const otherInstitution = await prisma.institution.create({
      data: {
        jurisdictionId: (await prisma.jurisdiction.findFirstOrThrow({ where: { code: 'PH12B' } }))
          .id,
        code: 'OTHER-INST',
        name: 'Other Institution',
        type: 'MINISTRY',
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/command-console/executive/query')
      .set('Authorization', `Bearer ${fixture.executiveSessionToken}`)
      .send({
        dashboardDefinitionId: fixture.executiveDashboardId,
        institutionId: otherInstitution.id,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
        sensitivityScope: DashboardSensitivityLevel.RESTRICTED,
      })
      .expect(403);

    const audit = await prisma.dashboardQueryAudit.findFirst({
      where: {
        identityId: fixture.executiveIdentityId,
        accessResult: DashboardQueryAuditResult.DENIED_INSTITUTIONAL_BOUNDARY,
      },
    });
    expect(audit).toBeDefined();
  });

  it('must-fail: user cannot query another department merely by changing departmentId', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/command-console/departmental/query')
      .set('Authorization', `Bearer ${fixture.deptASessionToken}`)
      .send({
        dashboardDefinitionId: fixture.departmentalDashboardId,
        institutionId: fixture.institutionId,
        departmentId: fixture.departmentBId,
        purpose: DashboardAccessPurpose.DEPARTMENT_MANAGEMENT,
        sensitivityScope: DashboardSensitivityLevel.HIGHLY_RESTRICTED,
      })
      .expect(403);

    const audit = await prisma.dashboardQueryAudit.findFirst({
      where: {
        identityId: fixture.deptAIdentityId,
        departmentId: fixture.departmentBId,
      },
      orderBy: { queriedAt: 'desc' },
    });
    expect(audit?.accessResult).not.toBe(DashboardQueryAuditResult.GRANTED);
  });

  it('must-fail: identityId in body is rejected', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/command-console/executive/query')
      .set('Authorization', `Bearer ${fixture.deptASessionToken}`)
      .send({
        identityId: fixture.executiveIdentityId,
        dashboardDefinitionId: fixture.executiveDashboardId,
        institutionId: fixture.institutionId,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
        sensitivityScope: DashboardSensitivityLevel.RESTRICTED,
      })
      .expect(403);
  });

  it('must-fail: technical administrator does not gain substantive executive access', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await expect(
      accessPolicyService.evaluateAccess({
        actor: await toDashboardActor(prisma, fixture.technicalAdminIdentityId),
        dashboardDefinitionId: fixture.executiveDashboardId,
        institutionId: fixture.institutionId,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
        sensitivityScope: DashboardSensitivityLevel.RESTRICTED,
      }),
    ).rejects.toThrow(ForbiddenException);

    const audit = await prisma.dashboardQueryAudit.findFirst({
      where: {
        identityId: fixture.technicalAdminIdentityId,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
      },
      orderBy: { queriedAt: 'desc' },
    });
    expect(audit?.accessResult).not.toBe(DashboardQueryAuditResult.GRANTED);
  });

  it('must-fail: departmental actor cannot automatically access executive console', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/command-console/executive/query')
      .set('Authorization', `Bearer ${fixture.deptASessionToken}`)
      .send({
        dashboardDefinitionId: fixture.executiveDashboardId,
        institutionId: fixture.institutionId,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
        sensitivityScope: DashboardSensitivityLevel.RESTRICTED,
      })
      .expect(403);
  });

  it('must-fail: no case assignment when required = denied', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await prisma.dashboardAccessPolicy.create({
      data: {
        dashboardDefinitionId: fixture.executiveDashboardId,
        identityId: fixture.executiveIdentityId,
        institutionId: fixture.institutionId,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
        sensitivityLevel: DashboardSensitivityLevel.HIGHLY_RESTRICTED,
        caseAssignmentRequired: true,
        substantiveAccessRequired: true,
      },
    });

    await expect(
      queryService.queryExecutiveConsole({
        actor: await toDashboardActor(prisma, fixture.executiveIdentityId),
        dashboardDefinitionId: fixture.executiveDashboardId,
        institutionId: fixture.institutionId,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
        sensitivityScope: DashboardSensitivityLevel.HIGHLY_RESTRICTED,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('must-fail: highly restricted dashboard access without required conditions = denied', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await expect(
      accessPolicyService.evaluateAccess({
        actor: await toDashboardActor(prisma, fixture.executiveIdentityId),
        dashboardDefinitionId: fixture.departmentalDashboardId,
        institutionId: fixture.institutionId,
        departmentId: fixture.departmentBId,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
        sensitivityScope: DashboardSensitivityLevel.HIGHLY_RESTRICTED,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('must-fail: suspended/revoked user = denied', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    const identity = await prisma.identity.findUniqueOrThrow({
      where: { id: fixture.executiveIdentityId },
      include: { userAccount: true },
    });

    const userAccountId = identity.userAccountId;
    if (!userAccountId) {
      throw new Error('Expected executive fixture identity to have a linked user account');
    }

    await prisma.userAccount.update({
      where: { id: userAccountId },
      data: { status: AccountStatus.SUSPENDED },
    });

    await expect(
      accessPolicyService.evaluateAccess({
        actor: await toDashboardActor(prisma, fixture.executiveIdentityId, userAccountId),
        dashboardDefinitionId: fixture.executiveDashboardId,
        institutionId: fixture.institutionId,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
        sensitivityScope: DashboardSensitivityLevel.RESTRICTED,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('must-fail: snapshot cannot claim another identity as capturer', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/command-console/snapshots/capture')
      .set('Authorization', `Bearer ${fixture.deptASessionToken}`)
      .send({
        dashboardVersionId: fixture.executiveVersionId,
        capturedByIdentityId: fixture.executiveIdentityId,
        projectionIds: [],
      })
      .expect(400);
  });

  it('must-fail: dashboard access does not produce authority evaluation ALLOW', async () => {
    const fixture = await seedPhase12BFixture(prisma, app);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/command-console/executive/query')
      .set('Authorization', `Bearer ${fixture.executiveSessionToken}`)
      .send({
        dashboardDefinitionId: fixture.executiveDashboardId,
        institutionId: fixture.institutionId,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
        sensitivityScope: DashboardSensitivityLevel.RESTRICTED,
      })
      .expect(201);

    const functionRecord = await prisma.functionAuthorityRecord.create({
      data: {
        code: `EXEC-COMMAND-${randomUUID().slice(0, 8)}`,
        name: 'Executive Command Authority',
        classification: AuthorityClassification.ABSEZ_OWNED,
        functionClass: ControlledFunctionClass.ADMINISTRATIVE,
        lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
        institutionId: fixture.institutionId,
      },
    });

    const evaluation = await authorityEvaluationService.evaluate({
      identityId: fixture.executiveIdentityId,
      functionAuthorityRecordId: functionRecord.id,
      action: 'DECIDE',
    });

    expect(evaluation.outcome).not.toBe(AuthorityEvaluationOutcome.ALLOW);
    expect(
      await prisma.authorityEvaluationRecord.count({
        where: {
          outcome: AuthorityEvaluationOutcome.ALLOW,
          identityId: fixture.executiveIdentityId,
        },
      }),
    ).toBe(0);
  });

  it('rejects client-supplied actor identity fields at boundary', () => {
    expect(() => {
      boundaryService.rejectClientSuppliedActorIdentity({
        identityId: '00000000-0000-4000-8000-000000000001',
      });
    }).toThrow(ForbiddenException);

    expect(() => {
      boundaryService.rejectClientSuppliedActorIdentity({
        capturedByIdentityId: '00000000-0000-4000-8000-000000000001',
      });
    }).toThrow(ForbiddenException);
  });
});
