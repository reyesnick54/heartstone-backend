import { type PrismaService } from '../../src/database/prisma.service';

/** Deletes service pack governance and deployment rows before institutions. */
export async function resetServicePackData(prisma: PrismaService): Promise<void> {
  await prisma.servicePackDeploymentAuditRecord.deleteMany();
  await prisma.servicePackDeploymentBinding.deleteMany();
  await prisma.servicePackDeployment.deleteMany();
  await prisma.servicePackGovernanceAuditRecord.deleteMany();
  await prisma.servicePackAcceptanceRecord.deleteMany();
  await prisma.servicePackRejectionRecord.deleteMany();
  await prisma.servicePackRevisionRequest.deleteMany();
  await prisma.servicePackReviewSignoff.deleteMany();
  await prisma.servicePackReviewEvidence.deleteMany();
  await prisma.servicePackReviewComment.deleteMany();
  await prisma.servicePackReviewFinding.deleteMany();
  await prisma.servicePackReviewAssignment.deleteMany();
  await prisma.servicePackReview.deleteMany();
  await prisma.servicePackReviewChainStep.deleteMany();
  await prisma.servicePackReviewChainPolicy.deleteMany();
  await prisma.servicePackValidationResult.deleteMany();
  await prisma.servicePackImport.deleteMany();
  await prisma.servicePackComponent.deleteMany();
  await prisma.servicePackDependency.deleteMany();
  await prisma.servicePackVersion.updateMany({
    data: {
      acceptedByIdentityId: null,
    },
  });
  await prisma.servicePackVersion.deleteMany();
  await prisma.servicePackJurisdictionBinding.deleteMany();
  await prisma.servicePack.deleteMany();
}
