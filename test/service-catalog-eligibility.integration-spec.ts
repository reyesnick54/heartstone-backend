import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AuthenticationMethodType,
  GovernmentServiceVersionStatus,
  IdentityType,
  ServiceEligibilityRuleCategory,
  ServiceEligibilityRuleOperator,
  ServiceEligibilityRuleStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import {
  ELIGIBILITY_GUIDANCE_DISCLAIMER,
  FORBIDDEN_ELIGIBILITY_OUTCOMES,
} from '../src/service-catalog/service-catalog.constants';
import {
  asIdentityBody,
  asLoginResponseBody,
  asUserAccountBody,
} from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  asEligibilityGuidanceBody,
  asGovernmentServiceBody,
  asGovernmentServiceVersionBody,
  asServiceMatchBody,
} from './helpers/service-catalog-test-types';

describe('Phase 5B Service Eligibility (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminIdentityId: string;
  let adminSessionToken: string;
  let technicalAdminSessionToken: string;

  beforeAll(async () => {
    process.env.SERVICE_CATALOG_ADMIN_IDENTITY_IDS = '';
    const setup = await createIntegrationApp();
    app = setup.app;
    prisma = setup.prisma;
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    const { identityId, sessionToken } = await createIdentityWithSession(
      app,
      'catalog.admin@test.gov',
    );
    adminIdentityId = identityId;
    adminSessionToken = sessionToken;
    process.env.SERVICE_CATALOG_ADMIN_IDENTITY_IDS = adminIdentityId;

    const technical = await createIdentityWithSession(app, 'tech.admin@test.gov');
    technicalAdminSessionToken = technical.sessionToken;
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedServiceWithRules(options?: {
    publishVersion?: boolean;
    supersededVersion?: boolean;
  }) {
    const serviceRes = await request(app.getHttpServer())
      .post('/api/v1/service-catalog/services')
      .send({ code: 'BIZ-LICENSE', name: 'Business License' })
      .expect(201);
    const serviceId = asGovernmentServiceBody(serviceRes.body).id;

    const versionRes = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${serviceId}/versions`)
      .send({
        versionLabel: '1.0.0',
        effectiveFrom: '2020-01-01T00:00:00.000Z',
        status: GovernmentServiceVersionStatus.DRAFT,
      })
      .expect(201);
    const versionId = asGovernmentServiceVersionBody(versionRes.body).id;

    if (options?.supersededVersion) {
      const oldVersionRes = await request(app.getHttpServer())
        .post(`/api/v1/service-catalog/services/${serviceId}/versions`)
        .send({
          versionLabel: '0.9.0',
          effectiveFrom: '2019-01-01T00:00:00.000Z',
          status: GovernmentServiceVersionStatus.PUBLISHED,
        })
        .expect(201);

      const oldVersionId = asGovernmentServiceVersionBody(oldVersionRes.body).id;

      await prisma.governmentServiceVersion.update({
        where: { id: oldVersionId },
        data: {
          status: GovernmentServiceVersionStatus.SUPERSEDED,
          effectiveUntil: new Date('2019-12-31T23:59:59.999Z'),
        },
      });

      await prisma.serviceEligibilityRule.create({
        data: {
          governmentServiceVersionId: oldVersionId,
          category: ServiceEligibilityRuleCategory.APPLICANT_CATEGORY,
          attributeKey: 'applicantCategory',
          operator: ServiceEligibilityRuleOperator.EQUALS,
          expectedValue: { value: 'SUPERSEDED_ONLY' },
          reasonCode: 'SUPERSEDED_RULE',
          effectiveFrom: new Date('2019-01-01'),
          status: ServiceEligibilityRuleStatus.ACTIVE,
        },
      });
    }

    await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${serviceId}/versions/${versionId}/eligibility-rules`)
      .set('Authorization', `Bearer ${adminSessionToken}`)
      .send({
        category: ServiceEligibilityRuleCategory.APPLICANT_CATEGORY,
        attributeKey: 'applicantCategory',
        operator: ServiceEligibilityRuleOperator.EQUALS,
        expectedValue: { value: 'INDIVIDUAL' },
        reasonCode: 'APPLICANT_CATEGORY_MATCH',
        effectiveFrom: '2020-01-01T00:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${serviceId}/versions/${versionId}/eligibility-rules`)
      .set('Authorization', `Bearer ${adminSessionToken}`)
      .send({
        category: ServiceEligibilityRuleCategory.EXCLUSION,
        attributeKey: 'activity',
        operator: ServiceEligibilityRuleOperator.EQUALS,
        expectedValue: { value: 'GAMBLING' },
        reasonCode: 'EXCLUDED_ACTIVITY',
        effectiveFrom: '2020-01-01T00:00:00.000Z',
      })
      .expect(201);

    if (options?.publishVersion ?? true) {
      await request(app.getHttpServer())
        .post(`/api/v1/service-catalog/services/${serviceId}/versions/${versionId}/publish`)
        .expect(201);
    }

    return { serviceId, versionId };
  }

  it('evaluates applicant category and records exact service version', async () => {
    const { serviceId, versionId } = await seedServiceWithRules();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${serviceId}/eligibility/check`)
      .send({ facts: { applicantCategory: 'INDIVIDUAL' } })
      .expect(201);

    const guidance = asEligibilityGuidanceBody(res.body);
    expect(guidance.outcome).toBe('LIKELY_ELIGIBLE');
    expect(guidance.governmentServiceVersionId).toBe(versionId);
    expect(guidance.disclaimer).toBe(ELIGIBILITY_GUIDANCE_DISCLAIMER);
    expect(FORBIDDEN_ELIGIBILITY_OUTCOMES).not.toContain(guidance.outcome);
  });

  it('returns OUTSIDE_PUBLISHED_SCOPE for excluded activity', async () => {
    const { serviceId } = await seedServiceWithRules();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${serviceId}/eligibility/check`)
      .send({ facts: { applicantCategory: 'INDIVIDUAL', activity: 'GAMBLING' } })
      .expect(201);

    const guidance = asEligibilityGuidanceBody(res.body);
    expect(guidance.outcome).toBe('OUTSIDE_PUBLISHED_SCOPE');
    expect(guidance.excludedActivity).toBe('GAMBLING');
  });

  it('returns MORE_INFORMATION_REQUIRED for missing facts', async () => {
    const { serviceId } = await seedServiceWithRules();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${serviceId}/eligibility/check`)
      .send({ facts: {} })
      .expect(201);

    const guidance = asEligibilityGuidanceBody(res.body);
    expect(guidance.outcome).toBe('MORE_INFORMATION_REQUIRED');
    expect(guidance.missingFacts.length).toBeGreaterThan(0);
  });

  it('does not use superseded version rules for new checks', async () => {
    const { serviceId, versionId } = await seedServiceWithRules({ supersededVersion: true });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${serviceId}/eligibility/check`)
      .send({ facts: { applicantCategory: 'SUPERSEDED_ONLY' } })
      .expect(201);

    const guidance = asEligibilityGuidanceBody(res.body);
    // A superseded-only rule would have matched this value as eligible; the current
    // published version instead requires INDIVIDUAL and must be used for the check.
    expect(guidance.outcome).toBe('LIKELY_INELIGIBLE');
    expect(guidance.governmentServiceVersionId).toBe(versionId);
    expect(guidance.matchedRules).toHaveLength(0);
  });

  it('never returns APPROVED and always includes disclaimer', async () => {
    const { serviceId } = await seedServiceWithRules();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${serviceId}/eligibility/check`)
      .send({ facts: { applicantCategory: 'INDIVIDUAL' } })
      .expect(201);

    const guidance = asEligibilityGuidanceBody(res.body);
    expect(guidance.outcome).not.toBe('APPROVED');
    expect(guidance.disclaimer).toContain('preliminary eligibility guidance');
    expect(guidance.disclaimer).toContain('does not guarantee approval');
  });

  it('rejects technical admin without authorized admin path for rule creation', async () => {
    const { serviceId, versionId } = await seedServiceWithRules({ publishVersion: false });

    await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${serviceId}/versions/${versionId}/eligibility-rules`)
      .set('Authorization', `Bearer ${technicalAdminSessionToken}`)
      .send({
        category: ServiceEligibilityRuleCategory.ENTITY_TYPE,
        attributeKey: 'entityType',
        operator: ServiceEligibilityRuleOperator.EQUALS,
        expectedValue: { value: 'CORPORATION' },
        reasonCode: 'ENTITY_TYPE_MATCH',
        effectiveFrom: '2020-01-01T00:00:00.000Z',
      })
      .expect(403);
  });

  it('rejects malformed rule configuration at creation', async () => {
    const { serviceId, versionId } = await seedServiceWithRules({ publishVersion: false });

    await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${serviceId}/versions/${versionId}/eligibility-rules`)
      .set('Authorization', `Bearer ${adminSessionToken}`)
      .send({
        category: ServiceEligibilityRuleCategory.APPLICANT_CATEGORY,
        attributeKey: 'applicantCategory',
        operator: ServiceEligibilityRuleOperator.EQUALS,
        reasonCode: 'MISSING_VALUE',
        effectiveFrom: '2020-01-01T00:00:00.000Z',
      })
      .expect(400);
  });

  it('lists published eligibility rules publicly', async () => {
    const { serviceId } = await seedServiceWithRules();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/service-catalog/services/${serviceId}/eligibility-rules`)
      .expect(200);

    expect(res.body).toHaveLength(2);
  });

  it('provides service matching navigation assistance', async () => {
    await seedServiceWithRules();

    const res = await request(app.getHttpServer())
      .post('/api/v1/service-catalog/match')
      .send({ applicantCategory: 'INDIVIDUAL' })
      .expect(201);

    const match = asServiceMatchBody(res.body);
    expect(match.primaryService?.code).toBe('BIZ-LICENSE');
    expect(match.disclaimer).toContain('navigation assistance only');
  });

  it('does not let OIDC session roles affect public eligibility checks', async () => {
    const { serviceId } = await seedServiceWithRules();

    const unauthenticated = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${serviceId}/eligibility/check`)
      .send({ facts: { applicantCategory: 'INDIVIDUAL' } })
      .expect(201);

    const withSession = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${serviceId}/eligibility/check`)
      .set('Authorization', `Bearer ${technicalAdminSessionToken}`)
      .send({ facts: { applicantCategory: 'INDIVIDUAL' } })
      .expect(201);

    expect(asEligibilityGuidanceBody(withSession.body).outcome).toBe(
      asEligibilityGuidanceBody(unauthenticated.body).outcome,
    );
  });

  it('audits administrative eligibility rule changes', async () => {
    const { versionId } = await seedServiceWithRules({ publishVersion: false });

    const auditsBefore = await prisma.serviceEligibilityRuleAudit.count();
    expect(auditsBefore).toBeGreaterThan(0);

    const rules = await prisma.serviceEligibilityRule.findMany({
      where: { governmentServiceVersionId: versionId },
    });
    const ruleId = rules[0]?.id;
    expect(ruleId).toBeDefined();
    if (!ruleId) {
      throw new Error('Expected eligibility rule to exist');
    }

    await request(app.getHttpServer())
      .patch(`/api/v1/service-catalog/eligibility-rules/${ruleId}`)
      .set('Authorization', `Bearer ${adminSessionToken}`)
      .send({ priority: 5 })
      .expect(200);

    const auditsAfter = await prisma.serviceEligibilityRuleAudit.count();
    expect(auditsAfter).toBeGreaterThan(auditsBefore);
  });
});

