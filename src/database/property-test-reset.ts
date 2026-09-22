import { type PrismaService } from './prisma.service';

export async function resetPropertyRegistryData(prisma: PrismaService): Promise<void> {
  await prisma.propertyRegistryAuditEvent.deleteMany();
  await prisma.propertyTransferEvidenceLink.deleteMany();
  await prisma.propertyTransactionHistory.deleteMany();
  await prisma.propertyRegistryCorrection.deleteMany();
  await prisma.propertyRegistryVerification.deleteMany();
  await prisma.propertyRegistryRestriction.deleteMany();
  await prisma.mortgageReference.deleteMany();
  await prisma.lienReference.deleteMany();
  await prisma.easementReference.deleteMany();
  await prisma.restrictionReference.deleteMany();
  await prisma.cadastrePropertyEncumbrance.deleteMany();
  await prisma.cadastrePropertyInterestHistory.deleteMany();
  await prisma.cadastrePropertyInterestHolder.deleteMany();
  await prisma.cadastrePropertyInterest.deleteMany();
  await prisma.propertyRegistryEntry.deleteMany();
  await prisma.titleInstrumentReference.deleteMany();
  await prisma.titleVersion.deleteMany();
  await prisma.transferParty.deleteMany();
  await prisma.propertyTransfer.deleteMany();
  await prisma.propertyValuationRecord.deleteMany();
  await prisma.propertyTaxReference.deleteMany();
  await prisma.surveyPlanReference.deleteMany();
  await prisma.surveyorCertificationReference.deleteMany();
  await prisma.surveyRecord.deleteMany();
  await prisma.titleRecord.deleteMany();
  await prisma.propertyRecord.deleteMany();
  await prisma.parcelIdentifier.deleteMany();
  await prisma.parcelGeometryReference.deleteMany();
  await prisma.parcelAddress.deleteMany();
  await prisma.landParcel.deleteMany();

  await prisma.propertyAccessAudit.deleteMany();
  await prisma.propertyInterestEntitlement.deleteMany();
  await prisma.propertyRegistryCertificate.deleteMany();
  await prisma.propertySurveySubmission.deleteMany();
  await prisma.propertyEncumbranceHistory.deleteMany();
  await prisma.propertyEncumbrance.deleteMany();
  await prisma.propertyOwnershipHistory.deleteMany();
  await prisma.propertyTransferDecision.deleteMany();
  await prisma.propertyRegistryApplication.deleteMany();
  await prisma.propertyInterest.deleteMany();
  await prisma.propertyParcel.deleteMany();
  await prisma.propertyRegistryConfiguration.deleteMany();
}
