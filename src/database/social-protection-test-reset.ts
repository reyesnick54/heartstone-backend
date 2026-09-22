import { type PrismaService } from './prisma.service';

export async function resetSocialProtectionData(prisma: PrismaService): Promise<void> {
  await prisma.socialProtectionAppealReference.deleteMany();
  await prisma.benefitTermination.deleteMany();
  await prisma.benefitSuspension.deleteMany();
  await prisma.benefitStatusHistory.deleteMany();
  await prisma.benefitRenewal.deleteMany();
  await prisma.benefitReview.deleteMany();
  await prisma.benefitDisbursementReference.deleteMany();
  await prisma.benefitPaymentScheduleReference.deleteMany();
  await prisma.benefitEntitlementPeriod.deleteMany();
  await prisma.benefitAwardVersion.deleteMany();
  await prisma.benefitAward.updateMany({ data: { currentBenefitAwardVersionId: null } });
  await prisma.benefitAward.deleteMany();
  await prisma.externalEligibilityDeterminationReference.deleteMany();
  await prisma.eligibilityEvidenceReference.deleteMany();
  await prisma.eligibilityFactorReference.deleteMany();
  await prisma.benefitEligibilityAssessment.deleteMany();
  await prisma.socialSupportCaseReference.deleteMany();
  await prisma.benefitApplicationProfile.deleteMany();
  await prisma.householdAssetDeclaration.deleteMany();
  await prisma.householdIncomeDeclaration.deleteMany();
  await prisma.householdRelationship.deleteMany();
  await prisma.householdMember.deleteMany();
  await prisma.householdRecord.deleteMany();
  await prisma.benefitProgramVersion.deleteMany();
  await prisma.benefitProgram.deleteMany();
  await prisma.benefitCategory.deleteMany();
  await prisma.benefitApplicantProfile.deleteMany();
}
