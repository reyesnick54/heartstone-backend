import { type PrismaService } from '../../src/database/prisma.service';

export async function resetWorkflowData(prisma: PrismaService): Promise<void> {
  await prisma.workflowTransitionDefinition.deleteMany();
  await prisma.workflowStepDefinition.deleteMany();
  await prisma.workflowStageDefinition.deleteMany();
  await prisma.workflowVersion.deleteMany();
  await prisma.workflowDefinition.deleteMany();
}
