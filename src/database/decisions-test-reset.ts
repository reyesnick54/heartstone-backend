import { type PrismaService } from './prisma.service';

export async function resetDecisionsData(prisma: PrismaService): Promise<void> {
  await prisma.decisionTypeLifecycleTransition.deleteMany();
  await prisma.decisionTypeRequirementElement.deleteMany();
  await prisma.decisionTypePermissibleOutcome.deleteMany();
  await prisma.decisionTypeVersion.deleteMany();
  await prisma.decisionTypeDefinition.deleteMany();
}
