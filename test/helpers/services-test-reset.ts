import { type PrismaService } from '../../src/database/prisma.service';

export async function resetServicesData(prisma: PrismaService): Promise<void> {
  await prisma.serviceRequirement.deleteMany();
  await prisma.structuredApplicabilityRule.deleteMany();
  await prisma.declarationDefinitionVersion.deleteMany();
  await prisma.declarationDefinition.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.formVersion.deleteMany();
  await prisma.formDefinition.deleteMany();
  await prisma.governmentServiceVersion.deleteMany();
  await prisma.governmentService.deleteMany();
}
