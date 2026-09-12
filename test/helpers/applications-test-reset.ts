import { type PrismaService } from '../../src/database/prisma.service';

export async function resetApplicationsData(prisma: PrismaService): Promise<void> {
  await prisma.applicationCaseNotificationOutbox.deleteMany();
  await prisma.applicationCaseInformationRequest.deleteMany();
  await prisma.applicationCaseDeficiencyNoticeItem.deleteMany();
  await prisma.applicationCaseDeficiencyNotice.deleteMany();
  await prisma.applicationCaseCompletenessReviewItem.deleteMany();
  await prisma.applicationCaseCompletenessReview.deleteMany();
  await prisma.applicationCaseWorkflowTransition.deleteMany();
  await prisma.applicationCaseSubmission.deleteMany();
  await prisma.applicationCase.deleteMany();
  await prisma.runtimeCaseWorkflowTransitionEvent.deleteMany();
  await prisma.runtimeCaseWorkflowStepInstance.deleteMany();
  await prisma.runtimeCaseWorkflowInstance.deleteMany();
  await prisma.runtimeWorkflowTransition.deleteMany();
  await prisma.runtimeWorkflowStep.deleteMany();
  await prisma.runtimeWorkflowVersion.deleteMany();
  await prisma.runtimeWorkflowDefinition.deleteMany();
  await prisma.caseRecord.deleteMany();
}

export async function resetEvidenceData(prisma: PrismaService): Promise<void> {
  await prisma.evidenceQualityAssessment.deleteMany();
  await prisma.evidencePurposeAcceptance.deleteMany();
  await prisma.evidenceRequirementLink.deleteMany();
  await prisma.evidenceVerification.deleteMany();
  await prisma.evidenceRecord.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.masterAdministrativeFile.deleteMany();
}
