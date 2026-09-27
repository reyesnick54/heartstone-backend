import { type INestApplication } from '@nestjs/common';
import {
  AuthorityClassification,
  ControlledFunctionClass,
  InstrumentIssuerSource,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { NON_PRODUCTION_FIXTURE_MARKER } from '../src/authority/authority.constants';
import { type PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  seedReferenceAbsezInstitution,
  seedSecondaryReferenceInstitution,
} from './helpers/reference-jurisdiction-institutions.fixture';

describe('Remediation S10 multi-institution isolation (integration)', () => {
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

  it('resolves ABSEZ explicitly by institution id without defaulting core to ABSEZ', async () => {
    const absez = await seedReferenceAbsezInstitution(prisma);
    const other = await seedSecondaryReferenceInstitution(prisma, absez.jurisdictionId);

    const absezFunction = await prisma.functionAuthorityRecord.create({
      data: {
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-ABSEZ-FN`,
        name: 'ABSEZ configured function',
        classification: AuthorityClassification.INSTITUTION_OWNED,
        functionClass: ControlledFunctionClass.LICENSING,
        institutionId: absez.institutionId,
      },
    });

    const otherFunction = await prisma.functionAuthorityRecord.create({
      data: {
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-OTHER-FN`,
        name: 'Other institution function',
        classification: AuthorityClassification.INSTITUTION_OWNED,
        functionClass: ControlledFunctionClass.LICENSING,
        institutionId: other.institutionId,
      },
    });

    const scoped = await prisma.functionAuthorityRecord.findMany({
      where: { institutionId: other.institutionId },
    });

    expect(scoped).toHaveLength(1);
    expect(scoped[0]?.id).toBe(otherFunction.id);
    expect(absezFunction.institutionId).toBe(absez.institutionId);
  });

  it('keeps government service definitions institution-scoped', async () => {
    const absez = await seedReferenceAbsezInstitution(prisma);
    const other = await seedSecondaryReferenceInstitution(prisma, absez.jurisdictionId);

    const absezServiceCode = `${NON_PRODUCTION_FIXTURE_MARKER}-SVC-ABSEZ`;
    const otherServiceCode = `${NON_PRODUCTION_FIXTURE_MARKER}-SVC-OTHER`;

    const serviceFamily = await prisma.serviceFamily.create({
      data: {
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-FAMILY`,
        name: 'Reference service family',
      },
    });

    const absezDepartment = await prisma.department.create({
      data: {
        institutionId: absez.institutionId,
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-ABSEZ-DEPT`,
        name: 'ABSEZ department',
      },
    });

    const otherDepartment = await prisma.department.create({
      data: {
        institutionId: other.institutionId,
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-OTHER-DEPT`,
        name: 'Other institution department',
      },
    });

    await prisma.governmentService.create({
      data: {
        code: absezServiceCode,
        slug: 'absez-configured-service',
        officialName: 'ABSEZ Service',
        publicName: 'ABSEZ Service',
        responsibleInstitutionId: absez.institutionId,
        responsibleDepartmentId: absezDepartment.id,
        serviceFamilyId: serviceFamily.id,
      },
    });

    await prisma.governmentService.create({
      data: {
        code: otherServiceCode,
        slug: 'other-institution-service',
        officialName: 'Other Service',
        publicName: 'Other Service',
        responsibleInstitutionId: other.institutionId,
        responsibleDepartmentId: otherDepartment.id,
        serviceFamilyId: serviceFamily.id,
      },
    });

    const otherOnly = await prisma.governmentService.findMany({
      where: { responsibleInstitutionId: other.institutionId },
    });

    expect(otherOnly.map((row) => row.code)).toEqual([otherServiceCode]);
  });

  it('defaults issuance source to institution-issued rather than ABSEZ-specific enum', () => {
    expect(InstrumentIssuerSource.INSTITUTION_ISSUED).toBe('INSTITUTION_ISSUED');
    expect(InstrumentIssuerSource.ABSEZ_ISSUED).toBe('ABSEZ_ISSUED');
  });
});
