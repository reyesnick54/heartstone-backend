import { type PrismaService } from '../../src/database/prisma.service';

export async function resetApplicationsData(prisma: PrismaService): Promise<void> {
  await prisma.caseWorkflowTransitionEvent.deleteMany();
  await prisma.caseWorkflowStepInstance.deleteMany();
  await prisma.caseWorkflowInstance.deleteMany();
  await prisma.workflowTransition.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.workflowVersion.deleteMany();
  await prisma.workflowDefinition.deleteMany();
  await prisma.caseRecord.deleteMany();
}
