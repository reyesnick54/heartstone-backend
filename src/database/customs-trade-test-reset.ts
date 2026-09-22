import { type PrismaService } from './prisma.service';

export async function resetCustomsTradeData(prisma: PrismaService): Promise<void> {
  await prisma.tradeAccessAudit.deleteMany();
  await prisma.customsAiRecommendation.deleteMany();
  await prisma.customsAppeal.deleteMany();
  await prisma.customsDocumentDeficiency.deleteMany();
  await prisma.customsExternalDependency.deleteMany();
  await prisma.customsReleaseRecord.deleteMany();
  await prisma.customsReleaseReview.deleteMany();
  await prisma.customsAssessmentPayment.deleteMany();
  await prisma.customsAssessment.deleteMany();
  await prisma.cargoManifestReference.deleteMany();
  await prisma.customsInspection.deleteMany();
  await prisma.customsHold.deleteMany();
  await prisma.tradePermit.deleteMany();
  await prisma.customsDeclaration.updateMany({ data: { currentVersionId: null } });
  await prisma.customsDeclarationVersion.deleteMany();
  await prisma.customsDeclaration.deleteMany();
  await prisma.tradeShipment.deleteMany();
  await prisma.customsOfficialReleaseAuthority.deleteMany();
  await prisma.tradeOrganizationProfile.deleteMany();
}
