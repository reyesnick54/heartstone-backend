import { type PrismaService } from '../../src/database/prisma.service';

export async function resetCasesData(prisma: PrismaService): Promise<void> {
  await prisma.caseRelationship.deleteMany();
  await prisma.caseStatusHistory.deleteMany();
  await prisma.case.deleteMany();
}
