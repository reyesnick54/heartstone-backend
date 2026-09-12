import { type PrismaService } from '../../src/database/prisma.service';

export async function resetWorkflowData(prisma: PrismaService): Promise<void> {
  await prisma.runtimeCaseWorkflowTransitionEvent.deleteMany();
  await prisma.runtimeCaseWorkflowStepInstance.deleteMany();
  await prisma.runtimeCaseWorkflowInstance.deleteMany();
  await prisma.runtimeWorkflowTransition.deleteMany();
  await prisma.runtimeWorkflowStep.deleteMany();
  await prisma.runtimeWorkflowVersion.deleteMany();
  await prisma.runtimeWorkflowDefinition.deleteMany();
  await prisma.caseRecord.deleteMany();
}
