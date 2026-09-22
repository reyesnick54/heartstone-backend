import { randomUUID } from 'node:crypto';

import { type INestApplication } from '@nestjs/common';
import { BenefitCategoryKind, BenefitProgramStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { SOCIAL_PROTECTION_SERVICE_PACK_TEMPLATE } from '../src/service-catalog/service-packs/social-protection-service-pack.template';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import { BenefitApplicantProfileService } from '../src/social-protection/profiles/benefit-applicant-profile.service';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Social Protection & Public Benefits service pack and experience (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('validates the social protection service pack manifest and NON_PRODUCTION services', () => {
    const result = validateServicePackManifest(SOCIAL_PROTECTION_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(SOCIAL_PROTECTION_SERVICE_PACK_TEMPLATE.services).toHaveLength(15);
    for (const service of SOCIAL_PROTECTION_SERVICE_PACK_TEMPLATE.services) {
      expect(service.description).toMatch(/NON_PRODUCTION/);
    }
  });

  it('exposes citizen benefits home for registered applicant profile', async () => {
    const citizen = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'citizen-ben@test.local',
      password: 'CitizenBen123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-BEN-TEST',
        name: 'Benefits Test Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const applicants = app.get(BenefitApplicantProfileService);
    await applicants.createBenefitApplicantProfile({
      primaryApplicantIdentityId: citizen.identityId,
      jurisdictionId: jurisdiction.id,
    });

    const home = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/benefits')
        .set('Authorization', `Bearer ${citizen.sessionToken}`)
        .expect(200)
    ).body as { ruleEnvironment: string; profileReferenceNumber: string };

    expect(home.profileReferenceNumber).toMatch(/^BNPF-/);
    expect(home.ruleEnvironment).toBe('NON_PRODUCTION');
  });

  it('does not leak sensitive programs in generic citizen program discovery', async () => {
    const citizen = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'citizen-ben-cat@test.local',
      password: 'CitizenBenCat123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-BEN-CAT',
        name: 'Benefits Catalog Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const applicants = app.get(BenefitApplicantProfileService);
    await applicants.createBenefitApplicantProfile({
      primaryApplicantIdentityId: citizen.identityId,
      jurisdictionId: jurisdiction.id,
    });

    const publicCategory = await prisma.benefitCategory.create({
      data: {
        id: randomUUID(),
        categoryCode: 'CAT-PUBLIC-TEST',
        categoryKind: BenefitCategoryKind.INCOME_SUPPORT,
        displayLabel: 'Public income support',
        jurisdictionId: jurisdiction.id,
      },
    });

    const sensitiveCategory = await prisma.benefitCategory.create({
      data: {
        id: randomUUID(),
        categoryCode: 'CAT-SENSITIVE-TEST',
        categoryKind: BenefitCategoryKind.VETERAN_SUPPORT,
        displayLabel: 'Sensitive veteran support',
        jurisdictionId: jurisdiction.id,
      },
    });

    await prisma.benefitProgram.createMany({
      data: [
        {
          id: randomUUID(),
          programCode: 'BEN-PUBLIC-TEST',
          programName: 'Public Test Program',
          benefitCategoryId: publicCategory.id,
          jurisdictionId: jurisdiction.id,
          status: BenefitProgramStatus.ACTIVE,
        },
        {
          id: randomUUID(),
          programCode: 'BEN-SENSITIVE-TEST',
          programName: 'Sensitive Test Program',
          benefitCategoryId: sensitiveCategory.id,
          jurisdictionId: jurisdiction.id,
          status: BenefitProgramStatus.ACTIVE,
        },
      ],
    });

    const programs = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/benefits/programs')
        .set('Authorization', `Bearer ${citizen.sessionToken}`)
        .expect(200)
    ).body as { programCode: string }[];

    expect(programs.map((p) => p.programCode)).toEqual(['BEN-PUBLIC-TEST']);
  });
});
