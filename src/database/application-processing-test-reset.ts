import { type PrismaService } from './prisma.service';

export async function resetApplicationProcessingData(prisma: PrismaService): Promise<void> {
  await prisma.caseCommunicationOutbox.deleteMany();
  await prisma.casePublicStatusProjection.deleteMany();
  await prisma.caseMilestone.deleteMany();
  await prisma.caseCommunication.deleteMany();
  await prisma.caseEvent.deleteMany();
  await prisma.caseIssue.deleteMany();
  await prisma.caseEscalation.deleteMany();
  await prisma.caseSlaClock.deleteMany();
  await prisma.caseReferralResponse.deleteMany();
  await prisma.caseReferral.deleteMany();
  await prisma.caseAssignment.deleteMany();
  await prisma.applicantInformationRequest.deleteMany();
  await prisma.deficiencyNotice.deleteMany();
  await prisma.completenessReview.deleteMany();
  await prisma.caseWorkflowStepInstance.deleteMany();
  await prisma.caseWorkflowInstance.deleteMany();
  await prisma.caseStatusHistory.deleteMany();
  await prisma.case.deleteMany();
  await prisma.applicationSubmission.deleteMany();
  await prisma.application.deleteMany();
  await prisma.workflowTransitionDefinition.deleteMany();
  await prisma.workflowStepDefinition.deleteMany();
  await prisma.workflowStageDefinition.deleteMany();
  await prisma.workflowVersion.deleteMany();
  await prisma.workflowDefinition.deleteMany();
}
