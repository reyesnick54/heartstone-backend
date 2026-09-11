import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type App } from 'supertest/types';

import { AppModule } from '../../src/app.module';
import { configureApplication } from '../../src/bootstrap/configure-application';
import { PrismaService } from '../../src/database/prisma.service';
import { overrideRedisService } from '../redis-test-utils';
import { resetAuthorityData } from './authority-test-reset';
import { resetServiceCatalogData } from './service-catalog-test-reset';

export async function createIntegrationApp(): Promise<{
  app: INestApplication<App>;
  prisma: PrismaService;
}> {
  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  overrideRedisService(moduleBuilder);

  const moduleFixture: TestingModule = await moduleBuilder.compile();
  const app: INestApplication<App> = moduleFixture.createNestApplication({ bodyParser: false });
  configureApplication(app);
  await app.init();

  const prisma = app.get(PrismaService);

  return { app, prisma };
}

export async function resetIdentityData(prisma: PrismaService): Promise<void> {
  await prisma.securityAuditEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.identityOfficeholderLink.deleteMany();
  await prisma.representativeAuthority.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.authenticationMethod.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.identity.deleteMany();
  await prisma.userAccount.deleteMany();
  await prisma.person.deleteMany();
  await prisma.organization.deleteMany();
}

export async function resetServiceCatalogData(prisma: PrismaService): Promise<void> {
  await prisma.serviceActivationRecord.deleteMany();
  await prisma.governmentServiceRedressRoute.deleteMany();
  await prisma.governmentServiceOutputDefinition.deleteMany();
  await prisma.governmentServiceChecklistItem.deleteMany();
  await prisma.governmentServiceEligibilityRule.deleteMany();
  await prisma.governmentServiceFeeDefinition.deleteMany();
  await prisma.serviceFunctionMapping.deleteMany();
  await prisma.governmentServiceVersionApplicantCategory.deleteMany();
  await prisma.governmentServiceVersion.deleteMany();
  await prisma.governmentService.deleteMany();
  await prisma.formVersion.deleteMany();
  await prisma.formDefinition.deleteMany();
  await prisma.serviceFamily.deleteMany();
}

export async function resetGovernmentData(prisma: PrismaService): Promise<void> {
  await resetServicesData(prisma);
  await resetServiceCatalogData(prisma);
  await resetAuthorityData(prisma);
  await prisma.delegationStructuredScope.deleteMany();
  await prisma.delegation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.institutionExternalAuthority.deleteMany();
  await prisma.office.deleteMany();
  await prisma.identityOfficeholderLink.deleteMany();
  await prisma.officeholder.deleteMany();
  await prisma.department.deleteMany();
  await prisma.governmentBody.deleteMany();
  await prisma.externalAuthority.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.jurisdiction.deleteMany();
}

export async function resetAllTestData(prisma: PrismaService): Promise<void> {
  await resetServiceCatalogData(prisma);
  await resetAuthorityData(prisma);
  await resetIdentityData(prisma);
  await resetGovernmentData(prisma);
}
