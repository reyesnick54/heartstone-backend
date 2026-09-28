import { type PrismaService } from './prisma.service';

export async function resetGovernedAiData(prisma: PrismaService): Promise<void> {
  await prisma.aiCallOutputEdit.deleteMany();
  await prisma.aiCallReviewRecord.deleteMany();
  await prisma.aiCallOutputRecord.deleteMany();
  await prisma.aiCallSourceReference.deleteMany();
  await prisma.aiCallInputRecord.deleteMany();
  await prisma.aiCallRecord.deleteMany();
  await prisma.aiPolicyDecisionRecord.deleteMany();
  await prisma.aiGovernanceSuspension.deleteMany();
  await prisma.aiAgentToolAllowlist.deleteMany();
  await prisma.aiAgentDataClassAllowlist.deleteMany();
  await prisma.aiAgentDefinition.deleteMany();
  await prisma.aiAgentIdentity.deleteMany();
  await prisma.aiModelVersion.deleteMany();
  await prisma.aiModelDefinition.deleteMany();
  await prisma.aiModelProviderRegistry.deleteMany();
}
