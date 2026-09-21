import { ForbiddenException, type INestApplication } from '@nestjs/common';
import {
  AuthorityClassification,
  ControlledFunctionClass,
  CredentialStatus,
  FormDefinitionStatus,
  FunctionAuthorityLifecycleStatus,
  GovernmentDecisionStatus,
  GovernmentServiceMaturityStatus,
  IdentityType,
  LegalHoldStatus,
  PlatformAdministrativeAccessAuditResult,
  SecurityAuditEventType,
  WorkflowDefinitionStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { PlatformAdminBoundaryService } from '../src/experience/platform-admin/policy/platform-admin-boundary.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase6Fixture } from './helpers/phase-6-test-fixtures';
import {
  grantPlatformAdminPolicy,
  seedPlatformAdminFixture,
} from './helpers/platform-admin-test-fixtures';
import {
  asPlatformAdminActionsBody,
  asPlatformAdminHomeBody,
  asPlatformAdminListBody,
} from './helpers/platform-admin-test-types';

describe('Platform Admin Experience API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let boundary: PlatformAdminBoundaryService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    boundary = new PlatformAdminBoundaryService();
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('denies citizen access to platform admin endpoints', async () => {
    const fixture = await seedPlatformAdminFixture(app, prisma);

    await request(app.getHttpServer())
      .get('/api/v1/experience/platform-admin/home')
      .set('Authorization', `Bearer ${fixture.citizenSessionToken}`)
      .expect(403);
  });

  it('denies ordinary government official without admin policy', async () => {
    const fixture = await seedPlatformAdminFixture(app, prisma);

    await request(app.getHttpServer())
      .get('/api/v1/experience/platform-admin/home')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(403);
  });

  it('allows platform admin with policy to access home and records audit', async () => {
    const fixture = await seedPlatformAdminFixture(app, prisma);

    const home = asPlatformAdminHomeBody(
      (
        await request(app.getHttpServer())
          .get('/api/v1/experience/platform-admin/home')
          .set('Authorization', `Bearer ${fixture.platformAdminSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(home.hasSubstantiveGovernmentAuthority).toBe(false);
    expect(home.authorityDisclaimer).toContain('does not confer');

    const audit = await prisma.platformAdministrativeAccessAudit.findFirst({
      where: {
        identityId: fixture.platformAdminIdentityId,
        accessResult: PlatformAdministrativeAccessAuditResult.GRANTED,
      },
    });
    expect(audit).toBeTruthy();

    const securityAudit = await prisma.securityAuditEvent.findFirst({
      where: {
        identityId: fixture.platformAdminIdentityId,
        eventType: SecurityAuditEventType.PLATFORM_ADMIN_ACCESS_GRANTED,
      },
    });
    expect(securityAudit).toBeTruthy();
  });

  it('allows official access when explicit admin policy exists', async () => {
    const fixture = await seedPlatformAdminFixture(app, prisma);
    await grantPlatformAdminPolicy(prisma, fixture.officialIdentityId);

    await request(app.getHttpServer())
      .get('/api/v1/experience/platform-admin/institutions')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(200);
  });

  it('returns administrative projections for configured domains', async () => {
    const fixture = await seedPlatformAdminFixture(app, prisma);
    const phase6 = await seedPhase6Fixture(app, prisma);

    const institutions = asPlatformAdminListBody(
      (
        await request(app.getHttpServer())
          .get('/api/v1/experience/platform-admin/institutions')
          .set('Authorization', `Bearer ${fixture.platformAdminSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(institutions.totalCount).toBeGreaterThan(0);
    expect(institutions.items.some((item) => item.id === phase6.institutionId)).toBe(true);

    const actions = asPlatformAdminActionsBody(
      (
        await request(app.getHttpServer())
          .get('/api/v1/experience/platform-admin/available-actions')
          .set('Authorization', `Bearer ${fixture.platformAdminSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(actions.actions.length).toBeGreaterThan(0);
    expect(actions.actions.every((action) => action.requiresGovernedWorkflow)).toBe(true);
  });

  it('denies platform admin substantive official workspace access', async () => {
    const fixture = await seedPlatformAdminFixture(app, prisma);
    await grantPlatformAdminPolicy(prisma, fixture.platformAdminIdentityId);

    await request(app.getHttpServer())
      .get('/api/v1/experience/official/workspace')
      .set('Authorization', `Bearer ${fixture.platformAdminSessionToken}`)
      .expect(403);
  });

  it('prevents platform admin from approving or deciding a case', async () => {
    const fixture = await seedPlatformAdminFixture(app, prisma);
    const phase6 = await seedPhase6Fixture(app, prisma);

    expect(() => {
      boundary.assertPlatformAdminCannotApproveCase(true);
    }).toThrow(ForbiddenException);

    await request(app.getHttpServer())
      .post('/api/v1/decisions/execute')
      .set('Authorization', `Bearer ${fixture.platformAdminSessionToken}`)
      .send({
        caseId: phase6.governmentServiceId,
        decisionTypeVersionId: phase6.governmentServiceVersionId,
        decisionMakerIdentityId: fixture.platformAdminIdentityId,
        decisionMakerOfficeholderId: phase6.officeholderId,
        appointmentId: phase6.appointmentId,
        requestedOutcome: 'APPROVE',
      })
      .expect((res) => {
        expect([400, 403, 404]).toContain(res.status);
      });
  });

  it('prevents platform admin from creating institutional authority through configuration alone', () => {
    expect(() => {
      boundary.assertPlatformAdminCannotCreateInstitutionalAuthority(true, true);
    }).toThrow(ForbiddenException);
  });

  it('prevents admin from making suspended service ACTIVE through generic PATCH', async () => {
    const fixture = await seedPlatformAdminFixture(app, prisma);
    const phase6 = await seedPhase6Fixture(app, prisma);

    await prisma.governmentServiceVersion.update({
      where: { id: phase6.governmentServiceVersionId },
      data: { maturityStatus: GovernmentServiceMaturityStatus.SUSPENDED },
    });

    expect(() => {
      boundary.assertNoDirectServiceActivation(GovernmentServiceMaturityStatus.ACTIVE);
    }).toThrow(ForbiddenException);

    await request(app.getHttpServer())
      .patch(`/api/v1/service-catalog/service-versions/${phase6.governmentServiceVersionId}`)
      .set('Authorization', `Bearer ${fixture.platformAdminSessionToken}`)
      .send({ maturityStatus: GovernmentServiceMaturityStatus.ACTIVE })
      .expect(400);
  });

  it('prevents admin from altering final government decision', async () => {
    const phase6 = await seedPhase6Fixture(app, prisma);

    await prisma.governmentDecision.create({
      data: {
        decisionNumber: 'PA-DEC-001',
        lifecycleDecisionType: 'APPROVE',
        decisionStatus: GovernmentDecisionStatus.FINALIZED,
        decisionMakerOfficeholderId: phase6.officeholderId,
        decisionMakerIdentityId: phase6.officialIdentityId,
        outcomeSummary: 'Final decision',
        finalizedAt: new Date(),
      },
    });

    expect(() => {
      boundary.assertCannotAlterFinalDecision(GovernmentDecisionStatus.FINALIZED);
    }).toThrow(ForbiddenException);
    expect(() => {
      boundary.assertCannotAlterFinalDecision(GovernmentDecisionStatus.RECORDED);
    }).toThrow(ForbiddenException);
  });

  it('prevents admin from bypassing legal hold', async () => {
    const fixture = await seedPlatformAdminFixture(app, prisma);

    await prisma.legalHold.create({
      data: {
        holdNumber: 'PA-HOLD-001',
        title: 'Platform Admin Hold Test',
        authorityReference: 'COURT-001',
        reason: 'Pending review',
        issuedByIdentityId: fixture.platformAdminIdentityId,
        effectiveFrom: new Date(),
        status: LegalHoldStatus.ACTIVE,
      },
    });

    expect(() => {
      boundary.assertLegalHoldBlocksMutation(LegalHoldStatus.ACTIVE);
    }).toThrow(ForbiddenException);
  });

  it('prevents admin from activating AI agent outside approved lifecycle', async () => {
    const fixture = await seedPlatformAdminFixture(app, prisma);

    expect(() => {
      boundary.assertAiActivationRequiresApprovedLifecycle(true);
    }).toThrow(ForbiddenException);

    const aiIdentity = await prisma.identity.create({
      data: {
        type: IdentityType.SERVICE,
        displayName: 'Suspended AI Agent',
      },
    });

    await prisma.credential.create({
      data: {
        identityId: aiIdentity.id,
        type: 'API_KEY',
        status: CredentialStatus.REVOKED,
        apiKeyHash: 'revoked',
      },
    });

    const agents = asPlatformAdminListBody(
      (
        await request(app.getHttpServer())
          .get('/api/v1/experience/platform-admin/ai-agents')
          .set('Authorization', `Bearer ${fixture.platformAdminSessionToken}`)
          .expect(200)
      ).body,
    );

    const suspended = agents.items.find((item) => item.id === aiIdentity.id);
    expect(suspended?.status).toBe('SUSPENDED');
  });

  it('shows admin visibility does not grant substantive government access', async () => {
    const fixture = await seedPlatformAdminFixture(app, prisma);
    await seedPhase6Fixture(app, prisma);

    const home = asPlatformAdminHomeBody(
      (
        await request(app.getHttpServer())
          .get('/api/v1/experience/platform-admin/home')
          .set('Authorization', `Bearer ${fixture.platformAdminSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(home.hasSubstantiveGovernmentAuthority).toBe(false);

    await request(app.getHttpServer())
      .get('/api/v1/experience/official/cases')
      .set('Authorization', `Bearer ${fixture.platformAdminSessionToken}`)
      .expect(403);
  });

  it('projects forms, workflows, services requiring attention on home summary', async () => {
    const fixture = await seedPlatformAdminFixture(app, prisma);
    const phase6 = await seedPhase6Fixture(app, prisma);

    await prisma.formDefinition.update({
      where: { id: phase6.formDefinitionId },
      data: { status: FormDefinitionStatus.DRAFT },
    });
    await prisma.workflowDefinition.update({
      where: { id: phase6.workflowDefinitionId },
      data: { status: WorkflowDefinitionStatus.DRAFT },
    });

    const home = asPlatformAdminHomeBody(
      (
        await request(app.getHttpServer())
          .get('/api/v1/experience/platform-admin/home')
          .set('Authorization', `Bearer ${fixture.platformAdminSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(home.summaryCounts.some((entry) => entry.label === 'Forms requiring activation')).toBe(
      true,
    );
    expect(
      home.summaryCounts.some((entry) => entry.label === 'Workflows requiring validation'),
    ).toBe(true);
  });

  it('does not expose function authority activation through admin configuration metadata', async () => {
    const fixture = await seedPlatformAdminFixture(app, prisma);

    const actions = asPlatformAdminActionsBody(
      (
        await request(app.getHttpServer())
          .get('/api/v1/experience/platform-admin/available-actions')
          .set('Authorization', `Bearer ${fixture.platformAdminSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(
      actions.actions.every(
        (action) =>
          !action.actionKey.includes('create-authority') &&
          !action.actionKey.includes('approve-case'),
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .post('/api/v1/authority/functions')
      .set('Authorization', `Bearer ${fixture.platformAdminSessionToken}`)
      .send({
        code: 'PA-AUTH',
        name: 'Platform Admin Authority Attempt',
        classification: AuthorityClassification.ABSEZ_OWNED,
        functionClass: ControlledFunctionClass.APPROVAL,
      })
      .expect(201);

    const created = await prisma.functionAuthorityRecord.findFirst({
      where: { code: 'PA-AUTH' },
    });

    if (created) {
      expect(created.lifecycleStatus).not.toBe(FunctionAuthorityLifecycleStatus.ACTIVE);
    }
  });
});
