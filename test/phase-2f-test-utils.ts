import { InstitutionType, JurisdictionType } from '@prisma/client';

import { type PrismaService } from '../src/database/prisma.service';

export interface ExternalAuthorityResponseBody {
  id: string;
  code: string;
  status: string;
}

export interface InstitutionExternalAuthorityResponseBody {
  id: string;
  status: string;
}

export async function resetPhase2FData(prisma: PrismaService): Promise<void> {
  await prisma.institutionExternalAuthority.deleteMany();
  await prisma.externalAuthority.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.jurisdiction.deleteMany();
}

export async function seedInstitution(
  prisma: PrismaService,
  overrides: Partial<{ jurisdictionCode: string; code: string; name: string }> = {},
) {
  const suffix = String(Date.now());

  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: overrides.jurisdictionCode ?? `JUR-${suffix}`,
      name: 'Test Jurisdiction',
      type: JurisdictionType.NATIONAL,
    },
  });

  return prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: overrides.code ?? 'GOV-MIN-FIN',
      name: overrides.name ?? 'Ministry of Finance',
      type: InstitutionType.MINISTRY,
    },
  });
}

export async function seedExternalAuthority(
  prisma: PrismaService,
  overrides: Partial<{
    code: string;
    name: string;
    type: 'REGULATOR' | 'GOVERNMENT_AUTHORITY';
  }> = {},
) {
  return prisma.externalAuthority.create({
    data: {
      code: overrides.code ?? 'REG-CENTRAL-BANK',
      name: overrides.name ?? 'Central Bank',
      type: overrides.type ?? 'REGULATOR',
    },
  });
}
