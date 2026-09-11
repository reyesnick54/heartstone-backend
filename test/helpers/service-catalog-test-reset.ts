import { type PrismaService } from '../../src/database/prisma.service';

export async function resetServiceCatalogData(prisma: PrismaService): Promise<void> {
  await prisma.formFieldConditionalRule.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.formSection.deleteMany();
  await prisma.formVersion.deleteMany();
  await prisma.formDefinition.deleteMany();
  await prisma.governmentServiceVersion.deleteMany();
  await prisma.governmentService.deleteMany();
}