async function createIdentityWithSession(
  app: INestApplication<App>,
  loginIdentifier: string,
): Promise<{ identityId: string; sessionToken: string }> {
  const accountRes = await request(app.getHttpServer())
    .post('/api/v1/identity/user-accounts')
    .send({ loginIdentifier, status: AccountStatus.ACTIVE })
    .expect(201);
  const account = asUserAccountBody(accountRes.body);

  const identityRes = await request(app.getHttpServer())
    .post('/api/v1/identity/identities')
    .send({
      type: IdentityType.INDIVIDUAL,
      displayName: loginIdentifier,
      userAccountId: account.id,
    })
    .expect(201);
  const identity = asIdentityBody(identityRes.body);

  await request(app.getHttpServer())
    .post('/api/v1/identity/credentials')
    .send({ identityId: identity.id, type: 'PASSWORD', password: 'SecurePass123!' })
    .expect(201);

  await request(app.getHttpServer())
    .post('/api/v1/identity/authentication-methods')
    .send({ identityId: identity.id, type: AuthenticationMethodType.PASSWORD })
    .expect(201);

  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/identity/auth/login')
    .send({ loginIdentifier, password: 'SecurePass123!' })
    .expect(201);
  const login = asLoginResponseBody(loginRes.body);

  return { identityId: identity.id, sessionToken: login.sessionToken };
}
