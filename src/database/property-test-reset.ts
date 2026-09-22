import { type PrismaService } from './prisma.service';

export async function resetPropertyRegistryData(prisma: PrismaService): Promise<void> {
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
