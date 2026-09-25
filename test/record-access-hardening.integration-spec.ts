import { randomUUID } from 'node:crypto';

import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import {
  authHeader,
  provisionAuthenticatedIdentity,
} from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Record access hardening (S6 integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks cross-citizen immigration subject profile reads (IDOR)', async () => {
    const citizenA = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'imm-a@test.gov',
      password: 'ImmCitizenA123!',
    });
    const citizenB = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'imm-b@test.gov',
      password: 'ImmCitizenB123!',
    });

    await prisma.immigrationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber: `IMM-${randomUUID().slice(0, 8)}`,
        subjectIdentityId: citizenA.identityId,
      },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/immigration/profiles/subject/${citizenA.identityId}`)
      .set(authHeader(citizenB.sessionToken))
      .expect(404);
  });

  it('allows citizens to read their own immigration subject profile', async () => {
    const citizen = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'imm-self@test.gov',
      password: 'ImmSelf123!',
    });

    await prisma.immigrationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber: `IMM-${randomUUID().slice(0, 8)}`,
        subjectIdentityId: citizen.identityId,
      },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/immigration/profiles/subject/${citizen.identityId}`)
      .set(authHeader(citizen.sessionToken))
      .expect(200);
  });

  it('blocks cross-citizen driver profile reads', async () => {
    const owner = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'driver-owner@test.gov',
      password: 'DriverOwner123!',
    });
    const intruder = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'driver-intruder@test.gov',
      password: 'DriverIntruder123!',
    });

    await prisma.driverProfile.create({
      data: {
        id: randomUUID(),
        profileNumber: `DRV-${randomUUID().slice(0, 8)}`,
        subjectIdentityId: owner.identityId,
      },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/transportation/driver-profiles/subject/${owner.identityId}`)
      .set(authHeader(intruder.sessionToken))
      .expect(404);
  });

  it('blocks cross-worker labour profile reference reads', async () => {
    const worker = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'worker-a@test.gov',
      password: 'WorkerA123!',
    });
    const other = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'worker-b@test.gov',
      password: 'WorkerB123!',
    });

    const profile = await prisma.workerProfileReference.create({
      data: {
        id: randomUUID(),
        profileReferenceNumber: `WPR-${randomUUID().slice(0, 8)}`,
        workerIdentityId: worker.identityId,
      },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/labour/workers/profile-references/${profile.id}`)
      .set(authHeader(other.sessionToken))
      .expect(404);
  });

  it('blocks cross-student education profile reads', async () => {
    const student = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'student-a@test.gov',
      password: 'StudentA123!',
    });
    const other = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'student-b@test.gov',
      password: 'StudentB123!',
    });

    const profile = await prisma.studentEducationProfile.create({
      data: {
        id: randomUUID(),
        profileReferenceNumber: `SEP-${randomUUID().slice(0, 8)}`,
        studentIdentityId: student.identityId,
        studentAccountIsNotEnrollment: true,
      },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/education/students/profiles/${profile.id}`)
      .set(authHeader(other.sessionToken))
      .expect(404);
  });

  it('rejects client-supplied requesterIdentityId query parameters', async () => {
    const citizen = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'forged-query@test.gov',
      password: 'ForgedQuery123!',
    });
    const victim = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'victim-query@test.gov',
      password: 'VictimQuery123!',
    });

    await prisma.immigrationProfile.create({
      data: {
        id: randomUUID(),
        profileNumber: `IMM-${randomUUID().slice(0, 8)}`,
        subjectIdentityId: victim.identityId,
      },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/immigration/profiles/subject/${victim.identityId}`)
      .query({ requesterIdentityId: citizen.identityId })
      .set(authHeader(citizen.sessionToken))
      .expect(404);
  });
});
