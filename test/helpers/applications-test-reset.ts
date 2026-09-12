import { type PrismaService } from '../../src/database/prisma.service';

export async function resetApplicationsData(prisma: PrismaService): Promise<void> {
  await prisma.applicationCaseNotificationOutbox.deleteMany();
  await prisma.applicantInformationRequest.deleteMany();
  await prisma.deficiencyNoticeItem.deleteMany();
  await prisma.deficiencyNotice.deleteMany();
  await prisma.completenessReviewItem.deleteMany();
  await prisma.completenessReview.deleteMany();
  await prisma.caseWorkflowTransition.deleteMany();
  await prisma.applicationSubmission.deleteMany();
  await prisma.applicationCase.deleteMany();
  await prisma.caseWorkflowTransitionEvent.deleteMany();
  await prisma.caseWorkflowStepInstance.deleteMany();
  await prisma.caseWorkflowInstance.deleteMany();
  await prisma.workflowTransition.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.workflowVersion.deleteMany();
  await prisma.workflowDefinition.deleteMany();
  await prisma.caseRecord.deleteMany();
}
