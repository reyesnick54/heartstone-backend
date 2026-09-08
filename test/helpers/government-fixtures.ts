import { InstitutionType, JurisdictionType, StructuralLifecycleStatus } from '@prisma/client';

import { type PrismaService } from '../../src/database/prisma.service';

export interface TestDepartment {
  id: string;
  institutionId: string;
  code: string;
  name: string;
}

export async function createTestDepartment(
  prisma: PrismaService,
  options: { code?: string; name?: string } = {},
): Promise<TestDepartment> {
  const suffix = Date.now().toString(36);

  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `JUR-${suffix}`,
      name: 'Test Jurisdiction',
      type: JurisdictionType.NATIONAL,
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `INST-${suffix}`,
      name: 'Test Institution',
      type: InstitutionType.AGENCY,
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: options.code ?? `DEPT-${suffix}`,
      name: options.name ?? 'Test Department',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  return {
    id: department.id,
    institutionId: institution.id,
    code: department.code,
    name: department.name,
  };
}
