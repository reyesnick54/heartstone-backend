import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { DelegationStatus, InstitutionType, JurisdictionType } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { PrismaService } from '../src/database/prisma.service';
import { overrideRedisService } from './redis-test-utils';

interface DelegationPartyResponse {
  type: string;
  id: string;
}

interface DelegationResponseBody {
  id: string;
  referenceCode: string;
  sourceReference: string;
  scopeDescription: string;
  status: DelegationStatus;
  delegator: DelegationPartyResponse;
  recipient: DelegationPartyResponse;
  notes?: string | null;
}

interface ErrorResponseBody {
  message: string | string[];
}

describe('Delegations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let institutionId: string;
  let officeId: string;
  let officeholderId: string;

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    overrideRedisService(moduleBuilder);

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApplication(app);
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.delegation.deleteMany();
    await prisma.institution.deleteMany();
    await prisma.jurisdiction.deleteMany();
    await prisma.office.deleteMany();
    await prisma.officeholder.deleteMany();

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'NAT-TEST',
        name: 'Test National Jurisdiction',
        type: JurisdictionType.NATIONAL,
      },
    });

    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'MIN-HEALTH',
        name: 'Ministry of Health',
        type: InstitutionType.MINISTRY,
      },
    });
    institutionId = institution.id;

    const office = await prisma.office.create({
      data: { referenceCode: 'DIR-PERMITS', name: 'Director of Permits' },
    });
    officeId = office.id;

    const officeholder = await prisma.officeholder.create({
      data: { referenceCode: 'OH-001', displayName: 'Jane Smith' },
    });
    officeholderId = officeholder.id;
  });

  afterAll(async () => {
    await prisma.delegation.deleteMany();
    await prisma.institution.deleteMany();
    await prisma.jurisdiction.deleteMany();
    await prisma.office.deleteMany();
    await prisma.officeholder.deleteMany();
    await app.close();
  });

  const validPayload = (overrides: Record<string, unknown> = {}) => ({
    referenceCode: `DEL-${String(Date.now())}-${Math.random().toString(36).slice(2, 7)}`,
    sourceReference: 'Statutory Instrument 2026/42, Section 12',
    scopeDescription: 'Administrative processing of permit applications',
    status: DelegationStatus.ACTIVE,
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    delegator: { institutionId },
    recipient: { officeId },
    ...overrides,
  });

  it('creates valid Institution -> Office delegation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(validPayload({ referenceCode: 'DEL-INST-OFFICE' }))
      .expect(201);

    const body = response.body as DelegationResponseBody;

    expect(body).toMatchObject({
      referenceCode: 'DEL-INST-OFFICE',
      sourceReference: 'Statutory Instrument 2026/42, Section 12',
      scopeDescription: 'Administrative processing of permit applications',
      status: DelegationStatus.ACTIVE,
      delegator: { type: 'institution', id: institutionId },
      recipient: { type: 'office', id: officeId },
    });
    expect(body).not.toHaveProperty('authority');
    expect(body).not.toHaveProperty('permissions');
    expect(body).not.toHaveProperty('decisionRights');
    expect(body).not.toHaveProperty('signatureRights');
    expect(body).not.toHaveProperty('approvalRights');
    expect(body).not.toHaveProperty('issuanceRights');
  });

  it('creates valid Office -> Officeholder delegation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(
        validPayload({
          referenceCode: 'DEL-OFFICE-HOLDER',
          delegator: { officeId },
          recipient: { officeholderId },
        }),
      )
      .expect(201);

    const body = response.body as DelegationResponseBody;
    expect(body.delegator).toEqual({ type: 'office', id: officeId });
    expect(body.recipient).toEqual({ type: 'officeholder', id: officeholderId });
  });

  it('creates valid Officeholder -> Office delegation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(
        validPayload({
          referenceCode: 'DEL-HOLDER-OFFICE',
          delegator: { officeholderId },
          recipient: { officeId },
        }),
      )
      .expect(201);

    const body = response.body as DelegationResponseBody;
    expect(body.delegator).toEqual({ type: 'officeholder', id: officeholderId });
    expect(body.recipient).toEqual({ type: 'office', id: officeId });
  });

  it('rejects multiple delegator targets', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(
        validPayload({
          delegator: { institutionId, officeId },
        }),
      )
      .expect(400);

    const body = response.body as ErrorResponseBody;
    expect(body.message).toContain('Only one delegator target may be specified');
  });

  it('rejects zero delegator targets', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(
        validPayload({
          delegator: {},
        }),
      )
      .expect(400);

    const body = response.body as ErrorResponseBody;
    expect(body.message).toContain('Exactly one delegator target is required');
  });

  it('rejects multiple recipient targets', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(
        validPayload({
          recipient: { officeId, officeholderId },
        }),
      )
      .expect(400);

    const body = response.body as ErrorResponseBody;
    expect(body.message).toContain('Only one recipient target may be specified');
  });

  it('rejects zero recipient targets', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(
        validPayload({
          recipient: {},
        }),
      )
      .expect(400);

    const body = response.body as ErrorResponseBody;
    expect(body.message).toContain('Exactly one recipient target is required');
  });

  it('rejects missing source reference', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(validPayload({ sourceReference: '' }))
      .expect(400);

    const body = response.body as ErrorResponseBody;
    expect(body.message).toBeDefined();
  });

  it('rejects missing scope description', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(validPayload({ scopeDescription: '' }))
      .expect(400);

    const body = response.body as ErrorResponseBody;
    expect(body.message).toBeDefined();
  });

  it('rejects invalid effective dates', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(
        validPayload({
          effectiveFrom: '2026-12-01T00:00:00.000Z',
          effectiveUntil: '2026-01-01T00:00:00.000Z',
        }),
      )
      .expect(400);

    const body = response.body as ErrorResponseBody;
    expect(body.message).toContain('effectiveUntil cannot precede effectiveFrom');
  });

  it('rejects self-delegation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(
        validPayload({
          delegator: { officeId },
          recipient: { officeId },
        }),
      )
      .expect(400);

    const body = response.body as ErrorResponseBody;
    expect(body.message).toContain('Delegation cannot delegate to itself');
  });

  it('keeps revoked record retrievable', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(validPayload({ referenceCode: 'DEL-REVOKED' }))
      .expect(201);

    const created = createResponse.body as DelegationResponseBody;
    const delegationId = created.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/delegations/${delegationId}`)
      .send({ status: DelegationStatus.REVOKED, notes: 'Revoked by order' })
      .expect(200);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/v1/delegations/${delegationId}`)
      .expect(200);

    const body = getResponse.body as DelegationResponseBody;
    expect(body.status).toBe(DelegationStatus.REVOKED);
    expect(body.notes).toBe('Revoked by order');
  });

  it('filters by status and effective date', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(
        validPayload({
          referenceCode: 'DEL-FILTER',
          status: DelegationStatus.PLANNED,
          effectiveFrom: '2026-03-01T00:00:00.000Z',
          effectiveUntil: '2026-09-30T23:59:59.999Z',
        }),
      )
      .expect(201);

    const byStatus = await request(app.getHttpServer())
      .get('/api/v1/delegations')
      .query({ status: DelegationStatus.PLANNED })
      .expect(200);

    const statusResults = byStatus.body as DelegationResponseBody[];
    expect(statusResults.some((d) => d.referenceCode === 'DEL-FILTER')).toBe(true);

    const byEffective = await request(app.getHttpServer())
      .get('/api/v1/delegations')
      .query({ effectiveOn: '2026-06-15T00:00:00.000Z' })
      .expect(200);

    const effectiveResults = byEffective.body as DelegationResponseBody[];
    expect(effectiveResults.some((d) => d.referenceCode === 'DEL-FILTER')).toBe(true);
  });

  it('does not expose DELETE endpoint', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .send(validPayload({ referenceCode: 'DEL-NO-DELETE' }))
      .expect(201);

    const created = createResponse.body as DelegationResponseBody;

    await request(app.getHttpServer()).delete(`/api/v1/delegations/${created.id}`).expect(404);
  });
});
