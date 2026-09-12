import { type PrismaService } from '../../src/database/prisma.service';

export async function resetApplicationsData(prisma: PrismaService): Promise<void> {
  await prisma.applicantInformationRequest.deleteMany();
  await prisma.deficiencyNotice.deleteMany();
  await prisma.completenessReview.deleteMany();
  await prisma.caseWorkflowStepInstance.deleteMany();
  await prisma.caseWorkflowInstance.deleteMany();
  await prisma.caseStatusHistory.deleteMany();
  await prisma.applicationSubmission.deleteMany();
  await prisma.case.deleteMany();
  await prisma.application.deleteMany();
  await prisma.workflowTransitionDefinition.deleteMany();
  await prisma.workflowStepDefinition.deleteMany();
  await prisma.workflowStageDefinition.deleteMany();
  await prisma.workflowVersion.deleteMany();
  await prisma.workflowDefinition.deleteMany();
}
