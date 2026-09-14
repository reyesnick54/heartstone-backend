import { type PrismaService } from '../../src/database/prisma.service';

/**
 * Deletes all Phase 10 redress tables in FK-safe order (children before parents).
 * Must run before resetGovernmentData because redress matters reference cases and decisions.
 */
export async function resetRedressData(prisma: PrismaService): Promise<void> {
  await prisma.redressImplementationVerification.deleteMany();
  await prisma.redressImplementationAction.deleteMany();
  await prisma.redressFinding.deleteMany();
  await prisma.redressReason.deleteMany();
  await prisma.redressRemedy.deleteMany();
  await prisma.redressImplementationPlan.deleteMany();
  await prisma.reviewStayRecord.deleteMany();
  await prisma.interimReliefRequest.deleteMany();
  await prisma.redressDecision.deleteMany();
  await prisma.complaintFinding.deleteMany();
  await prisma.complaintResponse.deleteMany();
  await prisma.complaintCorrectiveAction.deleteMany();
  await prisma.complaintClosure.deleteMany();
  await prisma.complaintInvestigation.deleteMany();
  await prisma.complaintClassification.deleteMany();
  await prisma.clarificationResponse.deleteMany();
  await prisma.clarificationRequest.deleteMany();
  await prisma.automationExplanationRecord.deleteMany();
  await prisma.automationChallengeDisposition.deleteMany();
  await prisma.automationChallenge.deleteMany();
  await prisma.reviewerIndependenceAssessment.deleteMany();
  await prisma.reviewAuthorityAssessment.deleteMany();
  await prisma.reviewAssignment.deleteMany();
  await prisma.reviewIssue.deleteMany();
  await prisma.reviewSubmission.deleteMany();
  await prisma.reviewRecordSnapshot.deleteMany();
  await prisma.reconsiderationProceeding.deleteMany();
  await prisma.internalAdministrativeReview.deleteMany();
  await prisma.externalReviewPackage.deleteMany();
  await prisma.externalReviewDetermination.deleteMany();
  await prisma.externalReviewReferral.deleteMany();
  await prisma.administrativeCorrectionMatter.deleteMany();
  await prisma.redressStandingAssessment.deleteMany();
  await prisma.redressTimelinessAssessment.deleteMany();
  await prisma.deadlineExtensionRequest.deleteMany();
  await prisma.redressAcknowledgment.deleteMany();
  await prisma.redressNotice.deleteMany();
  await prisma.redressFilingVersion.deleteMany();
  await prisma.redressFiling.deleteMany();
  await prisma.redressMatter.deleteMany();
  await prisma.redressRouteEligibleMatter.deleteMany();
  await prisma.redressRouteGround.deleteMany();
  await prisma.redressRouteRemedyDefinition.deleteMany();
  await prisma.redressRouteVersion.deleteMany();
  await prisma.redressRouteDefinition.deleteMany();
}
