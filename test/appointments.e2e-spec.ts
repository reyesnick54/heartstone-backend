import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { PrismaService } from '../src/database/prisma.service';
import {
  cleanupGovernmentStructureData,
  seedOfficeAndOfficeholder,
} from './government-structure-test-utils';
import { overrideRedisService } from './redis-test-utils';

interface AppointmentResponseBody {
  id: string;
  officeId: string;
  officeholderId: string;
  referenceCode: string;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  effectiveFrom: string;
  effectiveUntil: string | null;
}

describe('Appointments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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
    await cleanupGovernmentStructureData(prisma);
  });

  afterAll(async () => {
    await cleanupGovernmentStructureData(prisma);
    await app.close();
  });

  afterEach(async () => {
    await cleanupGovernmentStructureData(prisma);
  });

  it('creates a valid appointment', async () => {
    const seed = await seedOfficeAndOfficeholder(prisma, 'valid');

    const response = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({
        officeId: seed.officeId,
        officeholderId: seed.officeholderId,
        referenceCode: 'APPT-VALID-001',
        appointmentType: AppointmentType.PERMANENT,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      officeId: seed.officeId,
      officeholderId: seed.officeholderId,
      referenceCode: 'APPT-VALID-001',
      appointmentType: AppointmentType.PERMANENT,
      status: AppointmentStatus.ACTIVE,
    });
  });

  it('rejects an invalid office', async () => {
    const seed = await seedOfficeAndOfficeholder(prisma, 'invalid-office');

    await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({
        officeId: 'missing-office-id',
        officeholderId: seed.officeholderId,
        referenceCode: 'APPT-INVALID-OFFICE',
        appointmentType: AppointmentType.ACTING,
        status: AppointmentStatus.PLANNED,
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      })
      .expect(404);
  });

  it('rejects an invalid officeholder', async () => {
    const seed = await seedOfficeAndOfficeholder(prisma, 'invalid-holder');

    await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({
        officeId: seed.officeId,
        officeholderId: 'missing-holder-id',
        referenceCode: 'APPT-INVALID-HOLDER',
        appointmentType: AppointmentType.ACTING,
        status: AppointmentStatus.PLANNED,
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      })
      .expect(404);
  });

  it('rejects an invalid date period', async () => {
    const seed = await seedOfficeAndOfficeholder(prisma, 'invalid-period');

    await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({
        officeId: seed.officeId,
        officeholderId: seed.officeholderId,
        referenceCode: 'APPT-INVALID-PERIOD',
        appointmentType: AppointmentType.FIXED_TERM,
        status: AppointmentStatus.PLANNED,
        effectiveFrom: '2026-06-01T00:00:00.000Z',
        effectiveUntil: '2026-01-01T00:00:00.000Z',
      })
      .expect(400);
  });

  it('preserves ended appointments', async () => {
    const seed = await seedOfficeAndOfficeholder(prisma, 'ended');

    const created = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({
        officeId: seed.officeId,
        officeholderId: seed.officeholderId,
        referenceCode: 'APPT-ENDED-001',
        appointmentType: AppointmentType.FIXED_TERM,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      })
      .expect(201);

    const createdBody = created.body as AppointmentResponseBody;

    await request(app.getHttpServer())
      .patch(`/api/v1/appointments/${createdBody.id}`)
      .send({
        status: AppointmentStatus.ENDED,
        effectiveUntil: '2026-12-31T23:59:59.999Z',
      })
      .expect(200);

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/appointments/${createdBody.id}`)
      .expect(200);

    const fetchedBody = fetched.body as AppointmentResponseBody;

    expect(fetchedBody.status).toBe(AppointmentStatus.ENDED);
    expect(fetchedBody.effectiveUntil).toBe('2026-12-31T23:59:59.999Z');
  });

  it('preserves revoked appointments', async () => {
    const seed = await seedOfficeAndOfficeholder(prisma, 'revoked');

    const createdBody = (
      await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          officeId: seed.officeId,
          officeholderId: seed.officeholderId,
          referenceCode: 'APPT-REVOKED-001',
          appointmentType: AppointmentType.INTERIM,
          status: AppointmentStatus.ACTIVE,
          effectiveFrom: '2026-01-01T00:00:00.000Z',
        })
        .expect(201)
    ).body as AppointmentResponseBody;

    await request(app.getHttpServer())
      .patch(`/api/v1/appointments/${createdBody.id}`)
      .send({ status: AppointmentStatus.REVOKED })
      .expect(200);

    const listed = await request(app.getHttpServer())
      .get('/api/v1/appointments')
      .query({ status: AppointmentStatus.REVOKED })
      .expect(200);

    const listedBody = listed.body as AppointmentResponseBody[];

    expect(listedBody).toHaveLength(1);
    expect(listedBody[0]?.referenceCode).toBe('APPT-REVOKED-001');
  });

  it('returns current appointments for office and officeholder queries', async () => {
    const seed = await seedOfficeAndOfficeholder(prisma, 'current');

    await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({
        officeId: seed.officeId,
        officeholderId: seed.officeholderId,
        referenceCode: 'APPT-CURRENT-001',
        appointmentType: AppointmentType.PERMANENT,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: '2020-01-01T00:00:00.000Z',
      })
      .expect(201);

    const byOffice = await request(app.getHttpServer())
      .get(`/api/v1/appointments/current/by-office/${seed.officeId}`)
      .expect(200);

    const byOfficeholder = await request(app.getHttpServer())
      .get(`/api/v1/appointments/current/by-officeholder/${seed.officeholderId}`)
      .expect(200);

    const byOfficeBody = byOffice.body as AppointmentResponseBody[];
    const byOfficeholderBody = byOfficeholder.body as AppointmentResponseBody[];

    expect(byOfficeBody).toHaveLength(1);
    expect(byOfficeholderBody).toHaveLength(1);
    expect(byOfficeBody[0]?.referenceCode).toBe('APPT-CURRENT-001');
  });

  it('does not infer authority-related records when creating an appointment', async () => {
    const seed = await seedOfficeAndOfficeholder(prisma, 'no-authority');
    const officeholderBefore = await prisma.officeholder.findUniqueOrThrow({
      where: { id: seed.officeholderId },
    });

    await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({
        officeId: seed.officeId,
        officeholderId: seed.officeholderId,
        referenceCode: 'APPT-NO-AUTHORITY',
        appointmentType: AppointmentType.EX_OFFICIO,
        status: AppointmentStatus.PLANNED,
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      })
      .expect(201);

    const appointmentCount = await prisma.appointment.count();
    const officeholderAfter = await prisma.officeholder.findUniqueOrThrow({
      where: { id: seed.officeholderId },
    });

    expect(appointmentCount).toBe(1);
    expect(officeholderAfter).toEqual(officeholderBefore);
    expect(Object.keys(officeholderAfter)).not.toContain('userId');
    expect(Object.keys(prisma)).not.toContain('authority');
    expect(Object.keys(prisma)).not.toContain('role');
    expect(Object.keys(prisma)).not.toContain('permission');
  });

  it('does not expose a delete endpoint', async () => {
    const seed = await seedOfficeAndOfficeholder(prisma, 'no-delete');

    const createdBody = (
      await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          officeId: seed.officeId,
          officeholderId: seed.officeholderId,
          referenceCode: 'APPT-NO-DELETE',
          appointmentType: AppointmentType.TEMPORARY,
          status: AppointmentStatus.PLANNED,
          effectiveFrom: '2026-01-01T00:00:00.000Z',
        })
        .expect(201)
    ).body as AppointmentResponseBody;

    await request(app.getHttpServer()).delete(`/api/v1/appointments/${createdBody.id}`).expect(404);

    const stillPresentBody = (
      await request(app.getHttpServer()).get(`/api/v1/appointments/${createdBody.id}`).expect(200)
    ).body as AppointmentResponseBody;

    expect(stillPresentBody.id).toBe(createdBody.id);
  });

  it('filters appointments by officeId, officeholderId, status, and appointmentType', async () => {
    const seed = await seedOfficeAndOfficeholder(prisma, 'filters');

    await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({
        officeId: seed.officeId,
        officeholderId: seed.officeholderId,
        referenceCode: 'APPT-FILTER-001',
        appointmentType: AppointmentType.OTHER,
        status: AppointmentStatus.SUSPENDED,
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/v1/appointments')
      .query({
        officeId: seed.officeId,
        officeholderId: seed.officeholderId,
        status: AppointmentStatus.SUSPENDED,
        appointmentType: AppointmentType.OTHER,
      })
      .expect(200);

    const responseBody = response.body as AppointmentResponseBody[];

    expect(responseBody).toHaveLength(1);
    expect(responseBody[0]?.referenceCode).toBe('APPT-FILTER-001');
  });
});
