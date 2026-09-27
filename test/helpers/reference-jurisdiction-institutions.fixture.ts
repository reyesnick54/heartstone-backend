import { type PrismaService } from '../../src/database/prisma.service';

/** Reference ABSEZ deployment configuration (not a core platform default). */
export async function seedReferenceAbsezInstitution(prisma: PrismaService): Promise<{
  jurisdictionId: string;
  institutionId: string;
}> {
  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: 'AG',
      name: 'Antigua and Barbuda',
      type: 'NATIONAL',
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: 'ABSEZ',
      name: 'Antigua Barbuda Special Economic Zone Authority',
      type: 'SPECIAL_ECONOMIC_ZONE_AUTHORITY',
    },
  });

  return { jurisdictionId: jurisdiction.id, institutionId: institution.id };
}

/** Second institution to prove core isolation from ABSEZ reference configuration. */
export async function seedSecondaryReferenceInstitution(
  prisma: PrismaService,
  jurisdictionId: string,
): Promise<{ institutionId: string }> {
  const institution = await prisma.institution.create({
    data: {
      jurisdictionId,
      code: 'OTHER-GOV-AUTH',
      name: 'Other Government Authority',
      type: 'AGENCY',
    },
  });

  return { institutionId: institution.id };
}
