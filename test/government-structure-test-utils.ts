import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { GovernmentBodyType, RecordStatus } from '../src/common/enums';
import { PrismaService } from '../src/database/prisma.service';
import { overrideRedisService } from './redis-test-utils';

export interface GovernmentStructureFixture {
  jurisdictionId: string;
  institutionAId: string;
  institutionBId: string;
}

interface JurisdictionResponse {
  id: string;
}

interface InstitutionResponse {
  id: string;
}

export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  overrideRedisService(moduleBuilder);

  const moduleFixture: TestingModule = await moduleBuilder.compile();
  const app = moduleFixture.createNestApplication({ bodyParser: false });
  configureApplication(app);
  await app.init();

  return app as INestApplication<App>;
}

export async function resetGovernmentStructureData(app: INestApplication<App>): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.department.deleteMany();
  await prisma.governmentBody.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.jurisdiction.deleteMany();
}

export async function seedGovernmentStructure(
  app: INestApplication<App>,
): Promise<GovernmentStructureFixture> {
  const server = app.getHttpServer();

  const jurisdictionResponse = await request(server)
    .post('/api/v1/jurisdictions')
    .send({
      code: 'TEST-JUR',
      name: 'Test Jurisdiction',
    })
    .expect(201);

  const jurisdiction = jurisdictionResponse.body as JurisdictionResponse;

  const institutionAResponse = await request(server)
    .post('/api/v1/institutions')
    .send({
      jurisdictionId: jurisdiction.id,
      code: 'INST-A',
      name: 'Institution A',
    })
    .expect(201);

  const institutionBResponse = await request(server)
    .post('/api/v1/institutions')
    .send({
      jurisdictionId: jurisdiction.id,
      code: 'INST-B',
      name: 'Institution B',
    })
    .expect(201);

  const institutionA = institutionAResponse.body as InstitutionResponse;
  const institutionB = institutionBResponse.body as InstitutionResponse;

  return {
    jurisdictionId: jurisdiction.id,
    institutionAId: institutionA.id,
    institutionBId: institutionB.id,
  };
}

export { GovernmentBodyType, RecordStatus };
import { type PrismaService } from '../src/database/prisma.service';

export interface GovernmentStructureSeed {
  officeId: string;
  officeholderId: string;
}

export async function seedOfficeAndOfficeholder(
  prisma: PrismaService,
  suffix: string | number = Date.now(),
): Promise<GovernmentStructureSeed> {
  const suffixText = String(suffix);
  const office = await prisma.office.create({
    data: {
      referenceCode: `OFF-${suffixText}`,
      name: `Test Office ${suffixText}`,
    },
  });

  const officeholder = await prisma.officeholder.create({
    data: {
      referenceCode: `HLD-${suffixText}`,
      displayName: `Test Officeholder ${suffixText}`,
    },
  });

  return {
    officeId: office.id,
    officeholderId: officeholder.id,
  };
}

export async function cleanupGovernmentStructureData(prisma: PrismaService): Promise<void> {
  await prisma.appointment.deleteMany();
  await prisma.officeholder.deleteMany();
  await prisma.office.deleteMany();
}
