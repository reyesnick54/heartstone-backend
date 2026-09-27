import { type INestApplication } from '@nestjs/common';
import {
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  SetupConfigurationLayer,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { AbsezSetupBootstrapService } from '../src/setup/bootstrap/absez-setup-bootstrap.service';
import { ABSEZ_ADVISORY_AGENCIES } from '../src/setup/data/absez-advisory-agencies.data';
import { ABSEZ_ARTICLE9_DEPARTMENTS } from '../src/setup/data/absez-article9-departments.data';
import { ABSEZ_CASE_CATEGORIES } from '../src/setup/data/absez-case-categories.data';
import { ABSEZ_DELEGATED_FUNCTIONS } from '../src/setup/data/absez-delegated-functions.data';
import { ABSEZ_ESCALATION_LEVELS } from '../src/setup/data/absez-escalation-levels.data';
import { ABSEZ_GOVERNING_SOURCES } from '../src/setup/data/absez-governing-sources.data';
import { ABSEZ_SERVICE_STANDARDS } from '../src/setup/data/absez-service-standards.data';
import { ABSEZ_INSTITUTION_CODE, ANTIGUA_JURISDICTION_CODE } from '../src/setup/setup.constants';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Remediation S11 — ABSEZ layered setup (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bootstrap: AbsezSetupBootstrapService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    bootstrap = app.get(AbsezSetupBootstrapService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await resetAllTestData(prisma);
    await app.close();
  });

  async function assertAbsezInstallationCounts(): Promise<void> {
    const jurisdiction = await prisma.jurisdiction.findUnique({
      where: { code: ANTIGUA_JURISDICTION_CODE },
    });
    expect(jurisdiction).not.toBeNull();

    if (!jurisdiction) {
      throw new Error('Expected Antigua and Barbuda jurisdiction to exist');
    }

    const institution = await prisma.institution.findFirst({
      where: { code: ABSEZ_INSTITUTION_CODE, jurisdictionId: jurisdiction.id },
    });
    if (!institution) {
      throw new Error('Expected ABSEZ institution to exist');
    }

    expect(await prisma.setupConfigurationPackage.count()).toBe(3);
    expect(
      await prisma.setupConfigurationInstallation.count({
        where: { layer: SetupConfigurationLayer.PLATFORM },
      }),
    ).toBe(1);
    expect(
      await prisma.setupConfigurationInstallation.count({
        where: { layer: SetupConfigurationLayer.JURISDICTION },
      }),
    ).toBe(1);
    expect(
      await prisma.setupConfigurationInstallation.count({
        where: { layer: SetupConfigurationLayer.INSTITUTION },
      }),
    ).toBe(1);

    expect(await prisma.department.count({ where: { institutionId: institution.id } })).toBe(
      ABSEZ_ARTICLE9_DEPARTMENTS.length,
    );

    expect(
      await prisma.institutionExternalAuthority.count({
        where: { institutionId: institution.id },
      }),
    ).toBe(ABSEZ_ADVISORY_AGENCIES.length);

    expect(
      await prisma.institutionCaseCategory.count({ where: { institutionId: institution.id } }),
    ).toBe(ABSEZ_CASE_CATEGORIES.length);

    expect(
      await prisma.institutionServiceStandard.count({ where: { institutionId: institution.id } }),
    ).toBe(ABSEZ_SERVICE_STANDARDS.length);

    expect(
      await prisma.institutionEscalationLevel.count({ where: { institutionId: institution.id } }),
    ).toBe(ABSEZ_ESCALATION_LEVELS.length);

    expect(
      await prisma.setupVocabularyEntry.count({ where: { institutionId: institution.id } }),
    ).toBeGreaterThan(0);
    expect(await prisma.retentionSchedule.count()).toBeGreaterThan(0);

    const governingSources = await prisma.governingSource.findMany({
      where: { code: { in: ABSEZ_GOVERNING_SOURCES.map((s) => s.code) } },
    });
    expect(governingSources).toHaveLength(ABSEZ_GOVERNING_SOURCES.length);
    expect(governingSources.every((s) => s.status === GoverningSourceStatus.DRAFT)).toBe(true);
    expect(governingSources.every((s) => s.authenticatedAt === null)).toBe(true);

    const delegated = await prisma.functionAuthorityRecord.findMany({
      where: { code: { in: ABSEZ_DELEGATED_FUNCTIONS.map((f) => f.code) } },
    });
    expect(delegated).toHaveLength(ABSEZ_DELEGATED_FUNCTIONS.length);
    expect(
      delegated.every((f) => f.lifecycleStatus !== FunctionAuthorityLifecycleStatus.ACTIVE),
    ).toBe(true);

    expect(await prisma.person.count()).toBe(0);
    expect(await prisma.userAccount.count()).toBe(0);
    expect(await prisma.officeholder.count()).toBe(0);
  }

  it('loads layered ABSEZ configuration on a clean database', async () => {
    await bootstrap.bootstrapAbsezConfiguration();
    await assertAbsezInstallationCounts();
  });

  it('is idempotent on second bootstrap run', async () => {
    await bootstrap.bootstrapAbsezConfiguration();
    await bootstrap.bootstrapAbsezConfiguration();
    await assertAbsezInstallationCounts();
  });
});
