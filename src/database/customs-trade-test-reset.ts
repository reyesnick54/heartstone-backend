import { type PrismaService } from './prisma.service';

export async function resetCustomsTradeData(prisma: PrismaService): Promise<void> {
  await prisma.customsStatusHistory.deleteMany();
  await prisma.customsExternalDependency.deleteMany();
  await prisma.customsRefundClaim.deleteMany();
  await prisma.customsAdjustment.deleteMany();

  await prisma.shipmentReference.updateMany({ data: { currentReleaseRecordId: null } });
  await prisma.customsReleaseRecord.deleteMany();
  await prisma.customsReleaseDecisionReference.deleteMany();
  await prisma.customsInspection.deleteMany();
  await prisma.customsHold.deleteMany();
  await prisma.customsAssessmentLine.deleteMany();
  await prisma.customsAssessment.deleteMany();
  await prisma.restrictedGoodsRequirement.deleteMany();
  await prisma.tradePermitReference.deleteMany();
  await prisma.customsValuationRecord.deleteMany();
  await prisma.originDeclaration.deleteMany();
  await prisma.commodityClassificationReference.deleteMany();
  await prisma.customsDeclarationItem.deleteMany();

  await prisma.customsDeclaration.updateMany({ data: { currentVersionId: null } });
  await prisma.customsDeclarationVersion.deleteMany();
  await prisma.customsDeclaration.deleteMany();

  await prisma.borderEntryReference.deleteMany();
  await prisma.cargoManifestReference.deleteMany();
  await prisma.shipmentReference.deleteMany();

  await prisma.customsBrokerAuthorization.deleteMany();
  await prisma.importerRegistration.deleteMany();
  await prisma.exporterRegistration.deleteMany();
  await prisma.traderAccount.deleteMany();
}
