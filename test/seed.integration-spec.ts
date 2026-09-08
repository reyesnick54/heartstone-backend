import { PrismaClient } from '@prisma/client';

import { seedAntiguaBarbudaStructural } from '../prisma/seed/antigua-barbuda.structural';
import { ANTIGUA_BARBUDA, SEED_MANIFEST_KEY } from '../prisma/seed/constants';

const prisma = new PrismaClient();

const EXPECTED_TABLE_COUNTS = {
  jurisdiction: 1,
  institution: 1,
  governmentBody: 1,
  department: 1,
  office: 1,
  officeholder: 2,
  appointment: 1,
  delegation: 1,
  externalAuthority: 1,
  institutionExternalAuthority: 1,
} as const;

async function countSeedEntities(): Promise<Record<keyof typeof EXPECTED_TABLE_COUNTS, number>> {
  const [
    jurisdiction,
    institution,
    governmentBody,
    department,
    office,
    officeholder,
    appointment,
    delegation,
    externalAuthority,
    institutionExternalAuthority,
  ] = await Promise.all([
    prisma.jurisdiction.count(),
    prisma.institution.count(),
    prisma.governmentBody.count(),
    prisma.department.count(),
    prisma.office.count(),
    prisma.officeholder.count(),
    prisma.appointment.count(),
    prisma.delegation.count(),
    prisma.externalAuthority.count(),
    prisma.institutionExternalAuthority.count(),
  ]);

  return {
    jurisdiction,
    institution,
    governmentBody,
    department,
    office,
    officeholder,
    appointment,
    delegation,
    externalAuthority,
    institutionExternalAuthority,
  };
}

async function assertNoForbiddenTables(): Promise<void> {
  const forbiddenTables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name IN ('users', 'authorities', 'secrets', 'user_accounts')
  `;

  expect(forbiddenTables).toHaveLength(0);
}

describe('Phase 2H Antigua & Barbuda structural seed (integration)', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('seeds idempotently and resolves structural relationships', async () => {
    await seedAntiguaBarbudaStructural(prisma);
    const firstRunCounts = await countSeedEntities();
    expect(firstRunCounts).toEqual(EXPECTED_TABLE_COUNTS);

    await seedAntiguaBarbudaStructural(prisma);
    const secondRunCounts = await countSeedEntities();
    expect(secondRunCounts).toEqual(EXPECTED_TABLE_COUNTS);

    const jurisdiction = await prisma.jurisdiction.findUniqueOrThrow({
      where: { code: ANTIGUA_BARBUDA.jurisdiction.code },
      include: {
        institutions: {
          include: {
            governmentBodies: true,
            departments: {
              include: {
                offices: {
                  include: {
                    appointments: {
                      include: {
                        officeholder: true,
                      },
                    },
                  },
                },
              },
            },
            sourceDelegations: {
              include: {
                delegatorOfficeholder: true,
                recipientOfficeholder: true,
              },
            },
            externalAuthorityLinks: {
              include: {
                externalAuthority: true,
              },
            },
          },
        },
      },
    });

    expect(jurisdiction.name).toContain('NON-PRODUCTION SAMPLE');
    expect(jurisdiction.institutions).toHaveLength(1);

    const institution = jurisdiction.institutions[0];
    expect(institution?.name).toContain('DEVELOPMENT');
    expect(institution?.governmentBodies).toHaveLength(1);
    expect(institution?.departments).toHaveLength(1);
    expect(institution?.sourceDelegations).toHaveLength(1);
    expect(institution?.externalAuthorityLinks).toHaveLength(1);

    const department = institution?.departments[0];
    const office = department?.offices[0];
    const appointment = office?.appointments[0];

    expect(appointment?.officeholder.displayName).toBe('Sample Officeholder 001');
    expect(institution?.sourceDelegations[0]?.delegatorOfficeholder.displayName).toBe(
      'Sample Officeholder 001',
    );
    expect(institution?.sourceDelegations[0]?.recipientOfficeholder.displayName).toBe(
      'Sample Officeholder 002',
    );
    expect(institution?.externalAuthorityLinks[0]?.externalAuthority.name).toContain(
      'NON-PRODUCTION SAMPLE',
    );

    const manifest = await prisma.systemMetadata.findUniqueOrThrow({
      where: { key: SEED_MANIFEST_KEY },
    });
    const parsedManifest = JSON.parse(manifest.value) as {
      classification: string;
      purpose: string;
      jurisdictionIsoAlpha2: string;
    };

    expect(parsedManifest.classification).toBe('NON_PRODUCTION');
    expect(parsedManifest.purpose).toBe('DEVELOPMENT');
    expect(parsedManifest.jurisdictionIsoAlpha2).toBe('AG');

    await assertNoForbiddenTables();
  });
});
