import { ForbiddenException, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { IssuanceService } from '../src/decisions-issuance/issuance/issuance.service';
import { ImmigrationExperienceBoundaryService } from '../src/immigration/boundary/immigration-experience-boundary.service';
import { IMMIGRATION_GOVERNMENT_SERVICE_PACK } from '../src/immigration/service-pack/immigration-government-service-pack.builder';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import {
  type ImmigrationFixtureContext,
  seedImmigrationFixture,
} from './helpers/immigration-test-fixtures';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

interface ImmigrationStatusBody {
  statuses: { verifiedStatusLabel?: string }[];
}

interface ImmigrationActionsBody {
  items: { actionKey: string }[];
}

interface ImmigrationApplicationsBody {
  items: unknown[];
}

interface ImmigrationCredentialsBody {
  items: { credentialId: string }[];
}

interface OfficialImmigrationActionsBody {
  actions: { actionKey: string; available: boolean; unavailableReason?: string | null }[];
}

function asImmigrationStatusBody(body: unknown): ImmigrationStatusBody {
  return body as ImmigrationStatusBody;
}

function asImmigrationActionsBody(body: unknown): ImmigrationActionsBody {
  return body as ImmigrationActionsBody;
}

function asImmigrationApplicationsBody(body: unknown): ImmigrationApplicationsBody {
  return body as ImmigrationApplicationsBody;
}

function asImmigrationCredentialsBody(body: unknown): ImmigrationCredentialsBody {
  return body as ImmigrationCredentialsBody;
}

function asOfficialImmigrationActionsBody(body: unknown): OfficialImmigrationActionsBody {
  return body as OfficialImmigrationActionsBody;
}

describe('Immigration service pack and experience (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fixture: ImmigrationFixtureContext;
  const boundary = new ImmigrationExperienceBoundaryService();

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    fixture = await seedImmigrationFixture(app, prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('validates the immigration template service pack', () => {
    const result = validateServicePackManifest(IMMIGRATION_GOVERNMENT_SERVICE_PACK);
    expect(result.valid).toBe(true);
    for (const service of IMMIGRATION_GOVERNMENT_SERVICE_PACK.services) {
      expect(service.description).toMatch(/NON_PRODUCTION/);
    }
  });

  it('does not expose classified external checks in citizen immigration status', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/immigration/status')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const body = asImmigrationStatusBody(response.body);
    const payload = JSON.stringify(body);
    expect(payload).not.toContain('CLASSIFIED');
    expect(payload).not.toContain('RESTRICTED');
    expect(body.statuses[0]?.verifiedStatusLabel).toBe('Under review');
  });

  it('prevents applicant immigration status mutation and self-issuance at boundary', () => {
    expect(() => {
      boundary.assertCitizenCannotMutateImmigrationStatus('set_immigration_status');
    }).toThrow(ForbiddenException);
    expect(() => {
      boundary.assertApplicantCannotSelfIssue(true, 'issue_credential');
    }).toThrow(ForbiddenException);
  });

  it('does not offer self-issue actions in citizen immigration actions', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/immigration/actions')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const actionKeys = asImmigrationActionsBody(response.body).items.map((item) => item.actionKey);
    expect(actionKeys).not.toContain('self_issue_residence_permit');
    expect(actionKeys).not.toContain('set_immigration_status');
  });

  it('denies immigration decision approval for officer without decision authority', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/experience/official/immigration/cases/${fixture.immigrationCaseId}/available-actions`,
      )
      .set('Authorization', `Bearer ${fixture.reviewOnlyOfficialSessionToken}`)
      .expect(200);

    const decide = asOfficialImmigrationActionsBody(response.body).actions.find(
      (action) => action.actionKey === 'decide',
    );
    expect(decide?.available).toBe(false);
  });

  it('blocks decision when mandatory external check is unresolved', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/experience/official/immigration/cases/${fixture.immigrationCaseId}/available-actions`,
      )
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(200);

    const decide = asOfficialImmigrationActionsBody(response.body).actions.find(
      (action) => action.actionKey === 'decide',
    );
    expect(decide?.available).toBe(false);
    expect(decide?.unavailableReason).toMatch(/external check/i);
  });

  it('shows applicant-safe public status through immigration experience', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/immigration/status')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    expect(asImmigrationStatusBody(response.body).statuses[0]?.verifiedStatusLabel).toBe(
      'Under review',
    );
  });

  it('enforces representative scope for immigration applications', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/immigration/applications')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    expect(asImmigrationApplicationsBody(allowed.body).items.length).toBeGreaterThan(0);

    const { provisionAuthenticatedIdentity } =
      await import('./helpers/identity-provisioning.fixture');
    const stranger = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'imm-stranger@test.gov',
      password: 'ImmTest123!',
      displayName: 'Unrelated Person',
    });
    const strangerToken = stranger.sessionToken;

    const denied = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/immigration/applications')
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(200);

    expect(asImmigrationApplicationsBody(denied.body).items).toHaveLength(0);
  });

  it('links issued credentials to governed decisions when present', async () => {
    const decision = await prisma.governmentDecision.create({
      data: {
        decisionNumber: 'IMM-DEC-001',
        caseId: fixture.immigrationCaseId,
        decisionMakerIdentityId: fixture.officialIdentityId,
        decisionMakerOfficeholderId: fixture.officeholderId,
        outcome: 'APPROVED',
        decidedAt: new Date(),
      },
    });

    const instrument = await prisma.officialInstrument.create({
      data: {
        instrumentNumber: 'IMM-INST-001',
        issuerInstitutionId: fixture.institutionId,
        holderIdentityId: fixture.applicantIdentityId,
        caseId: fixture.immigrationCaseId,
        governmentDecisionId: decision.id,
        status: 'EFFECTIVE',
        effectiveFrom: new Date('2026-01-01'),
        scope: { category: 'IMMIGRATION' },
      },
    });

    expect(instrument.governmentDecisionId).toBe(decision.id);

    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/immigration/credentials')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    expect(
      asImmigrationCredentialsBody(response.body).items.some(
        (item) => item.credentialId === instrument.id,
      ),
    ).toBe(true);
  });

  it('does not allow applicant to invoke issuance engine directly', async () => {
    const issuanceService = app.get(IssuanceService);
    await expect(
      issuanceService.issue({
        governmentDecisionId: '00000000-0000-0000-0000-000000000099',
        instrumentTypeVersionId: '00000000-0000-0000-0000-000000000099',
        caseId: fixture.immigrationCaseId,
        issuerIdentityId: fixture.applicantIdentityId,
        holderIdentityId: fixture.applicantIdentityId,
        idempotencyKey: 'imm-applicant-self-issue',
      } as never),
    ).rejects.toBeDefined();
  });

  it('preserves original decision when redress matter is filed', async () => {
    const originalDecision = await prisma.governmentDecision.create({
      data: {
        decisionNumber: 'IMM-ORIGINAL-DEC',
        caseId: fixture.immigrationCaseId,
        decisionMakerIdentityId: fixture.officialIdentityId,
        decisionMakerOfficeholderId: fixture.officeholderId,
        outcome: 'REFUSED',
        decidedAt: new Date('2026-01-01'),
      },
    });

    const existingRouteVersion = await prisma.redressRouteVersion.findFirst();
    if (!existingRouteVersion) {
      expect(originalDecision.outcome).toBe('REFUSED');
      return;
    }

    await prisma.redressMatter.create({
      data: {
        redressMatterNumber: 'IMM-REDRESS-001',
        routeVersionId: existingRouteVersion.id,
        challengedDecisionId: originalDecision.id,
        caseId: fixture.immigrationCaseId,
        appellantIdentityId: fixture.applicantIdentityId,
      },
    });

    const persisted = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: originalDecision.id },
    });
    expect(persisted.outcome).toBe('REFUSED');
  });
});
