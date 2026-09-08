import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { configureApplication } from '../../src/bootstrap/configure-application';
import { PrismaService } from '../../src/database/prisma.service';
import { overrideRedisService } from '../redis-test-utils';

export async function createIntegrationApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  overrideRedisService(moduleBuilder);

  const moduleFixture: TestingModule = await moduleBuilder.compile();
  const app = moduleFixture.createNestApplication({ bodyParser: false });
  configureApplication(app);
  await app.init();

  const prisma = app.get(PrismaService);

  return { app, prisma };
}

export async function resetGovernmentData(prisma: PrismaService): Promise<void> {
  await prisma.institution.deleteMany();
  await prisma.jurisdiction.deleteMany();
}
