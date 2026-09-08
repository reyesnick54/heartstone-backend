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
