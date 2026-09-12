import { type PrismaService } from '../../src/database/prisma.service';

export async function resetApplicationProcessingData(prisma: PrismaService): Promise<void> {
  await prisma.caseCommunicationOutbox.deleteMany();
  await prisma.casePublicStatusProjection.deleteMany();
  await prisma.caseCommunication.deleteMany();
  await prisma.caseMilestone.deleteMany();
  await prisma.caseEvent.deleteMany();
  await prisma.caseWorkflowStepInstance.deleteMany();
  await prisma.caseWorkflowInstance.deleteMany();
  await prisma.case.deleteMany();
  await prisma.application.deleteMany();
}
export { resetApplicationProcessingData } from '../../src/database/application-processing-test-reset';
