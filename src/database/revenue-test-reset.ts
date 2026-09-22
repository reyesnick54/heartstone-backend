import { type PrismaService } from './prisma.service';

export async function resetRevenueData(prisma: PrismaService): Promise<void> {
  await prisma.taxAccessAudit.deleteMany();
  await prisma.taxPaymentAllocation.deleteMany();
  await prisma.taxCredit.deleteMany();
  await prisma.taxRefundDecision.deleteMany();
  await prisma.taxRefundClaim.deleteMany();
  await prisma.taxClearanceCertificateRequest.deleteMany();
  await prisma.taxWithholdingRecord.deleteMany();
  await prisma.taxObjection.deleteMany();
  await prisma.taxDispute.deleteMany();
  await prisma.taxAuditMatter.deleteMany();
  await prisma.taxComplianceStatus.deleteMany();
  await prisma.taxPaymentPlan.deleteMany();
  await prisma.taxArrear.deleteMany();
  await prisma.taxAccountBalance.deleteMany();
  await prisma.taxLiability.deleteMany();
  await prisma.taxAssessmentLine.deleteMany();
  await prisma.taxCalculationRecord.deleteMany();
  await prisma.taxAssessment.deleteMany();
  await prisma.taxDeclaration.deleteMany();
  await prisma.taxReturn.updateMany({ data: { currentVersionId: null } });
  await prisma.taxReturnVersion.deleteMany();
  await prisma.taxReturn.deleteMany();
  await prisma.taxObligation.deleteMany();
  await prisma.taxpayerIdentifier.deleteMany();
  await prisma.taxpayerRegistration.deleteMany();
  await prisma.taxpayerAccount.deleteMany();
}
