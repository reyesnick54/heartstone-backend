import { type PrismaService } from './prisma.service';

export async function resetApplicationProcessingData(prisma: PrismaService): Promise<void> {
  await prisma.masterAdministrativeFileSection.deleteMany();
  await prisma.masterAdministrativeFile.deleteMany();
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
