import { type PrismaService } from '../../src/database/prisma.service';

export async function resetCorporateRegistryData(prisma: PrismaService): Promise<void> {
  await prisma.corporateRegistryStatusHistory.deleteMany();
  await prisma.corporateRegistryOfficialDecision.deleteMany();
  await prisma.corporateRegistryPaymentEvent.deleteMany();
  await prisma.corporateRegistryAction.deleteMany();
  await prisma.corporateCertificate.deleteMany();
  await prisma.corporateBeneficialOwnershipDeclaration.deleteMany();
  await prisma.corporateFiling.deleteMany();
  await prisma.corporateOfficerDisclosure.deleteMany();
  await prisma.corporateRegisteredOffice.deleteMany();
  await prisma.corporateRegistryProfile.deleteMany();
  await prisma.corporateRegistryConfiguration.deleteMany();
}
