import { type PrismaService } from '../../src/database/prisma.service';

export async function resetServiceCatalogData(prisma: PrismaService): Promise<void> {
  await prisma.serviceEligibilityRuleAudit.deleteMany();
  await prisma.serviceEligibilityRule.deleteMany();
  await prisma.governmentServiceVersion.deleteMany();
  await prisma.governmentService.deleteMany();
}
